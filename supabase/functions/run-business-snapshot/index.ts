// run-business-snapshot — Sunday 5pm ET weekly synthesis.
// Pulls real data from across the system, hands it to Atlas, gets back a
// structured one-page brief saved as a "business_snapshot" artifact.
//
// Designed to grow into an EOS-style report once user starts tracking
// rocks/scorecard/headlines explicitly.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const ANTHROPIC_WORKSPACE_LABEL = Deno.env.get("ANTHROPIC_WORKSPACE_LABEL") || "default";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = req.method === "POST" ? await req.json() : {};
    const user_id = body.user_id || "bf4a59c7-9929-4c35-b972-9e4dae31c1ba";
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get Atlas robot
    const { data: atlas } = await supabase.from("robots")
      .select("id, name, role, model")
      .eq("user_id", user_id).eq("status", "active").ilike("name", "Atlas").maybeSingle();
    if (!atlas) {
      return new Response(JSON.stringify({ error: "Atlas robot not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Window: last 7 days
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekAgoIso = weekAgo.toISOString();

    // ─── PULL DATA IN PARALLEL ─────────────────────────────────────────
    const [
      businessesRes, dealsAllRes, dealsThisWeekRes, tasksAllRes, tasksDueRes,
      txnsRes, accountsRes, contentPostsRes, triageRes, archivesRes, draftPicksRes,
      videoRendersRes,
    ] = await Promise.all([
      supabase.from("businesses").select("id, name, business_type, status").eq("user_id", user_id),
      supabase.from("sales_pipeline").select("id, deal_name, stage, value, business_id, created_at, updated_at").eq("user_id", user_id),
      supabase.from("sales_pipeline").select("id, deal_name, stage, value, business_id, created_at, updated_at").eq("user_id", user_id).gte("updated_at", weekAgoIso),
      supabase.from("cu_tasks").select("id, name, status, due_date, list_id").eq("user_id", user_id).limit(50),
      supabase.from("cu_tasks").select("id, name, status, due_date").eq("user_id", user_id).lte("due_date", new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()).neq("status", "closed").limit(30),
      supabase.from("transactions").select("id, date, amount, type, category, description").eq("user_id", user_id).gte("date", weekAgo.toISOString().slice(0, 10)).limit(200),
      supabase.from("accounts").select("id, name, type, balance").eq("user_id", user_id),
      supabase.from("content_posts").select("id, platform, posted_at").eq("user_id", user_id).gte("posted_at", weekAgoIso),
      supabase.from("inbox_triage").select("id, category_id, priority, needs_response, user_marked_handled, triaged_at").eq("user_id", user_id).gte("triaged_at", weekAgoIso),
      supabase.from("inbox_auto_archive_log").select("id").eq("user_id", user_id).gte("archived_at", weekAgoIso).is("unarchived_at", null),
      supabase.from("inbox_draft_picks").select("id, picked_robot, was_sent").eq("user_id", user_id).gte("created_at", weekAgoIso),
      supabase.from("robot_artifacts").select("id, artifact_type, status, created_at").eq("user_id", user_id).in("artifact_type", ["video_clips_project", "video_render", "video_clip"]).gte("created_at", weekAgoIso),
    ]);

    const businesses = businessesRes.data || [];
    const deals = dealsAllRes.data || [];
    const dealsWeek = dealsThisWeekRes.data || [];
    const tasksAll = tasksAllRes.data || [];
    const tasksDueSoon = tasksDueRes.data || [];
    const txns = txnsRes.data || [];
    const accounts = accountsRes.data || [];
    const contentPosts = contentPostsRes.data || [];
    const triage = triageRes.data || [];
    const archives = archivesRes.data || [];
    const draftPicks = draftPicksRes.data || [];
    const videoRenders = videoRendersRes.data || [];

    // ─── BUILD STRUCTURED CONTEXT FOR ATLAS ─────────────────────────────

    // Pipeline summary
    const dealsByStage: Record<string, number> = {};
    const dealsByBusiness: Record<string, { count: number; value: number }> = {};
    let totalPipelineValue = 0, openDealsCount = 0, wonThisWeekCount = 0, wonThisWeekValue = 0;
    deals.forEach((d: any) => {
      const stage = d.stage || "?";
      dealsByStage[stage] = (dealsByStage[stage] || 0) + 1;
      const bizKey = d.business_id || "no-business";
      if (!dealsByBusiness[bizKey]) dealsByBusiness[bizKey] = { count: 0, value: 0 };
      dealsByBusiness[bizKey].count++;
      dealsByBusiness[bizKey].value += Number(d.value || 0);
      if (!["won", "lost", "closed", "Closed"].includes(stage)) {
        openDealsCount++;
        totalPipelineValue += Number(d.value || 0);
      }
    });
    dealsWeek.forEach((d: any) => {
      if ((d.stage || "").toLowerCase() === "won") {
        wonThisWeekCount++;
        wonThisWeekValue += Number(d.value || 0);
      }
    });

    // Tasks summary
    const tasksByStatus: Record<string, number> = {};
    let overdueTasksCount = 0;
    tasksAll.forEach((t: any) => {
      const s = (t.status || "open").toLowerCase();
      tasksByStatus[s] = (tasksByStatus[s] || 0) + 1;
      if (t.due_date && new Date(t.due_date) < now && s !== "closed") overdueTasksCount++;
    });

    // Financial summary
    let totalIn = 0, totalOut = 0;
    const txnByCategory: Record<string, { count: number; total: number }> = {};
    txns.forEach((t: any) => {
      const amt = Number(t.amount || 0);
      const type = (t.type || "").toLowerCase();
      if (type === "income" || amt > 0 && !type) totalIn += Math.abs(amt);
      else totalOut += Math.abs(amt);
      const cat = t.category || "Uncategorized";
      if (!txnByCategory[cat]) txnByCategory[cat] = { count: 0, total: 0 };
      txnByCategory[cat].count++;
      txnByCategory[cat].total += Math.abs(amt);
    });
    const totalAccountBalance = accounts.reduce((s: number, a: any) => s + Number(a.balance || 0), 0);

    // Inbox summary
    const triageByCat: Record<string, number> = {};
    let needsResponseStill = 0, handled = 0;
    triage.forEach((t: any) => {
      if (!t.user_marked_handled && t.needs_response) needsResponseStill++;
      if (t.user_marked_handled) handled++;
    });

    // Content summary
    const postsByPlatform: Record<string, number> = {};
    contentPosts.forEach((p: any) => {
      postsByPlatform[p.platform] = (postsByPlatform[p.platform] || 0) + 1;
    });

    // Compose the data block for Atlas
    const dataBlock = `
═══ DATA: LAST 7 DAYS (${weekAgo.toISOString().slice(0, 10)} → ${now.toISOString().slice(0, 10)}) ═══

ACTIVE BUSINESSES: ${businesses.length}
${businesses.map((b: any) => `  • ${b.name} (${b.business_type || "?"}, ${b.status || "active"})`).join("\n")}

SALES PIPELINE:
  Total open deals: ${openDealsCount}
  Total pipeline value: $${totalPipelineValue.toLocaleString()}
  Won this week: ${wonThisWeekCount} deals worth $${wonThisWeekValue.toLocaleString()}
  Deals updated this week: ${dealsWeek.length}
  By stage: ${Object.entries(dealsByStage).map(([s, c]) => `${s}=${c}`).join(", ") || "(no deals)"}

TASKS:
  Total tracked: ${tasksAll.length}
  By status: ${Object.entries(tasksByStatus).map(([s, c]) => `${s}=${c}`).join(", ") || "(none)"}
  Overdue: ${overdueTasksCount}
  Due in next 7 days (open): ${tasksDueSoon.length}
${tasksDueSoon.slice(0, 10).map((t: any) => `    • ${t.name} (${t.due_date ? t.due_date.slice(0, 10) : "no date"})`).join("\n")}

FINANCIAL:
  Total account balance: $${totalAccountBalance.toLocaleString()} across ${accounts.length} accounts
  Transactions this week: ${txns.length}
  Money in: $${totalIn.toLocaleString()}
  Money out: $${totalOut.toLocaleString()}
  Top spend categories: ${Object.entries(txnByCategory).sort((a: any, b: any) => b[1].total - a[1].total).slice(0, 5).map(([c, v]: any) => `${c}=$${Math.round(v.total).toLocaleString()}`).join(", ") || "(none)"}

INBOX (Atlas's domain):
  Triaged this week: ${triage.length}
  Handled: ${handled}
  Still needs response: ${needsResponseStill}
  Auto-archived: ${archives.length}
  Dual-bot drafts picked: ${draftPicks.length} (${draftPicks.filter((p: any) => p.was_sent).length} sent)

CONTENT (Studio):
  Videos processed: ${videoRenders.filter((v: any) => v.status === "completed").length}
  Posts logged: ${contentPosts.length}
  By platform: ${Object.entries(postsByPlatform).map(([p, c]) => `${p}=${c}`).join(", ") || "(none)"}
`;

    // ─── ATLAS PROMPT ───────────────────────────────────────────────────

    const system = `You are Atlas — strategic operator for Suarez Global. Your task: produce a Sunday-evening weekly business snapshot.

VOICE: Terse, analytical, executive. Cut to the point. Quantify everything. Be honest when data is thin — say "no movement" instead of inventing wins.

OUTPUT: Reply ONLY with valid JSON. No commentary, no markdown fences. Exact shape:
{
  "headline": "1-sentence top-line summary of the week (e.g. 'Pipeline flat, inbox tightened, light financial week.')",
  "what_moved": ["3-6 bullets — actual progress, real wins, things that advanced. Be specific. If nothing moved, return [\"No material movement this week.\"]"],
  "what_stalled": ["3-5 bullets — things that should have progressed but didn't. Overdue tasks, dormant pipelines, unhandled commitments. If nothing stalled, return [\"Nothing notably stalled.\"]"],
  "next_week_priorities": ["3-5 bullets — what the next week should focus on, given what you see. Concrete, actionable."],
  "strategic_read": "1 paragraph (60-120 words) of Atlas's honest commentary. What you see in the data, what's worth noting, what to watch.",
  "data_thin_areas": ["List any sections where data was missing/thin and the report would be richer with: e.g. 'No EOS rocks defined yet — add quarterly priorities to track.', 'Sales pipeline empty — confirm deals are being logged.'"]
}

DATA-INTEGRITY RULES:
- If pipeline is 0, do NOT invent deals. Say it's empty.
- If transactions are 0, do NOT invent financial activity.
- If tasks are minimal, do NOT pretend they were completed.
- The user values honesty over inflated reports.`;

    const userMsg = `Build my Sunday weekly business snapshot.\n\n${dataBlock}\n\nReply with the JSON only.`;

    // ─── CALL ANTHROPIC ─────────────────────────────────────────────────

    const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: atlas.model || "claude-sonnet-4-6",
        max_tokens: 2500,
        system,
        messages: [{ role: "user", content: userMsg }],
      }),
    });
    const apiData = await apiRes.json();

    // Log usage
    const usageInput = (apiData.usage?.input_tokens || 0) + (apiData.usage?.cache_read_input_tokens || 0) + (apiData.usage?.cache_creation_input_tokens || 0);
    const usageOutput = apiData.usage?.output_tokens || 0;
    const costEst = (usageInput / 1_000_000) * 3 + (usageOutput / 1_000_000) * 15;
    await supabase.from("api_usage_log").insert({
      user_id, service: "anthropic", action: "business_snapshot",
      tokens_in: usageInput, tokens_out: usageOutput, cost_estimate: costEst,
      metadata: { model: atlas.model || "claude-sonnet-4-6", workspace: ANTHROPIC_WORKSPACE_LABEL, robot_id: atlas.id, success: apiRes.ok },
    });

    if (!apiRes.ok) {
      // Save a failure artifact so the UI can show it
      await supabase.from("robot_artifacts").insert({
        user_id, robot_id: atlas.id,
        artifact_type: "business_snapshot_failure",
        title: `Snapshot failed — ${now.toISOString().slice(0, 10)}`,
        summary: `Anthropic ${apiRes.status}: ${JSON.stringify(apiData).slice(0, 200)}`,
        payload: { error: apiData, week_start: weekAgoIso, week_end: now.toISOString() },
        status: "failed",
      });
      return new Response(JSON.stringify({ error: "Anthropic call failed", details: apiData }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const responseText = apiData.content?.[0]?.text || "";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(JSON.stringify({ error: "Atlas didn't return JSON", response: responseText.slice(0, 500) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      return new Response(JSON.stringify({ error: "JSON parse failed", response: responseText.slice(0, 500) }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save the snapshot
    const { data: art } = await supabase.from("robot_artifacts").insert({
      user_id, robot_id: atlas.id,
      artifact_type: "business_snapshot",
      title: `Weekly Business Snapshot — ${now.toISOString().slice(0, 10)}`,
      summary: parsed.headline || "Weekly snapshot",
      payload: {
        ...parsed,
        week_start: weekAgoIso,
        week_end: now.toISOString(),
        raw_data: {
          businesses: businesses.length,
          open_deals: openDealsCount,
          pipeline_value: totalPipelineValue,
          deals_won: wonThisWeekCount,
          tasks_total: tasksAll.length,
          tasks_overdue: overdueTasksCount,
          txns_count: txns.length,
          money_in: totalIn,
          money_out: totalOut,
          inbox_triaged: triage.length,
          inbox_handled: handled,
          posts_logged: contentPosts.length,
          videos_processed: videoRenders.filter((v: any) => v.status === "completed").length,
          archives: archives.length,
        },
      },
      status: "created",
    }).select().single();

    return new Response(JSON.stringify({
      success: true,
      artifact_id: art?.id,
      snapshot: parsed,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("run-business-snapshot error:", err);
    return new Response(JSON.stringify({ error: "Server error", details: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
