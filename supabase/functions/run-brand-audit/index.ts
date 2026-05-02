// run-brand-audit edge function
// Called by pg_cron every Saturday 9 AM UTC (5 AM ET).
// Wraps a call to robot-chat with Atlas and the brand audit prompt.
// Logs success or failure as a brand_audit_report or brand_audit_failure artifact.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Default user — Javier (only owner with brand audit configured currently)
const DEFAULT_USER_ID = "bf4a59c7-9929-4c35-b972-9e4dae31c1ba";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const user_id = body.user_id || DEFAULT_USER_ID;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find Atlas — fall back to any active robot if not present
    let { data: robot } = await supabase
      .from("robots")
      .select("id, name, model")
      .eq("user_id", user_id)
      .ilike("name", "atlas")
      .eq("status", "active")
      .maybeSingle();

    if (!robot) {
      const { data: any } = await supabase
        .from("robots")
        .select("id, name, model")
        .eq("user_id", user_id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      robot = any;
    }

    if (!robot) {
      return new Response(JSON.stringify({ error: "No active robot found for user" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Invoke robot-chat with retries for rate-limit errors.
    // On tier-1 Anthropic, the audit's 6 web searches + synthesis can spike past
    // 10K input tokens/min. Retrying with a wait usually clears the sliding window.
    const RETRY_DELAYS_MS = [0, 65000, 130000]; // immediate, ~65s, ~130s
    let robotChatRes: Response | null = null;
    let result: any = null;
    let lastErrSummary = "";

    for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
      if (RETRY_DELAYS_MS[attempt] > 0) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt]));
      }
      robotChatRes = await fetch(`${SUPABASE_URL}/functions/v1/robot-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": SUPABASE_SERVICE_ROLE_KEY, "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
        body: JSON.stringify({
          robot_id: robot.id,
          user_id: user_id,
          message: "Run the weekly brand audit now.",
          history: [],
        }),
      });
      result = await robotChatRes.json();
      const errBlob = JSON.stringify(result?.details || result?.error || "").toLowerCase();
      const isRateLimit = errBlob.includes("rate_limit") || errBlob.includes("rate limit");
      const hadAuditArtifact = Array.isArray(result?.artifacts) && result.artifacts.some((a: any) => a.type === "brand_audit_report");

      if (hadAuditArtifact) break; // success — done
      if (!isRateLimit) break; // non-retryable failure — bail
      lastErrSummary = `Attempt ${attempt + 1}: rate limit — waiting before retry...`;
      console.log(lastErrSummary);
    }

    const today = new Date().toISOString().slice(0, 10);

    if (!robotChatRes || !robotChatRes.ok || result?.error) {
      // Log failure as a special artifact so the user can see what went wrong
      const errMessage = result?.error || `HTTP ${robotChatRes?.status || "?"}`;
      const errDetails = typeof result?.details === "string" ? result.details : JSON.stringify(result?.details || {}).slice(0, 1000);
      const isRateLimit = errDetails.toLowerCase().includes("rate_limit") || errDetails.toLowerCase().includes("rate limit");
      await supabase.from("robot_artifacts").insert({
        user_id,
        robot_id: robot.id,
        artifact_type: "brand_audit_failure",
        title: `Brand Audit Failed — ${today}`,
        summary: isRateLimit ? "Anthropic rate limit. Retried 3 times. See Notepad → rate-limit considerations." : `Scheduled audit failed: ${errMessage}`,
        payload: {
          attempted_at: new Date().toISOString(),
          error: errMessage,
          details: errDetails,
          robot_name: robot.name,
          retries_attempted: 3,
          rate_limited: isRateLimit,
        },
        status: "failed",
      });
      return new Response(
        JSON.stringify({ success: false, error: errMessage, details: errDetails }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const artifacts = Array.isArray(result.artifacts) ? result.artifacts : [];
    const auditCreated = artifacts.find((a: any) => a.type === "brand_audit_report");

    if (!auditCreated) {
      // Robot replied but didn't save an audit — log this case too
      await supabase.from("robot_artifacts").insert({
        user_id,
        robot_id: robot.id,
        artifact_type: "brand_audit_failure",
        title: `Brand Audit Incomplete — ${today}`,
        summary: "Atlas responded but did not call save_brand_audit",
        payload: {
          attempted_at: new Date().toISOString(),
          response_text: (result.response || "").slice(0, 2000),
          tool_calls: result.tool_calls || [],
        },
        status: "incomplete",
      });
      return new Response(
        JSON.stringify({ success: false, reason: "incomplete", response: result.response }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        audit_artifact_id: auditCreated.id,
        title: auditCreated.title,
        tool_call_count: (result.tool_calls || []).length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Server error", details: String(err.message || err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
