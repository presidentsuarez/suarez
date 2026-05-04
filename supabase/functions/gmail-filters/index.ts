// gmail-filters — list/classify/delete Gmail filters and convert them to Suarez Inbox Rules.
//
// Actions:
//   list      — body: { user_id }. Returns all Gmail filters with our classification.
//   convert   — body: { user_id, filter_id, target_category, archive_after?: bool, confidence? }.
//               Creates Suarez Inbox Rule from the filter, then deletes the Gmail filter.
//               Atomic-ish: rule must save successfully before filter is deleted.
//   delete    — body: { user_id, filter_ids: [...] }. Bulk delete Gmail filters (no rule conversion).
//   bulk_convert — body: { user_id, items: [{ filter_id, target_category }] }. Batch convert.

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

// Classify a Gmail filter into one of our action buckets
function classifyFilter(f: any) {
  const a = f.action || {};
  const rm = new Set(a.removeLabelIds || []);
  const add = new Set(a.addLabelIds || []);
  const crit = f.criteria || {};

  let actionType = "other";
  if ((add as Set<string>).has("TRASH")) actionType = "trash";
  else if (a.forward) actionType = "forward";
  else if ((rm as Set<string>).has("SPAM")) actionType = "never_spam";
  else if (rm.size === 1 && (rm as Set<string>).has("INBOX") && add.size === 0) actionType = "archive_only";
  else if (rm.size === 1 && (rm as Set<string>).has("UNREAD") && add.size === 0) actionType = "mark_read_only";
  else if ((rm as Set<string>).has("INBOX") && (rm as Set<string>).has("UNREAD") && add.size === 0) actionType = "mark_read_archive";
  else if ((add as Set<string>).has("CATEGORY_PROMOTIONS")) actionType = "category_promo";
  else if ([...add].some((l: string) => l.startsWith("CATEGORY_"))) actionType = "category_other";
  else if ((add as Set<string>).has("STARRED") && add.size === 1) actionType = "star";
  else if (((add as Set<string>).has("IMPORTANT") || (add as Set<string>).has("STARRED")) &&
           [...add].every((l: string) => l === "IMPORTANT" || l === "STARRED")) actionType = "important";
  else if (add.size > 0 && [...add].every((l: string) => !l.startsWith("CATEGORY_") && !["TRASH","SPAM","UNREAD","IMPORTANT","STARRED","INBOX"].includes(l))) actionType = "apply_custom_label";

  // Convertibility: which actions correspond to a Suarez Inbox Rule?
  // Convertible: archive_only, category_promo, mark_read_archive, apply_custom_label
  // Not convertible (keep): trash, never_spam, forward, important, star, mark_read_only
  const convertible = ["archive_only", "category_promo", "mark_read_archive", "apply_custom_label", "category_other"].includes(actionType);

  // Suggest a Suarez category for convertible filters
  let suggestedCategory = null;
  if (convertible) {
    if (actionType === "archive_only" || actionType === "mark_read_archive") suggestedCategory = "Promotional";
    else if (actionType === "category_promo") suggestedCategory = "Promotional";
    else if (actionType === "category_other") suggestedCategory = "Notification";
    else suggestedCategory = "Newsletter";
  }

  // Build a human-readable summary of what the filter matches
  const matchParts: string[] = [];
  if (crit.from) matchParts.push(`from: ${crit.from}`);
  if (crit.to) matchParts.push(`to: ${crit.to}`);
  if (crit.subject) matchParts.push(`subject: ${crit.subject}`);
  if (crit.query) matchParts.push(`query: ${crit.query}`);
  if (crit.hasAttachment) matchParts.push("has attachment");

  return {
    id: f.id,
    actionType,
    convertible,
    suggestedCategory,
    summary: matchParts.join(" · ") || "(no criteria)",
    criteria: crit,
    action: a,
  };
}

// Build Suarez rule conditions from a Gmail filter's criteria
function gmailCriteriaToSuarezConditions(crit: any): any[] {
  const conds: any[] = [];

  if (crit.from) {
    // Gmail "from" can be a single address, a name, or contain wildcards/operators.
    // We extract email addresses; if no @ found, treat as a name match via subject_contains? No — just store as exact.
    const f = String(crit.from).trim();
    // If it looks like a domain (has @ or starts with .)
    const emailMatch = f.match(/<([^>]+@[^>]+)>/) || f.match(/([\w.+-]+@[\w.-]+)/);
    if (emailMatch) {
      conds.push({ type: "from_email", value: emailMatch[1] });
    } else if (f.includes(".") && !f.includes(" ")) {
      // domain-like
      conds.push({ type: "from_email_domain", value: f.replace(/^@/, "") });
    } else {
      // treat as name fragment — Suarez doesn't have from_name match, fall back to a query that won't fire
      // Skip — return empty, caller should handle this
      return [];
    }
  }
  if (crit.subject) {
    conds.push({ type: "subject_contains", value: crit.subject });
  }
  if (crit.query) {
    // Gmail queries are complex; we extract substring tokens for subject_contains
    // This is lossy but good-enough for most cases
    const q = String(crit.query).trim();
    // Strip Gmail operators we can't represent
    if (!q.includes(":") && q.length < 200) {
      conds.push({ type: "subject_contains", value: q });
    }
  }
  return conds;
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
    const token = await getGoogleToken(supabase, user_id);
    if (!token) {
      return new Response(JSON.stringify({ error: "Gmail not connected" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "list") {
      const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/settings/filters", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        return new Response(JSON.stringify({ error: `Gmail API error ${res.status}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const data = await res.json();
      const filters = data.filter || data.filters || [];
      const classified = filters.map(classifyFilter);

      // Group by actionType
      const grouped: Record<string, any[]> = {};
      for (const f of classified) {
        if (!grouped[f.actionType]) grouped[f.actionType] = [];
        grouped[f.actionType].push(f);
      }

      return new Response(JSON.stringify({
        ok: true,
        total: classified.length,
        groups: grouped,
        all: classified,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "convert") {
      // Body: { user_id, filter_id, target_category, archive_after?: bool, confidence? }
      const { filter_id, target_category, archive_after, confidence } = body;
      if (!filter_id || !target_category) {
        return new Response(JSON.stringify({ error: "filter_id and target_category required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Fetch the specific filter
      const fRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/settings/filters/${filter_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!fRes.ok) {
        return new Response(JSON.stringify({ error: `Filter ${filter_id} not found` }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const filter = await fRes.json();

      // Build Suarez conditions
      const conditions = gmailCriteriaToSuarezConditions(filter.criteria || {});
      if (conditions.length === 0) {
        return new Response(JSON.stringify({ error: "Cannot convert — Gmail filter has criteria we can't represent (e.g. name-only match, complex query)." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Look up category
      const { data: cat } = await supabase.from("inbox_categories")
        .select("id, name, default_priority").eq("user_id", user_id).ilike("name", target_category).maybeSingle();
      if (!cat) {
        return new Response(JSON.stringify({ error: `Category "${target_category}" not found` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const ruleName = `${conditions[0].value} → ${cat.name}`;

      // STEP 1: Insert Suarez rule
      const { data: insertedRule, error: insErr } = await supabase.from("inbox_rules").insert({
        user_id,
        name: ruleName,
        description: `Migrated from Gmail filter ${filter_id}.`,
        conditions,
        action_category_id: cat.id,
        action_priority: cat.default_priority || "low",
        action_needs_response: false,
        action_is_actionable: false,
        action_reasoning: `Migrated Gmail filter — was: ${filter.action ? JSON.stringify(filter.action).slice(0, 100) : ""}`,
        confidence: Number(confidence) || 0.95,
        source: "manual",
        suggestion_status: "active",
        active: true,
      }).select("id").single();

      if (insErr || !insertedRule) {
        return new Response(JSON.stringify({ error: "Failed to insert Suarez rule", details: insErr?.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // STEP 2: Verify rule exists (paranoia)
      const { data: verify } = await supabase.from("inbox_rules").select("id").eq("id", insertedRule.id).maybeSingle();
      if (!verify) {
        return new Response(JSON.stringify({ error: "Rule insert reported success but rule not found on read-back; aborting Gmail filter delete to be safe" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // STEP 3: Delete the Gmail filter
      const dRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/settings/filters/${filter_id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!dRes.ok && dRes.status !== 204) {
        // Rule exists but Gmail delete failed. Don't roll back — user can manually retry.
        const errText = await dRes.text();
        return new Response(JSON.stringify({
          ok: true,
          rule_created: insertedRule.id,
          gmail_filter_deleted: false,
          warning: `Suarez rule was created but Gmail filter deletion failed (${dRes.status}). The Gmail filter still exists; you may have both running until you retry.`,
          gmail_error: errText.slice(0, 200),
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      return new Response(JSON.stringify({
        ok: true,
        rule_created: insertedRule.id,
        rule_name: ruleName,
        gmail_filter_deleted: true,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete") {
      // Body: { user_id, filter_ids: [...] }
      const { filter_ids } = body;
      if (!Array.isArray(filter_ids) || filter_ids.length === 0) {
        return new Response(JSON.stringify({ error: "filter_ids required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      let deleted = 0;
      const errors: any[] = [];
      for (const fid of filter_ids.slice(0, 50)) { // cap at 50 per call
        const dRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/settings/filters/${fid}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (dRes.ok || dRes.status === 204) deleted++;
        else errors.push({ filter_id: fid, status: dRes.status });
      }
      return new Response(JSON.stringify({ ok: true, deleted, errors }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "bulk_convert") {
      // Body: { user_id, items: [{ filter_id, target_category }] }
      const { items } = body;
      if (!Array.isArray(items) || items.length === 0) {
        return new Response(JSON.stringify({ error: "items required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const results: any[] = [];
      for (const item of items.slice(0, 30)) { // cap at 30 per call to stay under edge timeout
        try {
          // Recursive call to convert action — easier than refactoring
          const convertRes = await fetch(`${SUPABASE_URL}/functions/v1/gmail-filters`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "apikey": SUPABASE_SERVICE_ROLE_KEY,
            },
            body: JSON.stringify({ action: "convert", user_id, filter_id: item.filter_id, target_category: item.target_category }),
          });
          const convertData = await convertRes.json();
          results.push({ filter_id: item.filter_id, ...convertData });
        } catch (e) {
          results.push({ filter_id: item.filter_id, error: String(e?.message || e) });
        }
      }
      const succeeded = results.filter((r) => r.ok).length;
      const failed = results.length - succeeded;
      return new Response(JSON.stringify({ ok: true, succeeded, failed, results }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error", details: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
