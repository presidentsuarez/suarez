// draft-inbox-replies — generates two competing reply drafts for a triaged
// thread (Atlas's analytical voice + Alfred's polished voice). Each draft lands
// as a Gmail Drafts entry AND as a robot_artifact. The user picks one in the
// Triage UI; we log the pick + edits + send for future learning.
//
// POST body: { user_id, thread_id }
// Returns:    { atlas: {artifact_id, gmail_draft_id, body}, alfred: {...}, triage_id }
//
// Internal flow:
//   1. Look up triage row + Gmail thread context
//   2. Build a system prompt for each bot (their personality + style + memories)
//   3. Call Anthropic in parallel with the actual thread context
//   4. For each bot: write a Gmail Drafts entry + a robot_artifacts row of type "gmail_draft"
//   5. Update the triage row with both artifact ids

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const ANTHROPIC_WORKSPACE_LABEL = Deno.env.get("ANTHROPIC_WORKSPACE_LABEL") || "default";
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── HELPERS ────────────────────────────────────────────────────────────────

function decodeBase64Url(b64: string): string {
  try {
    const std = b64.replace(/-/g, "+").replace(/_/g, "/");
    const padded = std + "=".repeat((4 - std.length % 4) % 4);
    const raw = atob(padded);
    return decodeURIComponent(escape(raw));
  } catch (_) { return ""; }
}

function extractPlainBody(payload: any): string {
  if (!payload) return "";
  if (payload.body?.data && payload.mimeType?.startsWith("text/plain")) {
    return decodeBase64Url(payload.body.data);
  }
  if (Array.isArray(payload.parts)) {
    for (const p of payload.parts) {
      if (p.mimeType === "text/plain" && p.body?.data) return decodeBase64Url(p.body.data);
    }
    for (const p of payload.parts) {
      const r = extractPlainBody(p);
      if (r) return r;
    }
  }
  return "";
}

function extractHeader(headers: any[], name: string): string {
  const h = (headers || []).find((x: any) => (x.name || "").toLowerCase() === name.toLowerCase());
  return h?.value || "";
}

async function getGoogleToken(supabase: any, user_id: string): Promise<{ token: string; email: string } | null> {
  const { data: row } = await supabase.from("gmail_tokens").select("access_token, refresh_token, expires_at, email, scopes").eq("user_id", user_id).maybeSingle();
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
  return { token, email: row.email };
}

async function loadKnowledgeForBot(supabase: any, user_id: string, robotName: string): Promise<string> {
  const parts: string[] = [];

  // Soul
  const { data: soul } = await supabase.from("org_soul").select("*").eq("user_id", user_id).eq("active", true).maybeSingle();
  if (soul) {
    parts.push(`═══ ORG SOUL ═══`);
    if (soul.org_name) parts.push(`Organization: ${soul.org_name}`);
    if (soul.mission) parts.push(`Mission: ${soul.mission}`);
    if (soul.voice_principles?.length) parts.push(`Voice principles: ${soul.voice_principles.join("; ")}`);
    if (soul.things_we_dont_do?.length) parts.push(`Things we don't do: ${soul.things_we_dont_do.join("; ")}`);
  }

  // Style guide for email channel
  const { data: styleRules } = await supabase.from("style_guide")
    .select("rule_title, do_text, dont_text, example_good, example_bad, channel, importance")
    .eq("user_id", user_id).eq("active", true)
    .in("channel", ["email", "general"])
    .order("importance", { ascending: false })
    .limit(8);
  if (styleRules?.length) {
    parts.push(`\n═══ STYLE GUIDE ═══`);
    for (const r of styleRules) {
      const lines = [`[${r.channel}] ${r.rule_title}`];
      if (r.do_text) lines.push(`  DO: ${r.do_text}`);
      if (r.dont_text) lines.push(`  DON'T: ${r.dont_text}`);
      parts.push(lines.join("\n"));
    }
  }

  // Inbox-tagged memories (sender-specific preferences) + recent general memories
  const { data: inboxMems } = await supabase.from("memories")
    .select("title, content, category")
    .eq("user_id", user_id).eq("active", true)
    .contains("tags", ["inbox"])
    .order("importance", { ascending: false }).limit(5);
  const { data: recentMems } = await supabase.from("memories")
    .select("title, content, category")
    .eq("user_id", user_id).eq("active", true)
    .order("importance", { ascending: false }).limit(5);
  const seen = new Set();
  const allMems: any[] = [];
  for (const m of [...(inboxMems || []), ...(recentMems || [])]) {
    if (seen.has(m.title)) continue;
    seen.add(m.title); allMems.push(m);
    if (allMems.length >= 8) break;
  }
  if (allMems.length) {
    parts.push(`\n═══ MEMORIES ═══`);
    for (const m of allMems) parts.push(`[${m.category}] ${m.title}\n  ${m.content}`);
  }

  return parts.join("\n");
}

const VOICE_PROMPTS: Record<string, string> = {
  atlas: `You are Atlas — the strategic operator's voice. Your draft style:
- Terse and analytical. Cut to the point.
- Quantify when relevant. Frame decisions in tradeoffs.
- Slightly cooler tone — boardroom, not butler.
- Short paragraphs. No filler. No "I hope this finds you well."
- For investor/deal/client emails: direct, confident, fact-forward.
- 4-7 sentences typical. Trim ruthlessly.`,
  alfred: `You are Alfred — the polished butler's voice. Your draft style:
- Warm, anticipatory, calm. Quiet authority.
- Slightly more formal than Atlas. Smoother sentences.
- Surface helpful next steps without being pushy.
- A touch more relational warmth without being saccharine.
- 5-9 sentences typical. Cordial without padding.`,
};

async function generateDraft(opts: {
  bot: "atlas" | "alfred";
  knowledge: string;
  threadContext: string;
  triage: any;
  recipientName: string;
}): Promise<{ subject: string; body: string }> {
  const voicePrompt = VOICE_PROMPTS[opts.bot];
  const system = `${voicePrompt}

═══ KNOWLEDGE BASE ═══
${opts.knowledge}

═══ DRAFT INSTRUCTIONS ═══
Draft a reply email to the thread below. Match your voice signature.
- Use the recipient's first name only if you have it AND the relationship calls for it (skip for vendors/cold).
- Sign as "Javier" — not "Javier Suarez", not "Best regards", just "Javier" on its own line.
- Plain text only, no HTML.
- Do NOT begin with "Hi" + comma — use "Name —" or just dive in.
- Output ONLY a valid JSON object with exactly two keys: "subject" and "body".
- The body must be the email body itself, no commentary, no preamble.

═══ TRIAGE CONTEXT ═══
Atlas already triaged this thread as: ${opts.triage.category_name} / ${opts.triage.priority}.
Atlas's reasoning: "${opts.triage.reasoning || ""}"
Suggested action: ${opts.triage.suggested_action || "(none)"}`;

  const user = `Reply to this email thread:

═══ THREAD CONTEXT ═══
${opts.threadContext}

═══ END OF THREAD ═══

Draft a reply now. Output ONLY the JSON object.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Anthropic error (${opts.bot}): ${JSON.stringify(data).slice(0, 300)}`);

  const text = data.content?.[0]?.text || "";
  // Extract JSON from response
  let parsed;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("no JSON in response");
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error(`${opts.bot} draft was not valid JSON. Response: ${text.slice(0, 200)}`);
  }
  return {
    subject: String(parsed.subject || "").trim(),
    body: String(parsed.body || "").trim(),
  };
}

// ─── MAIN ────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { user_id, thread_id } = await req.json();
    if (!user_id || !thread_id) {
      return new Response(JSON.stringify({ error: "user_id and thread_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Load triage + Atlas/Alfred bots
    const { data: triage } = await supabase.from("inbox_triage")
      .select("*").eq("user_id", user_id).eq("gmail_thread_id", thread_id).maybeSingle();
    if (!triage) {
      return new Response(JSON.stringify({ error: "thread is not triaged" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cat } = await supabase.from("inbox_categories").select("name").eq("id", triage.user_override_category_id || triage.category_id).maybeSingle();
    const triageWithCat = { ...triage, priority: triage.user_override_priority || triage.priority, category_name: cat?.name || "?" };

    const { data: bots } = await supabase.from("robots")
      .select("id, name, personality")
      .eq("user_id", user_id).eq("status", "active")
      .in("name", ["Atlas", "Alfred"]);
    const atlasBot = bots?.find((b: any) => b.name === "Atlas");
    const alfredBot = bots?.find((b: any) => b.name === "Alfred");
    if (!atlasBot || !alfredBot) {
      return new Response(JSON.stringify({ error: "Atlas and Alfred robots both required for dual drafts" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Get Gmail token + thread content
    const tokenRes = await getGoogleToken(supabase, user_id);
    if (!tokenRes) {
      return new Response(JSON.stringify({ error: "Gmail not connected" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { token, email: fromEmail } = tokenRes;

    const tRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${thread_id}?format=full`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const tData = await tRes.json();
    if (!tRes.ok) {
      return new Response(JSON.stringify({ error: "could not fetch Gmail thread", details: tData }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const messages = tData.messages || [];
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg) {
      return new Response(JSON.stringify({ error: "thread has no messages" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const headers = lastMsg.payload?.headers || [];
    const replyTo = extractHeader(headers, "Reply-To") || extractHeader(headers, "From");
    const replySubject = extractHeader(headers, "Subject");
    const replySubjectFinal = replySubject.match(/^re:/i) ? replySubject : `Re: ${replySubject}`;
    const messageId = extractHeader(headers, "Message-ID");
    const recipientName = (() => {
      const m = (extractHeader(headers, "From") || "").match(/^"?([^"<]*?)"?\s*</);
      return m ? m[1].trim().split(" ")[0] : "";
    })();

    // Build full thread context as text
    const threadCtxLines: string[] = [];
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const h = m.payload?.headers || [];
      threadCtxLines.push(`--- Message ${i + 1} ---`);
      threadCtxLines.push(`From: ${extractHeader(h, "From")}`);
      threadCtxLines.push(`Subject: ${extractHeader(h, "Subject")}`);
      threadCtxLines.push(`Date: ${extractHeader(h, "Date")}`);
      threadCtxLines.push(``);
      threadCtxLines.push(extractPlainBody(m.payload).slice(0, 3000));
      threadCtxLines.push(``);
    }
    const threadContext = threadCtxLines.join("\n");

    // 3. Generate both drafts in parallel
    const [atlasKnowledge, alfredKnowledge] = await Promise.all([
      loadKnowledgeForBot(supabase, user_id, "Atlas"),
      loadKnowledgeForBot(supabase, user_id, "Alfred"),
    ]);

    const [atlasDraft, alfredDraft] = await Promise.all([
      generateDraft({ bot: "atlas", knowledge: atlasKnowledge, threadContext, triage: triageWithCat, recipientName }),
      generateDraft({ bot: "alfred", knowledge: alfredKnowledge, threadContext, triage: triageWithCat, recipientName }),
    ]);

    // 4. Create Gmail Drafts entries + robot_artifacts rows for each
    async function createGmailDraft(subject: string, body: string): Promise<string | null> {
      const headersArr = [
        `From: ${fromEmail}`,
        `To: ${replyTo}`,
        `Subject: ${subject}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/plain; charset=UTF-8`,
      ];
      if (messageId) {
        headersArr.push(`In-Reply-To: ${messageId}`);
        headersArr.push(`References: ${messageId}`);
      }
      const raw = btoa(unescape(encodeURIComponent(headersArr.join("\r\n") + `\r\n\r\n` + body)))
        .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      const dRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/drafts`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: { raw, threadId: thread_id } }),
      });
      if (!dRes.ok) {
        const e = await dRes.text();
        console.error("Gmail draft creation failed:", e);
        return null;
      }
      const dData = await dRes.json();
      return dData.id || null;
    }

    const draftsUrl = "https://mail.google.com/mail/u/0/#drafts";
    const [atlasGmailId, alfredGmailId] = await Promise.all([
      createGmailDraft(replySubjectFinal, atlasDraft.body),
      createGmailDraft(replySubjectFinal, alfredDraft.body),
    ]);

    const { data: atlasArt } = await supabase.from("robot_artifacts").insert({
      user_id, robot_id: atlasBot.id, artifact_type: "gmail_draft",
      title: `[Atlas] ${atlasDraft.subject || replySubjectFinal}`,
      summary: `To: ${replyTo}`,
      external_id: atlasGmailId, external_url: draftsUrl,
      payload: {
        to: replyTo, subject: atlasDraft.subject || replySubjectFinal, body: atlasDraft.body, is_html: false,
        gmail_thread_id: thread_id, source: "dual_draft", bot: "atlas",
      },
      status: "draft",
    }).select("id").single();

    const { data: alfredArt } = await supabase.from("robot_artifacts").insert({
      user_id, robot_id: alfredBot.id, artifact_type: "gmail_draft",
      title: `[Alfred] ${alfredDraft.subject || replySubjectFinal}`,
      summary: `To: ${replyTo}`,
      external_id: alfredGmailId, external_url: draftsUrl,
      payload: {
        to: replyTo, subject: alfredDraft.subject || replySubjectFinal, body: alfredDraft.body, is_html: false,
        gmail_thread_id: thread_id, source: "dual_draft", bot: "alfred",
      },
      status: "draft",
    }).select("id").single();

    // 5. Update triage row with both artifact IDs
    await supabase.from("inbox_triage").update({
      draft_atlas_artifact_id: atlasArt?.id || null,
      draft_alfred_artifact_id: alfredArt?.id || null,
      drafts_generated_at: new Date().toISOString(),
    }).eq("id", triage.id);

    // Log API usage
    await supabase.from("api_usage_log").insert({
      user_id, service: "anthropic", action: "draft_inbox_replies",
      tokens_in: 0, tokens_out: 0, cost_estimate: 0,
      metadata: {
        thread_id, triage_id: triage.id,
        category: triageWithCat.category_name,
        atlas_artifact_id: atlasArt?.id, alfred_artifact_id: alfredArt?.id,
        success: true, workspace: ANTHROPIC_WORKSPACE_LABEL,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      triage_id: triage.id,
      atlas: { artifact_id: atlasArt?.id, gmail_draft_id: atlasGmailId, body: atlasDraft.body, subject: atlasDraft.subject },
      alfred: { artifact_id: alfredArt?.id, gmail_draft_id: alfredGmailId, body: alfredDraft.body, subject: alfredDraft.subject },
      to: replyTo,
      subject: replySubjectFinal,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("draft-inbox-replies error:", err);
    return new Response(JSON.stringify({ error: "Server error", details: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
