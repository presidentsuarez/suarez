// video-webhook — receives Submagic (and future provider) callbacks
// when video processing completes, updates the matching robot_artifacts row.
//
// Submagic POST format on completion (per docs):
//   { id, title, status: "completed"|"failed", clips: [{ id, downloadUrl, ... }], ... }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  try {
    const body = await req.json();
    console.log("video-webhook received:", JSON.stringify(body).slice(0, 500));

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Submagic webhook contract (verified against docs.submagic.co):
    // { id, title, status, clips?, downloadUrl?, ... }
    const externalId = body.id;
    const status = (body.status || "").toLowerCase();
    if (!externalId) {
      return new Response(JSON.stringify({ error: "missing id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Find the matching parent project artifact by external_id
    const { data: parent, error: findErr } = await supabase
      .from("robot_artifacts")
      .select("id, user_id, robot_id, payload, title")
      .eq("external_id", externalId)
      .in("artifact_type", ["video_render", "video_clips_project"])
      .maybeSingle();

    if (findErr || !parent) {
      console.warn("No matching artifact for", externalId);
      return new Response(JSON.stringify({ ok: true, note: "no match" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (status === "completed" || status === "success") {
      // Mark parent complete + capture all clip URLs in payload
      const clips = Array.isArray(body.clips) ? body.clips : [];
      const updatedPayload = {
        ...(parent.payload || {}),
        completed_at: new Date().toISOString(),
        provider_response: { status: body.status, downloadUrl: body.downloadUrl || null },
        clips: clips.map((c: any) => ({
          id: c.id,
          title: c.title || c.name || null,
          downloadUrl: c.downloadUrl || c.url || null,
          duration: c.duration || null,
          score: c.score || null,
          startTime: c.startTime || null,
          endTime: c.endTime || null,
        })),
      };

      await supabase.from("robot_artifacts").update({
        status: "completed",
        summary: clips.length > 0 ? `${clips.length} clip${clips.length !== 1 ? "s" : ""} ready for review` : "Render complete",
        payload: updatedPayload,
      }).eq("id", parent.id);

      // Also create one child artifact per clip so each shows up individually in Studio
      if (clips.length > 0) {
        const childRows = clips.map((c: any, idx: number) => ({
          user_id: parent.user_id,
          robot_id: parent.robot_id,
          artifact_type: "video_clip",
          title: c.title || `Clip ${idx + 1} — ${parent.title}`,
          summary: c.duration ? `${Math.round(c.duration)}s` : null,
          external_id: c.id || `${externalId}-${idx}`,
          external_url: c.downloadUrl || c.url || null,
          payload: {
            parent_artifact_id: parent.id,
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
      }

      // Log a usage event so we can see Studio activity in api_usage_log
      await supabase.from("api_usage_log").insert({
        user_id: parent.user_id,
        service: "submagic",
        action: "magic_clips_completed",
        tokens_in: 0, tokens_out: 0, cost_estimate: 0,
        metadata: {
          robot_id: parent.robot_id || null,
          success: true,
          submagic_project_id: externalId,
          clip_count: clips.length,
        },
      });

      return new Response(JSON.stringify({ ok: true, processed: clips.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (status === "failed" || status === "error") {
      await supabase.from("robot_artifacts").update({
        status: "failed",
        summary: `Render failed${body.error ? ": " + (typeof body.error === "string" ? body.error : JSON.stringify(body.error).slice(0, 200)) : ""}`,
        payload: { ...(parent.payload || {}), failed_at: new Date().toISOString(), error: body.error || null, provider_response: body },
      }).eq("id", parent.id);

      await supabase.from("api_usage_log").insert({
        user_id: parent.user_id,
        service: "submagic",
        action: "magic_clips_failed",
        tokens_in: 0, tokens_out: 0, cost_estimate: 0,
        metadata: { robot_id: parent.robot_id || null, success: false, submagic_project_id: externalId, error: body.error || null },
      });

      return new Response(JSON.stringify({ ok: true, marked: "failed" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Status update we don't recognize — store it but don't change artifact state
    console.log("Unrecognized status:", status);
    return new Response(JSON.stringify({ ok: true, ignored: true, status }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("video-webhook error:", err);
    return new Response(JSON.stringify({ error: "Server error", details: String(err.message || err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
