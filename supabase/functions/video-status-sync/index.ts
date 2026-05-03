// video-status-sync — manually pull status from Submagic for a queued/processing
// project. Useful when the webhook misses (failure cases especially).
//
// POST body: { artifact_id, user_id }
// Response: updated artifact + clips array

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUBMAGIC_API_KEY = Deno.env.get("SUBMAGIC_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { artifact_id, user_id } = await req.json();
    if (!artifact_id || !user_id) {
      return new Response(JSON.stringify({ error: "artifact_id and user_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!SUBMAGIC_API_KEY) {
      return new Response(JSON.stringify({ error: "SUBMAGIC_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: artifact, error: aErr } = await supabase
      .from("robot_artifacts")
      .select("*")
      .eq("id", artifact_id)
      .eq("user_id", user_id)
      .maybeSingle();
    if (aErr || !artifact) {
      return new Response(JSON.stringify({ error: "artifact not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!artifact.external_id) {
      return new Response(JSON.stringify({ error: "artifact has no external_id (not a Submagic project)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Hit Submagic for current status
    const submagicRes = await fetch(`https://api.submagic.co/v1/projects/${artifact.external_id}`, {
      headers: { "x-api-key": SUBMAGIC_API_KEY },
    });
    const sm = await submagicRes.json();
    if (!submagicRes.ok) {
      return new Response(JSON.stringify({ error: "submagic fetch failed", status: submagicRes.status, details: sm }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const status = (sm.status || "").toLowerCase();
    const updates: any = {};
    let createdClipCount = 0;

    if (status === "completed" || status === "success") {
      const clips = Array.isArray(sm.magicClips) && sm.magicClips.length > 0
        ? sm.magicClips
        : Array.isArray(sm.clips) ? sm.clips : [];
      const updatedPayload = {
        ...(artifact.payload || {}),
        completed_at: new Date().toISOString(),
        provider_response: { status: sm.status, downloadUrl: sm.downloadUrl || null },
        clips: clips.map((c: any) => ({
          id: c.id, title: c.title || c.name || null,
          downloadUrl: c.downloadUrl || c.url || null,
          duration: c.duration || null, score: c.score || null,
          startTime: c.startTime || null, endTime: c.endTime || null,
        })),
      };
      updates.status = "completed";
      updates.summary = clips.length > 0 ? `${clips.length} clip${clips.length !== 1 ? "s" : ""} ready (synced manually)` : "Render complete";
      updates.payload = updatedPayload;

      // Only create child clip artifacts if none already exist for this parent
      const { data: existingClips } = await supabase
        .from("robot_artifacts")
        .select("id")
        .eq("user_id", user_id)
        .eq("artifact_type", "video_clip")
        .filter("payload->>parent_artifact_id", "eq", artifact.id);
      if ((!existingClips || existingClips.length === 0) && clips.length > 0) {
        const childRows = clips.map((c: any, idx: number) => ({
          user_id, robot_id: artifact.robot_id,
          artifact_type: "video_clip",
          title: c.title || `Clip ${idx + 1} — ${artifact.title}`,
          summary: c.duration ? `${Math.round(c.duration)}s` : null,
          external_id: c.id || `${artifact.external_id}-${idx}`,
          external_url: c.downloadUrl || c.url || null,
          payload: {
            parent_artifact_id: artifact.id,
            clip_index: idx,
            duration: c.duration || null,
            score: c.score || null,
            startTime: c.startTime || null,
            endTime: c.endTime || null,
            downloadUrl: c.downloadUrl || c.url || null,
            provider: "submagic",
          },
          status: "completed",
        }));
        await supabase.from("robot_artifacts").insert(childRows);
        createdClipCount = clips.length;
      }
    } else if (status === "failed" || status === "error") {
      updates.status = "failed";
      const reason = sm.failureReason || sm.error || "Submagic returned failed status";
      updates.summary = `Failed: ${reason}`;
      updates.payload = { ...(artifact.payload || {}), failed_at: new Date().toISOString(), error: reason, provider_response: sm };
    } else {
      // Still processing
      return new Response(JSON.stringify({
        success: true,
        still_processing: true,
        submagic_status: sm.status,
        message: "Submagic hasn't finished yet. Try again in a few minutes.",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from("robot_artifacts").update(updates).eq("id", artifact.id);
    }

    return new Response(JSON.stringify({
      success: true,
      new_status: updates.status,
      created_clip_count: createdClipCount,
      submagic_status: sm.status,
      failure_reason: sm.failureReason || null,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error", details: String(err.message || err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
