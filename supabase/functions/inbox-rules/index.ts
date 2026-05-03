// inbox-rules — three actions:
//   evaluate      — given a thread (sender + subject), find the matching rule. Used by triage flow.
//   apply_to_thread — apply matching rules to a thread (write triage row). Used by frontend before LLM triage.
//   suggest       — analyze recent feedback for patterns, write pending-review rule suggestions.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Match a single rule against thread metadata. Returns true if ALL conditions match.
function matchesConditions(rule: any, sender_email: string, subject: string): boolean {
  const conditions = Array.isArray(rule.conditions) ? rule.conditions : [];
  if (conditions.length === 0) return false; // no conditions = never match (safety)
  const senderLower = (sender_email || "").toLowerCase();
  const subjectLower = (subject || "").toLowerCase();
  for (const c of conditions) {
    const value = (c.value || "").toLowerCase();
    if (!value) return false;
    if (c.type === "from_email") {
      if (senderLower !== value) return false;
    } else if (c.type === "from_email_domain") {
      // Match either bare domain or "@domain" — strip leading @ from rule value
      const domain = value.startsWith("@") ? value.slice(1) : value;
      if (!senderLower.endsWith("@" + domain) && !senderLower.endsWith("." + domain)) return false;
    } else if (c.type === "subject_contains") {
      if (!subjectLower.includes(value)) return false;
    } else {
      return false; // unknown condition type
    }
  }
  return true;
}

// Find the best (most-specific, highest-confidence) active rule that matches
function findBestMatch(rules: any[], sender_email: string, subject: string): any | null {
  const matched = rules.filter((r) => r.active && matchesConditions(r, sender_email, subject));
  if (matched.length === 0) return null;
  // Specificity: from_email beats from_email_domain beats subject_contains; more conditions beats fewer
  const score = (r: any) => {
    let s = 0;
    for (const c of (r.conditions || [])) {
      if (c.type === "from_email") s += 100;
      else if (c.type === "from_email_domain") s += 50;
      else if (c.type === "subject_contains") s += 10;
    }
    return s + Number(r.confidence || 0);
  };
  matched.sort((a, b) => score(b) - score(a));
  return matched[0];
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
      // Single-thread match check. Body: { user_id, sender_email, subject }
      const { sender_email, subject } = body;
      const { data: rules } = await supabase
        .from("inbox_rules")
        .select("*")
        .eq("user_id", user_id)
        .eq("active", true)
        .neq("suggestion_status", "rejected");
      const match = findBestMatch(rules || [], sender_email, subject);
      const tier = match ? (match.confidence >= 0.85 ? "A" : match.confidence >= 0.60 ? "B" : "C") : null;
      return new Response(JSON.stringify({ matched: !!match, rule: match, tier }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "apply_to_threads") {
      // Bulk apply rules to a list of inbox threads. Frontend calls this before
      // running an LLM triage, so cheap rule matches handle most threads first.
      // Body: { user_id, threads: [{ thread_id, sender_email, sender_name, subject, snippet, received_at }] }
      const threads = Array.isArray(body.threads) ? body.threads : [];
      if (threads.length === 0) {
        return new Response(JSON.stringify({ applied: 0, threads_processed: 0 }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: rules } = await supabase
        .from("inbox_rules")
        .select("*")
        .eq("user_id", user_id)
        .eq("active", true)
        .neq("suggestion_status", "rejected");
      const allRules = rules || [];

      let appliedCount = 0;
      let pendingCount = 0;
      const skipped: string[] = []; // thread_ids that no rule matched (need LLM)

      for (const t of threads) {
        const match = findBestMatch(allRules, t.sender_email || "", t.subject || "");
        if (!match) { skipped.push(t.thread_id); continue; }
        const tier = match.confidence >= 0.85 ? "A" : match.confidence >= 0.60 ? "B" : "C";
        if (tier === "C") { skipped.push(t.thread_id); continue; }

        // Skip if already triaged (don't overwrite existing user-visible triage)
        const { data: existing } = await supabase
          .from("inbox_triage")
          .select("id")
          .eq("user_id", user_id)
          .eq("gmail_thread_id", t.thread_id)
          .maybeSingle();
        if (existing) continue;

        const isPendingReview = tier === "B";
        await supabase.from("inbox_triage").insert({
          user_id,
          gmail_thread_id: t.thread_id,
          category_id: match.action_category_id,
          priority: match.action_priority,
          needs_response: match.action_needs_response,
          is_actionable: match.action_is_actionable,
          suggested_action: match.action_suggested_action,
          reasoning: `${match.action_reasoning} (Rule: "${match.name}", confidence ${Math.round(match.confidence * 100)}%${isPendingReview ? " — pending your review" : ""})`,
          sender_email: t.sender_email,
          sender_name: t.sender_name,
          subject: t.subject,
          snippet: t.snippet,
          thread_received_at: t.received_at,
          applied_rule_id: match.id,
          auto_applied: true,
          user_confirmed: false,
          triaged_at: new Date().toISOString(),
        });

        // Sync Gmail label (fire-and-forget; don't block rule processing)
        try {
          fetch(`${SUPABASE_URL}/functions/v1/gmail-label-sync`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              "apikey": SUPABASE_SERVICE_ROLE_KEY,
            },
            body: JSON.stringify({
              action: "sync_one",
              user_id,
              thread_id: t.thread_id,
            }),
          }).catch(() => {});
        } catch (_) {}

        // Bump match count
        await supabase.from("inbox_rules").update({
          match_count: (match.match_count || 0) + 1,
          last_matched_at: new Date().toISOString(),
        }).eq("id", match.id);

        if (isPendingReview) pendingCount++;
        else appliedCount++;
      }

      return new Response(JSON.stringify({
        threads_processed: threads.length,
        auto_applied: appliedCount,
        pending_review: pendingCount,
        skipped_for_llm: skipped.length,
        skipped_thread_ids: skipped,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "suggest") {
      // Look at recent feedback events with same-direction corrections and propose rules.
      // Body: { user_id, days_back?: 30, threshold?: 3 }
      const daysBack = Number(body.days_back) || 30;
      const threshold = Number(body.threshold) || 3;
      const sinceDate = new Date(Date.now() - daysBack * 86400000).toISOString();

      // Pull triage rows where user overrode Atlas's category in the last N days
      const { data: triages } = await supabase
        .from("inbox_triage")
        .select("sender_email, user_override_category_id, category_id, priority, user_override_priority")
        .eq("user_id", user_id)
        .not("user_override_category_id", "is", null)
        .not("sender_email", "is", null)
        .gte("triaged_at", sinceDate);

      if (!triages || triages.length === 0) {
        return new Response(JSON.stringify({ suggested: 0, message: "No corrections in window." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Group by (sender_email, user_override_category_id)
      const groups: Record<string, { count: number; priorities: string[]; sender: string; cat: string }> = {};
      for (const t of triages) {
        const key = `${t.sender_email}|${t.user_override_category_id}`;
        if (!groups[key]) groups[key] = { count: 0, priorities: [], sender: t.sender_email, cat: t.user_override_category_id };
        groups[key].count++;
        groups[key].priorities.push(t.user_override_priority || t.priority);
      }

      // Find groups meeting threshold and not already covered by a rule
      const { data: existingRules } = await supabase
        .from("inbox_rules")
        .select("id, name, conditions, action_category_id")
        .eq("user_id", user_id)
        .eq("active", true);

      const ruleCovers = (sender: string, catId: string) => {
        return (existingRules || []).some((r: any) => {
          if (r.action_category_id !== catId) return false;
          for (const c of (r.conditions || [])) {
            if (c.type === "from_email" && c.value?.toLowerCase() === sender.toLowerCase()) return true;
          }
          return false;
        });
      };

      const suggestionsCreated: any[] = [];
      for (const key in groups) {
        const g = groups[key];
        if (g.count < threshold) continue;
        if (ruleCovers(g.sender, g.cat)) continue;

        // Pick the most-common priority from the group
        const prioCounts: Record<string, number> = {};
        g.priorities.forEach((p) => { prioCounts[p] = (prioCounts[p] || 0) + 1; });
        const bestPrio = Object.entries(prioCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || "normal";

        const { data: catRow } = await supabase.from("inbox_categories").select("name").eq("id", g.cat).maybeSingle();
        const catName = catRow?.name || "?";

        const { data: inserted } = await supabase.from("inbox_rules").insert({
          user_id,
          name: `${g.sender} → ${catName}`,
          description: `Suggested from ${g.count} corrections of this sender to ${catName} in the last ${daysBack} days.`,
          conditions: [{ type: "from_email", value: g.sender }],
          action_category_id: g.cat,
          action_priority: bestPrio,
          action_needs_response: false,
          action_is_actionable: false,
          action_reasoning: `User pattern: ${g.count} corrections to ${catName} in ${daysBack}d.`,
          confidence: 0.70,
          source: "feedback_pattern",
          suggestion_status: "pending_review",
          active: false,
        }).select("*").single();

        if (inserted) suggestionsCreated.push(inserted);
      }

      return new Response(JSON.stringify({
        suggested: suggestionsCreated.length,
        suggestions: suggestionsCreated,
        groups_analyzed: Object.keys(groups).length,
        threshold,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
