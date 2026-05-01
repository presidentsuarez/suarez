// quo-send-draft — sends a Quo draft via OpenPhone after user approval, captures feedback if edited

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENPHONE_API_KEY = Deno.env.get("OPENPHONE_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { artifact_id, user_id, body_override } = await req.json();
    if (!artifact_id || !user_id) return new Response(JSON.stringify({ error: "artifact_id and user_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: artifact, error: artErr } = await supabase.from("robot_artifacts").select("*").eq("id", artifact_id).eq("user_id", user_id).maybeSingle();
    if (artErr || !artifact) return new Response(JSON.stringify({ error: "Draft not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (artifact.artifact_type !== "quo_text_draft") return new Response(JSON.stringify({ error: "Not a Quo text draft" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (artifact.status === "sent") return new Response(JSON.stringify({ error: "Already sent" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const payload = artifact.payload || {};
    const originalBody = payload.body;
    const finalBody = (body_override?.trim()) || originalBody;
    const wasEdited = body_override?.trim() && body_override.trim() !== originalBody;
    const fromNumber = payload.from_number;
    const toNumber = payload.to_number;
    if (!finalBody || !fromNumber || !toNumber) return new Response(JSON.stringify({ error: "Draft missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Send via OpenPhone
    const openPhoneRes = await fetch("https://api.openphone.com/v1/messages", {
      method: "POST",
      headers: { Authorization: OPENPHONE_API_KEY!, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromNumber, to: [toNumber], content: finalBody }),
    });
    const opData = await openPhoneRes.json();
    if (!openPhoneRes.ok) return new Response(JSON.stringify({ error: "OpenPhone send failed", status: openPhoneRes.status, details: opData }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Mark sent
    const updatedPayload = wasEdited ? { ...payload, body: finalBody, original_body: originalBody } : payload;
    await supabase.from("robot_artifacts").update({
      status: "sent",
      payload: { ...updatedPayload, sent_at: new Date().toISOString(), openphone_message_id: opData.data?.id || null },
    }).eq("id", artifact_id);

    // Capture feedback event
    await supabase.from("feedback_events").insert({
      user_id,
      robot_id: artifact.robot_id,
      artifact_id,
      event_type: wasEdited ? "send_with_edits" : "send_unchanged",
      verdict: wasEdited ? "edited" : "approved",
      original_content: wasEdited ? originalBody : null,
      edited_content: wasEdited ? finalBody : null,
      edit_diff_summary: wasEdited ? `${originalBody?.length || 0} → ${finalBody.length} chars` : null,
      context_tool: "draft_quo_text",
    });

    return new Response(JSON.stringify({ success: true, message: `Sent to ${toNumber} from ${payload.from_label || fromNumber}`, openphone_message_id: opData.data?.id || null, was_edited: wasEdited }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error", details: err.message || String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
