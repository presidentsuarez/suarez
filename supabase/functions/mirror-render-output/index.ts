// mirror-render-output — when a Submagic render completes, archive the file(s)
// to both Supabase Storage (videos-output) and the user's Drive Output folder
// so the user never has to download them manually and the URLs don't expire.
//
// Called from:
//   - video-webhook (on completion event)
//   - video-status-sync (when poller catches a missed webhook)
//
// POST body: { artifact_id, user_id }
// Idempotent: checks if mirror already happened (artifact.payload.mirror_status === "completed")

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STORAGE_KEY = Deno.env.get("STORAGE_SERVICE_KEY") || SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Fetch a Google Drive access token, refreshing if expired.
async function getGoogleAccessToken(supabase: any, user_id: string): Promise<string | null> {
  const { data: tokenRow } = await supabase
    .from("gmail_tokens")
    .select("access_token, refresh_token, expires_at, scopes")
    .eq("user_id", user_id)
    .maybeSingle();
  if (!tokenRow?.access_token) return null;
  if (!(tokenRow.scopes || "").includes("/auth/drive")) return null;

  if (tokenRow.expires_at && new Date(tokenRow.expires_at).getTime() - Date.now() < 60000) {
    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `client_id=${GOOGLE_CLIENT_ID}&client_secret=${GOOGLE_CLIENT_SECRET}&refresh_token=${tokenRow.refresh_token}&grant_type=refresh_token`,
    });
    const rd = await refreshRes.json();
    if (rd.access_token) {
      await supabase.from("gmail_tokens").update({
        access_token: rd.access_token,
        expires_at: new Date(Date.now() + (rd.expires_in || 3600) * 1000).toISOString(),
      }).eq("user_id", user_id);
      return rd.access_token;
    }
    return null;
  }
  return tokenRow.access_token;
}

// Find or create a Drive subfolder. Idempotent.
async function ensureDriveFolder(token: string, name: string, parentId: string | null): Promise<string | null> {
  const escapedName = name.replace(/'/g, "\\'");
  const parentClause = parentId ? `'${parentId}' in parents and ` : "";
  const q = `${parentClause}name='${escapedName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const findRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const findData = await findRes.json();
  if (findData.files && findData.files.length > 0) return findData.files[0].id;

  const createBody: any = { name, mimeType: "application/vnd.google-apps.folder" };
  if (parentId) createBody.parents = [parentId];
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(createBody),
  });
  const created = await createRes.json();
  return created.id || null;
}

// Mirror one video URL to BOTH Supabase Storage and Drive. Returns both URLs + Drive file ID.
async function mirrorOne(opts: {
  supabase: any;
  user_id: string;
  source_url: string;
  filename: string;          // friendly name like "DJI Drive Bridge v2.mp4"
  storage_path_prefix: string; // like "{user_id}/{date}/{title}"
  drive_dest_folder_id: string | null;
  drive_token: string | null;
}): Promise<{
  supabase_path: string | null;
  supabase_signed_url: string | null;
  drive_file_id: string | null;
  drive_view_url: string | null;
  size_bytes: number | null;
  errors: string[];
}> {
  const errors: string[] = [];
  let supabasePath: string | null = null;
  let supabaseSignedUrl: string | null = null;
  let driveFileId: string | null = null;
  let driveViewUrl: string | null = null;
  let sizeBytes: number | null = null;

  // 1. Fetch the source from Submagic. Submagic's Cloudflare R2 URLs serve fine to
  //    server-to-server fetch with no auth.
  const sourceRes = await fetch(opts.source_url);
  if (!sourceRes.ok) {
    errors.push(`Source fetch failed: HTTP ${sourceRes.status}`);
    return { supabase_path: null, supabase_signed_url: null, drive_file_id: null, drive_view_url: null, size_bytes: null, errors };
  }
  const contentLength = sourceRes.headers.get("content-length");
  const contentType = sourceRes.headers.get("content-type") || "video/mp4";
  if (contentLength) sizeBytes = Number(contentLength);

  // We need to consume the body twice (once for Supabase, once for Drive). Stream
  // doesn't tee well across two consecutive uploads under edge-function memory
  // limits. Instead: buffer the bytes ONCE if small, otherwise do two separate
  // source fetches. Most clips are <500MB which is below our 150MB-ish edge limit
  // so we use two separate fetches — bandwidth is cheap, memory isn't.

  // 2. Upload to Supabase first (always succeeds if storage is healthy).
  const cleanFilename = opts.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectPath = `${opts.storage_path_prefix}/${cleanFilename}`;
  const encodedPath = objectPath.split("/").map((seg) => encodeURIComponent(seg)).join("/");
  const uploadHeaders: Record<string, string> = {
    "Authorization": `Bearer ${STORAGE_KEY}`,
    "Content-Type": contentType,
    "x-upsert": "true",
  };
  if (contentLength) uploadHeaders["Content-Length"] = contentLength;

  const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/videos-output/${encodedPath}`, {
    method: "POST",
    headers: uploadHeaders,
    body: sourceRes.body,
    // @ts-ignore — Deno-specific option for streaming bodies
    duplex: "half",
  });
  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    errors.push(`Supabase upload failed: ${uploadRes.status} — ${errText.slice(0, 200)}`);
  } else {
    supabasePath = objectPath;
    // Generate long-lived signed URL (7 days) for Studio playback
    const signedRes = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/videos-output/${encodedPath}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${STORAGE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 7 * 24 * 60 * 60 }),
    });
    const signed = await signedRes.json();
    if (signed.signedURL) {
      supabaseSignedUrl = signed.signedURL.startsWith("http")
        ? signed.signedURL
        : `${SUPABASE_URL}/storage/v1${signed.signedURL.startsWith("/") ? "" : "/"}${signed.signedURL}`;
    }
  }

  // 3. Mirror to Drive. Separate fetch because the body stream was consumed above.
  if (opts.drive_token && opts.drive_dest_folder_id) {
    try {
      const sourceRes2 = await fetch(opts.source_url);
      if (sourceRes2.ok && sourceRes2.body) {
        // Use Drive's resumable upload (multipart) — for files >5MB, simple upload
        // also works, but we use the resumable session approach for any size.
        const initRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${opts.drive_token}`,
            "Content-Type": "application/json",
            "X-Upload-Content-Type": contentType,
            ...(sizeBytes ? { "X-Upload-Content-Length": String(sizeBytes) } : {}),
          },
          body: JSON.stringify({
            name: cleanFilename,
            parents: [opts.drive_dest_folder_id],
          }),
        });
        if (!initRes.ok) {
          const errText = await initRes.text();
          errors.push(`Drive init failed: ${initRes.status} — ${errText.slice(0, 200)}`);
        } else {
          const sessionUrl = initRes.headers.get("Location");
          if (!sessionUrl) {
            errors.push("Drive init returned no session URL");
          } else {
            // PUT the actual bytes to the session URL
            const putHeaders: Record<string, string> = { "Content-Type": contentType };
            if (contentLength) putHeaders["Content-Length"] = contentLength;
            const putRes = await fetch(sessionUrl, {
              method: "PUT",
              headers: putHeaders,
              body: sourceRes2.body,
              // @ts-ignore
              duplex: "half",
            });
            if (!putRes.ok) {
              const errText = await putRes.text();
              errors.push(`Drive PUT failed: ${putRes.status} — ${errText.slice(0, 200)}`);
            } else {
              const putData = await putRes.json();
              driveFileId = putData.id || null;
              driveViewUrl = putData.webViewLink || (driveFileId ? `https://drive.google.com/file/d/${driveFileId}/view` : null);
            }
          }
        }
      } else {
        errors.push("Could not re-fetch source for Drive upload");
      }
    } catch (e) {
      errors.push(`Drive mirror exception: ${String(e?.message || e)}`);
    }
  } else if (!opts.drive_token) {
    errors.push("No Drive token — Drive mirror skipped");
  } else if (!opts.drive_dest_folder_id) {
    errors.push("No Drive output folder — Drive mirror skipped");
  }

  return {
    supabase_path: supabasePath,
    supabase_signed_url: supabaseSignedUrl,
    drive_file_id: driveFileId,
    drive_view_url: driveViewUrl,
    size_bytes: sizeBytes,
    errors,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { artifact_id, user_id } = await req.json();
    if (!artifact_id || !user_id) {
      return new Response(JSON.stringify({ error: "artifact_id and user_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: artifact } = await supabase
      .from("robot_artifacts")
      .select("*")
      .eq("id", artifact_id)
      .eq("user_id", user_id)
      .maybeSingle();
    if (!artifact) {
      return new Response(JSON.stringify({ error: "artifact not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (artifact.status !== "completed") {
      return new Response(JSON.stringify({ error: "artifact not completed", status: artifact.status }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const payload = artifact.payload || {};
    if (payload.mirror_status === "completed") {
      return new Response(JSON.stringify({ success: true, already_mirrored: true, mirror: payload.mirror }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Resolve Drive output folder
    const { data: settings } = await supabase
      .from("studio_settings")
      .select("drive_output_folder_id")
      .eq("user_id", user_id)
      .maybeSingle();
    const driveOutputFolderId = settings?.drive_output_folder_id || null;
    const driveToken = await getGoogleAccessToken(supabase, user_id);

    // Per-project Drive subfolder for organization
    let projectDriveFolder = driveOutputFolderId;
    if (driveToken && driveOutputFolderId) {
      const safeName = (artifact.title || "Untitled").slice(0, 100);
      projectDriveFolder = await ensureDriveFolder(driveToken, safeName, driveOutputFolderId);
    }

    const today = new Date().toISOString().slice(0, 10);
    const storagePathPrefix = `${user_id}/${today}/${(artifact.title || "untitled").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80)}`;
    const safeTitle = (artifact.title || "video").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);

    const mirrorResults: any[] = [];
    let anyOk = false;

    // Single-video case (most common — /v1/projects)
    const singleUrl = payload.single_video_url;
    if (singleUrl) {
      const result = await mirrorOne({
        supabase, user_id,
        source_url: singleUrl,
        filename: `${safeTitle}.mp4`,
        storage_path_prefix: storagePathPrefix,
        drive_dest_folder_id: projectDriveFolder,
        drive_token: driveToken,
      });
      mirrorResults.push({ kind: "single", ...result });
      if (result.supabase_path || result.drive_file_id) anyOk = true;
    }

    // Multi-clip case (Magic Clips from YouTube)
    const clips = Array.isArray(payload.clips) ? payload.clips : [];
    for (let i = 0; i < clips.length; i++) {
      const clip = clips[i];
      const url = clip.downloadUrl || clip.url;
      if (!url) continue;
      const safeClipTitle = (clip.title || `clip-${i + 1}`).replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
      const result = await mirrorOne({
        supabase, user_id,
        source_url: url,
        filename: `${String(i + 1).padStart(2, "0")}-${safeClipTitle}.mp4`,
        storage_path_prefix: storagePathPrefix,
        drive_dest_folder_id: projectDriveFolder,
        drive_token: driveToken,
      });
      mirrorResults.push({ kind: "clip", clip_index: i, clip_title: clip.title, ...result });
      if (result.supabase_path || result.drive_file_id) anyOk = true;
    }

    if (mirrorResults.length === 0) {
      return new Response(JSON.stringify({ error: "no source URLs to mirror" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Save mirror state back into artifact payload
    const mirrorSummary = {
      mirrored_at: new Date().toISOString(),
      drive_folder_id: projectDriveFolder,
      drive_folder_url: projectDriveFolder ? `https://drive.google.com/drive/folders/${projectDriveFolder}` : null,
      results: mirrorResults,
    };

    await supabase.from("robot_artifacts").update({
      payload: {
        ...payload,
        mirror: mirrorSummary,
        mirror_status: anyOk ? "completed" : "failed",
        // Convenience: a single permanent URL we can use in the UI for playback
        durable_video_url: mirrorResults[0]?.supabase_signed_url || null,
        drive_view_url: mirrorResults[0]?.drive_view_url || null,
      },
    }).eq("id", artifact.id);

    // Also update child clip artifacts if any
    for (const result of mirrorResults) {
      if (result.kind !== "clip") continue;
      const { data: clipChild } = await supabase
        .from("robot_artifacts")
        .select("id, payload")
        .eq("user_id", user_id)
        .eq("artifact_type", "video_clip")
        .filter("payload->>parent_artifact_id", "eq", artifact.id)
        .filter("payload->>clip_index", "eq", String(result.clip_index))
        .maybeSingle();
      if (clipChild) {
        await supabase.from("robot_artifacts").update({
          payload: {
            ...(clipChild.payload || {}),
            durable_video_url: result.supabase_signed_url,
            drive_view_url: result.drive_view_url,
            drive_file_id: result.drive_file_id,
            supabase_path: result.supabase_path,
          },
        }).eq("id", clipChild.id);
      }
    }

    // Log a usage event
    await supabase.from("api_usage_log").insert({
      user_id,
      service: "studio_mirror",
      action: "mirror_render_output",
      tokens_in: 0, tokens_out: 0, cost_estimate: 0,
      metadata: {
        artifact_id: artifact.id,
        success: anyOk,
        items_mirrored: mirrorResults.length,
        drive_ok: mirrorResults.some((r) => r.drive_file_id),
        supabase_ok: mirrorResults.some((r) => r.supabase_path),
        total_errors: mirrorResults.reduce((s, r) => s + (r.errors?.length || 0), 0),
      },
    });

    return new Response(JSON.stringify({
      success: anyOk,
      items_mirrored: mirrorResults.length,
      mirror: mirrorSummary,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("mirror-render-output error:", err);
    return new Response(JSON.stringify({ error: "Server error", details: String(err?.message || err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
