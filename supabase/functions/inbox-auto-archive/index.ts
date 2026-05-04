// inbox-auto-archive — Conservative auto-archive (Option 1).
// Only archives when ALL conditions met:
//   1. Global kill switch ON (studio_settings.inbox_auto_archive_enabled)
//   2. Category has auto_archive_enabled = true
//   3. The triage was applied by a RULE (not LLM-only judgment) — when configured
//   4. The rule has at least min_thumbs_up confirmations
//   5. The rule has at most max_thumbs_down complaints
//   6. The triage has not been marked needs_response (extra safety)
//
// Actions:
//   evaluate    — body: { user_id, triage_id }. Decides + archives if eligible. Returns reason.
//   undo        — body: { user_id, log_id }. Re-applies INBOX label, marks log undone.
//   audit_today — body: { user_id }. Returns today's auto-archived items for review.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function getGoogleToken(supabase: any, user_id: string): Promise<string | null> {
  const { data: row } = await supabase.from("gmail_tokens").select("access_token, refresh_token, expires_at").eq("user_id", user_id).maybeSingle();
  if (!row?.access_token) return null;
  let token = row.access_token;
  if (row.expires_at && new Date(row.expires_at).getTime() - Date.now() < 60000) {
    const refRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `client_id=${GOOGLE_CLIENT_ID}&client_secret=${GOOGLE_CLIENT_SECRET}&refresh_token=${row.refresh_token}&grant_type=refresh_token`,
    });
    const rd = await refRes.json();
    if (rd.access_token) {
      token = rd.access_token;
      await supabase.from("gmail_tokens").update({ access_token: rd.access_token, expires_at: new Date(Date.now() + (rd.expires_in || 3600) * 1000).toISOString() }).eq("user_id", user_id);
    } else return null;
  }
  return token;
}

// Find or create the "Suarez/Auto-Archived" label for audit visibility
async function ensureAutoArchivedLabel(supabase: any, user_id: string, token: string): Promise<string | null> {
  const labelName = "Suarez/Auto-Archived";
  const listRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!listRes.ok) return null;
  const labels = (await listRes.json()).labels || [];
  let label = labels.find((l: any) => l.name === labelName);
  if (label) return label.id;
  const createRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: labelName, labelListVisibility: "labelShow", messageListVisibility: "show" }),
  });
  if (!createRes.ok) return null;
  const created = await createRes.json();
  return created.id || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json();
    const { action, user_id } = body;
    if (!action || !user_id) {
      return new Response(JSON.stringify({ error: "action and user_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (action === "evaluate") {
      const { triage_id } = body;
      if (!triage_id) return new Response(JSON.stringify({ error: "triage_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // 1. Global kill switch
      const { data: settings } = await supabase.from("studio_settings").select("inbox_auto_archive_enabled").eq("user_id", user_id).maybeSingle();
      if (settings?.inbox_auto_archive_enabled === false) {
        return new Response(JSON.stringify({ archived: false, reason: "global kill switch off" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // 2. Pull triage row
      const { data: triage } = await supabase.from("inbox_triage").select("*").eq("id", triage_id).eq("user_id", user_id).maybeSingle();
      if (!triage) return new Response(JSON.stringify({ archived: false, reason: "triage not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // 3. Safety check: never archive things that need a response
      if (triage.needs_response) {
        return new Response(JSON.stringify({ archived: false, reason: "triage marked needs_response" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (triage.is_actionable) {
        return new Response(JSON.stringify({ archived: false, reason: "triage marked is_actionable" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // 4. Pull category
      const catId = triage.user_override_category_id || triage.category_id;
      const { data: cat } = await supabase.from("inbox_categories").select("*").eq("id", catId).maybeSingle();
      if (!cat) return new Response(JSON.stringify({ archived: false, reason: "category not found" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (!cat.auto_archive_enabled) {
        return new Response(JSON.stringify({ archived: false, reason: `auto-archive not enabled for ${cat.name}` }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // 5. Conservative-mode rule check
      let ruleInfo: any = null;
      if (cat.auto_archive_only_when_rule) {
        if (!triage.applied_rule_id) {
          return new Response(JSON.stringify({ archived: false, reason: "conservative mode requires rule-applied triage" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const { data: rule } = await supabase.from("inbox_rules").select("*").eq("id", triage.applied_rule_id).maybeSingle();
        if (!rule || !rule.active) {
          return new Response(JSON.stringify({ archived: false, reason: "applied rule no longer active" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        const tu = rule.thumbs_up_count || 0;
        const td = rule.thumbs_down_count || 0;
        if (tu < cat.auto_archive_min_thumbs_up) {
          return new Response(JSON.stringify({ archived: false, reason: `rule needs ${cat.auto_archive_min_thumbs_up}+ thumbs-ups (has ${tu})` }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (td > cat.auto_archive_max_thumbs_down) {
          return new Response(JSON.stringify({ archived: false, reason: `rule has ${td} thumbs-downs (max allowed ${cat.auto_archive_max_thumbs_down})` }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        if (rule.confidence < 0.85) {
          return new Response(JSON.stringify({ archived: false, reason: `rule confidence below 85% (is ${Math.round(rule.confidence * 100)}%)` }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        ruleInfo = rule;
      }

      // ALL CHECKS PASSED — archive
      const token = await getGoogleToken(supabase, user_id);
      if (!token) return new Response(JSON.stringify({ archived: false, reason: "Gmail token unavailable" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const autoArchivedLabelId = await ensureAutoArchivedLabel(supabase, user_id, token);

      const modBody: any = { removeLabelIds: ["INBOX"] };
      if (autoArchivedLabelId) modBody.addLabelIds = [autoArchivedLabelId];

      const archiveRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${triage.gmail_thread_id}/modify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(modBody),
      });
      if (!archiveRes.ok) {
        const e = await archiveRes.text();
        return new Response(JSON.stringify({ archived: false, reason: `Gmail archive failed: ${archiveRes.status}`, detail: e.slice(0, 200) }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Log the archive
      const { data: logRow } = await supabase.from("inbox_auto_archive_log").insert({
        user_id, triage_id: triage.id, gmail_thread_id: triage.gmail_thread_id,
        category_id: cat.id, category_name: cat.name,
        rule_id: ruleInfo?.id || null, rule_name: ruleInfo?.name || null,
        rule_thumbs_up_count: ruleInfo?.thumbs_up_count || null,
        rule_thumbs_down_count: ruleInfo?.thumbs_down_count || null,
      }).select("id").single();

      // Mark triage as handled (it's archived; user doesn't need to act on it)
      await supabase.from("inbox_triage").update({
        user_marked_handled: true,
        user_handled_at: new Date().toISOString(),
      }).eq("id", triage.id);

      return new Response(JSON.stringify({
        archived: true, log_id: logRow?.id, category: cat.name, rule_name: ruleInfo?.name,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "undo") {
      const { log_id, reason } = body;
      if (!log_id) return new Response(JSON.stringify({ error: "log_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const { data: logRow } = await supabase.from("inbox_auto_archive_log").select("*").eq("id", log_id).eq("user_id", user_id).maybeSingle();
      if (!logRow) return new Response(JSON.stringify({ error: "log entry not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (logRow.unarchived_at) return new Response(JSON.stringify({ already_undone: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const token = await getGoogleToken(supabase, user_id);
      if (!token) return new Response(JSON.stringify({ error: "Gmail token unavailable" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const autoArchivedLabelId = await ensureAutoArchivedLabel(supabase, user_id, token);
      const modBody: any = { addLabelIds: ["INBOX"] };
      if (autoArchivedLabelId) modBody.removeLabelIds = [autoArchivedLabelId];

      await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${logRow.gmail_thread_id}/modify`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(modBody),
      });

      await supabase.from("inbox_auto_archive_log").update({
        unarchived_at: new Date().toISOString(),
        unarchive_reason: reason || "user undo",
      }).eq("id", log_id);

      // Also un-mark the triage handled state so it shows back up
      if (logRow.triage_id) {
        await supabase.from("inbox_triage").update({
          user_marked_handled: false,
          user_handled_at: null,
        }).eq("id", logRow.triage_id);
      }

      return new Response(JSON.stringify({ ok: true, undone: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "audit_today") {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase.from("inbox_auto_archive_log")
        .select("*")
        .eq("user_id", user_id)
        .gte("archived_at", since)
        .order("archived_at", { ascending: false });
      return new Response(JSON.stringify({ entries: data || [] }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("inbox-auto-archive error:", err);
    return new Response(JSON.stringify({ error: "Server error", details: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
