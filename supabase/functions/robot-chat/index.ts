// robot-chat edge function v3 — agentic + knowledge base context
// Loads soul + relevant style + top memories + relevant exemplars into every prompt
// Adds search_memories and get_exemplars tools

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET");

const ROBOT_TASKS_LIST_ID = "10e446c8-b3b0-4c2d-b217-813dff3e9b06";

const QUO_LINES: Record<string, { id: string; number: string; label: string }> = {
  javier: { id: "PNlN4ZOAt1", number: "+18135445781", label: "🥷🏼 Javier Suarez" },
  assistant: { id: "PNCF7YPY2P", number: "+18132145768", label: "🤑 Administrator" },
  capital: { id: "PNEUrEiUK1", number: "+18137063898", label: "😎 Capital" },
  reap: { id: "PNcbag1oru", number: "+18136944125", label: "🧯 REAP Order Flow" },
  frontdesk: { id: "PNIAgUbTmk", number: "+18135318074", label: "🚌 Front Desk" },
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ─── Channel detection — what's the user about to need? ─────────────────
function detectChannels(message: string): string[] {
  const m = message.toLowerCase();
  const ch: string[] = ["general"];
  if (/\b(email|gmail|reply|inbox|cc |constant contact|campaign|newsletter)\b/.test(m)) ch.push("email");
  if (/\b(text|sms|quo|message them|opening line|texting|reply.*\d{3})\b/.test(m)) ch.push("sms");
  if (/\b(constant contact|cc draft|cc email|campaign|blast|newsletter)\b/.test(m)) ch.push("cc_campaign");
  return ch;
}

// ─── Knowledge base loader ──────────────────────────────────────────────
async function loadKnowledgeContext(supabase: any, user_id: string, message: string): Promise<string> {
  const channels = detectChannels(message);
  const parts: string[] = [];

  // 1. Soul (always loaded)
  const { data: soul } = await supabase.from("org_soul").select("*").eq("user_id", user_id).eq("active", true).maybeSingle();
  if (soul) {
    const valuesArr = Array.isArray(soul.values) ? soul.values : [];
    const voiceArr = Array.isArray(soul.voice_principles) ? soul.voice_principles : [];
    const dontsArr = Array.isArray(soul.things_we_dont_do) ? soul.things_we_dont_do : [];
    const precedentsArr = Array.isArray(soul.decision_precedents) ? soul.decision_precedents : [];

    parts.push(`═══ SOUL: ${soul.org_name || "Suarez Global"} ═══`);
    if (soul.mission) parts.push(`Mission: ${soul.mission}`);
    if (soul.vision) parts.push(`Vision: ${soul.vision}`);
    if (valuesArr.length) parts.push(`Values:\n${valuesArr.map((v: any) => `  • ${v.name}: ${v.description}`).join("\n")}`);
    if (voiceArr.length) parts.push(`Voice principles:\n${voiceArr.map((v: any) => `  • ${v.name}: ${v.description}`).join("\n")}`);
    if (dontsArr.length) parts.push(`Things we DON'T do:\n${dontsArr.map((d: any) => `  • ${d.text}`).join("\n")}`);
    if (precedentsArr.length) parts.push(`Decision precedents:\n${precedentsArr.map((p: any) => `  • ${p.name}: ${p.content}`).join("\n")}`);
  }

  // 2. Style guide — channels relevant + general — top 8 by importance
  const { data: styleRules } = await supabase
    .from("style_guide")
    .select("rule_title, do_text, dont_text, example_good, example_bad, channel, importance")
    .eq("user_id", user_id)
    .eq("active", true)
    .in("channel", channels)
    .order("importance", { ascending: false })
    .limit(8);
  if (styleRules?.length) {
    parts.push(`\n═══ STYLE GUIDE (relevant rules) ═══`);
    for (const r of styleRules) {
      const lines = [`[${r.channel}] ${r.rule_title}`];
      if (r.do_text) lines.push(`  DO: ${r.do_text}`);
      if (r.dont_text) lines.push(`  DON'T: ${r.dont_text}`);
      if (r.example_good) lines.push(`  ✓ ${r.example_good}`);
      if (r.example_bad) lines.push(`  ✗ ${r.example_bad}`);
      parts.push(lines.join("\n"));
    }
  }

  // 3. Memories — top 5 by importance + recency
  const { data: mems } = await supabase
    .from("memories")
    .select("title, content, category, importance")
    .eq("user_id", user_id)
    .eq("active", true)
    .order("importance", { ascending: false })
    .order("last_used_at", { ascending: false, nullsFirst: false })
    .limit(5);
  if (mems?.length) {
    parts.push(`\n═══ MEMORIES (top 5 — search for more with search_memories tool) ═══`);
    for (const m of mems) {
      parts.push(`[${m.category}] ${m.title}\n  ${m.content}`);
    }
  }

  // 4. Exemplars — surface a small sample for relevant channels
  const exChannels = channels.filter((c) => c !== "general");
  if (exChannels.length > 0) {
    const { data: exs } = await supabase
      .from("exemplars")
      .select("title, why_its_good, channel")
      .eq("user_id", user_id)
      .eq("active", true)
      .in("channel", exChannels)
      .order("importance", { ascending: false })
      .limit(4);
    if (exs?.length) {
      parts.push(`\n═══ EXEMPLARS available (use get_exemplars tool to retrieve full content) ═══`);
      for (const e of exs) {
        parts.push(`• [${e.channel}] "${e.title}"${e.why_its_good ? ` — ${e.why_its_good}` : ""}`);
      }
    }
  }

  return parts.join("\n");
}

// ─── TOOL DEFINITIONS ──────────────────────────────────────────────────────
const TOOLS = [
  // ─ Knowledge base tools (NEW) ─
  {
    name: "search_memories",
    description: "Search the user's memory database for relevant past situations, decisions, preferences, or context. Use BEFORE acting in any situation that might have precedent — replying to someone you've dealt with before, making a decision similar to a past one, etc.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free-text search across memory titles and content." },
        category: { type: "string", description: "Optional: filter by category (e.g. 'pricing', 'client', 'decision')." },
        limit: { type: "number", description: "Default 8, max 20." },
      },
      required: ["query"],
    },
  },
  {
    name: "get_exemplars",
    description: "Retrieve example artifacts (emails, texts, etc.) the user has saved as 'gold standard' references. Use BEFORE drafting anything substantive — match the style of past approved exemplars.",
    input_schema: {
      type: "object",
      properties: {
        channel: { type: "string", enum: ["email", "sms", "cc_campaign", "general", "all"], description: "Filter by channel." },
        tags: { type: "string", description: "Optional comma-separated tags to filter by (e.g. 'investor,follow-up')." },
        limit: { type: "number", description: "Default 3, max 6." },
      },
    },
  },

  // ─ Marketing ─
  {
    name: "create_cc_email_draft",
    description: "Create a draft email campaign in Constant Contact. Always pulls list_products_services and get_exemplars first if drafting product marketing.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        subject: { type: "string" },
        from_name: { type: "string" },
        from_email: { type: "string" },
        reply_to_email: { type: "string" },
        html_content: { type: "string", description: "Polished HTML branded with Suarez Global colors. Include [[trackingImage]] and [[UnsubscribeLink]]." },
        preview_text: { type: "string" },
      },
      required: ["name", "subject", "html_content"],
    },
  },
  // ─ Gmail ─
  {
    name: "create_gmail_draft",
    description: "Create a draft email in Gmail.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "string" },
        cc: { type: "string" },
        subject: { type: "string" },
        body: { type: "string" },
        is_html: { type: "boolean" },
      },
      required: ["to", "subject", "body"],
    },
  },
  // ─ Quo ─
  {
    name: "draft_quo_text",
    description: "Draft a Quo/OpenPhone text. Saved as draft; user reviews and sends. 'javier' = personal voice, 'assistant' = formal voice.",
    input_schema: {
      type: "object",
      properties: {
        persona: { type: "string", enum: ["javier", "assistant", "capital", "reap", "frontdesk"] },
        to_number: { type: "string" },
        body: { type: "string" },
        context: { type: "string" },
      },
      required: ["to_number", "body"],
    },
  },
  // ─ Tasks ─
  {
    name: "assign_task",
    description: "Create a task assigned to a robot.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        priority: { type: "string", enum: ["urgent", "high", "normal", "low"] },
        due_date: { type: "string" },
        assigned_robot_id: { type: "string" },
      },
      required: ["name", "description"],
    },
  },
  // ─ Contacts / catalog ─
  {
    name: "query_contacts",
    description: "Search contacts.",
    input_schema: { type: "object", properties: { search: { type: "string" }, limit: { type: "number" } } },
  },
  {
    name: "list_products_services",
    description: "List products/services. Call BEFORE drafting marketing copy.",
    input_schema: { type: "object", properties: { type: { type: "string", enum: ["product", "service", "all"] } } },
  },
  // ─ Pipeline ─
  {
    name: "query_pipeline_deals",
    description: "Query the sales pipeline.",
    input_schema: {
      type: "object",
      properties: {
        stage: { type: "string", enum: ["lead", "qualified", "proposal", "negotiation", "won", "lost", "all"] },
        business_id: { type: "string" },
        search: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "add_pipeline_deal",
    description: "Add a deal to the pipeline.",
    input_schema: {
      type: "object",
      properties: {
        deal_name: { type: "string" }, business_id: { type: "string" },
        stage: { type: "string", enum: ["lead", "qualified", "proposal", "negotiation", "won", "lost"] },
        contact_name: { type: "string" }, contact_email: { type: "string" }, contact_phone: { type: "string" },
        company: { type: "string" }, value: { type: "number" }, probability: { type: "number" },
        expected_close_date: { type: "string" }, source: { type: "string" }, notes: { type: "string" },
      },
      required: ["deal_name"],
    },
  },
  {
    name: "update_deal_stage",
    description: "Update a deal's stage.",
    input_schema: {
      type: "object",
      properties: {
        deal_id: { type: "string" },
        new_stage: { type: "string", enum: ["lead", "qualified", "proposal", "negotiation", "won", "lost"] },
        note: { type: "string" },
      },
      required: ["deal_id", "new_stage"],
    },
  },
  // ─ Calendar ─
  {
    name: "query_calendar_events",
    description: "Look up calendar events.",
    input_schema: { type: "object", properties: { start_date: { type: "string" }, end_date: { type: "string" } } },
  },
  {
    name: "create_calendar_event",
    description: "Create a calendar event.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" }, event_date: { type: "string" },
        start_time: { type: "string" }, end_time: { type: "string" },
        description: { type: "string" }, category: { type: "string" }, color: { type: "string" },
      },
      required: ["title", "event_date"],
    },
  },
  // ─ Finance ─
  {
    name: "query_transactions",
    description: "Search transactions.",
    input_schema: {
      type: "object",
      properties: {
        start_date: { type: "string" }, end_date: { type: "string" },
        category: { type: "string" }, search: { type: "string" },
        type: { type: "string", enum: ["income", "expense", "all"] },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "get_financial_summary",
    description: "Income/expense summary with category breakdown.",
    input_schema: { type: "object", properties: { start_date: { type: "string" }, end_date: { type: "string" } } },
  },
  {
    name: "query_accounts",
    description: "List accounts with balances.",
    input_schema: { type: "object", properties: { active_only: { type: "boolean" } } },
  },
];

// ─── TOOL EXECUTION ────────────────────────────────────────────────────────
async function executeTool(name: string, input: any, ctx: any): Promise<{ result: string; artifact?: any }> {
  try {
    switch (name) {
      case "search_memories": return await searchMemories(input, ctx);
      case "get_exemplars": return await getExemplars(input, ctx);
      case "create_cc_email_draft": return await createCCDraft(input, ctx);
      case "create_gmail_draft": return await createGmailDraft(input, ctx);
      case "draft_quo_text": return await draftQuoText(input, ctx);
      case "assign_task": return await assignTask(input, ctx);
      case "query_contacts": return await queryContacts(input, ctx);
      case "list_products_services": return await listProducts(input, ctx);
      case "query_pipeline_deals": return await queryPipeline(input, ctx);
      case "add_pipeline_deal": return await addDeal(input, ctx);
      case "update_deal_stage": return await updateDealStage(input, ctx);
      case "query_calendar_events": return await queryCalendar(input, ctx);
      case "create_calendar_event": return await createCalendarEvent(input, ctx);
      case "query_transactions": return await queryTransactions(input, ctx);
      case "get_financial_summary": return await getFinancialSummary(input, ctx);
      case "query_accounts": return await queryAccounts(input, ctx);
      default: return { result: `Error: unknown tool '${name}'` };
    }
  } catch (err) {
    return { result: `Tool error: ${err.message || err}` };
  }
}

// ─── KNOWLEDGE BASE TOOLS ──────────────────────────────────────────────────
async function searchMemories(input: any, ctx: any) {
  const limit = Math.min(input.limit || 8, 20);
  let q = ctx.supabase.from("memories").select("id, title, content, category, importance, tags, use_count").eq("user_id", ctx.user_id).eq("active", true).order("importance", { ascending: false }).limit(limit);
  if (input.category) q = q.eq("category", input.category);

  // Improved search: split query into significant terms, OR-match each across title+content
  if (input.query) {
    const terms = String(input.query).toLowerCase().split(/\s+/).filter((t) => t.length >= 3);
    if (terms.length > 0) {
      const orParts: string[] = [];
      for (const t of terms) {
        const safe = t.replace(/[%,()]/g, ""); // sanitize
        if (safe) {
          orParts.push(`title.ilike.%${safe}%`);
          orParts.push(`content.ilike.%${safe}%`);
        }
      }
      if (orParts.length) q = q.or(orParts.join(","));
    }
  }
  const { data, error } = await q;
  if (error) return { result: `Error: ${error.message}` };
  if (!data?.length) return { result: `No memories matching "${input.query || "(any)"}".` };

  // Track usage — increment use_count per memory
  for (const m of data) {
    await ctx.supabase.from("memories").update({ last_used_at: new Date().toISOString(), use_count: (m.use_count || 0) + 1 }).eq("id", m.id);
  }

  return { result: data.map((m: any) => `[${m.category}] ${m.title}\n  ${m.content}${(m.tags && m.tags.length) ? `\n  tags: ${(Array.isArray(m.tags) ? m.tags : []).join(", ")}` : ""}`).join("\n\n") };
}

async function getExemplars(input: any, ctx: any) {
  const limit = Math.min(input.limit || 3, 6);
  let q = ctx.supabase.from("exemplars").select("id, title, why_its_good, content, content_html, channel, tags, use_count").eq("user_id", ctx.user_id).eq("active", true).order("importance", { ascending: false }).limit(limit);
  const channel = input.channel || "all";
  if (channel !== "all") q = q.eq("channel", channel);
  const { data, error } = await q;
  if (error) return { result: `Error: ${error.message}` };
  if (!data?.length) return { result: "No exemplars saved for this channel yet." };

  // Filter by tags if provided
  let results = data;
  if (input.tags) {
    const wantTags = input.tags.split(",").map((t: string) => t.trim().toLowerCase());
    results = results.filter((e: any) => {
      const ts = (Array.isArray(e.tags) ? e.tags : []).map((t: string) => String(t).toLowerCase());
      return wantTags.some((wt: string) => ts.includes(wt));
    });
  }
  if (!results.length) return { result: "No exemplars match those tags." };

  // Mark used (last_used_at + increment use_count)
  for (const e of results) {
    await ctx.supabase.from("exemplars").update({ last_used_at: new Date().toISOString(), use_count: (e.use_count || 0) + 1 }).eq("id", e.id);
  }

  return { result: results.map((e: any) => `═══ EXEMPLAR: "${e.title}" [${e.channel}] ═══${e.why_its_good ? `\nWhy this is good: ${e.why_its_good}` : ""}\n--- CONTENT ---\n${e.content_html || e.content}`).join("\n\n") };
}

// ─── CC ────────────────────────────────────────────────────────────────────
async function createCCDraft(input: any, ctx: any) {
  const { data: tokenRow } = await ctx.supabase.from("cc_tokens").select("access_token, refresh_token, expires_at").eq("user_id", ctx.user_id).maybeSingle();
  if (!tokenRow?.access_token) return { result: "Error: Constant Contact not connected." };

  let accessToken = tokenRow.access_token;
  if (tokenRow.expires_at && new Date(tokenRow.expires_at) <= new Date()) {
    const ccApiKey = Deno.env.get("CC_API_KEY");
    const ccSecret = Deno.env.get("CC_SECRET");
    const refreshRes = await fetch("https://authz.constantcontact.com/oauth2/default/v1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: "Basic " + btoa(`${ccApiKey}:${ccSecret}`) },
      body: `refresh_token=${tokenRow.refresh_token}&grant_type=refresh_token`,
    });
    const rd = await refreshRes.json();
    if (rd.access_token) {
      accessToken = rd.access_token;
      await ctx.supabase.from("cc_tokens").update({ access_token: rd.access_token, refresh_token: rd.refresh_token || tokenRow.refresh_token, expires_at: new Date(Date.now() + (rd.expires_in || 86400) * 1000).toISOString() }).eq("user_id", ctx.user_id);
    } else return { result: "Error: CC token refresh failed." };
  }

  const fromName = input.from_name || "Suarez Global";
  const fromEmail = input.from_email || "javier@thesuarezcapital.com";
  const replyTo = input.reply_to_email || fromEmail;

  const res = await fetch("https://api.cc.email/v3/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      name: input.name,
      email_campaign_activities: [{
        format_type: 5, from_name: fromName, from_email: fromEmail, reply_to_email: replyTo,
        subject: input.subject, preheader: input.preview_text || "", html_content: input.html_content,
        physical_address_in_footer: { address_line1: "Suarez Global", city: "Tampa", state_code: "FL", country_code: "US", postal_code: "33601", organization_name: "Suarez Global" },
      }],
    }),
  });
  const data = await res.json();
  if (!res.ok) return { result: `Error: ${res.status} — ${JSON.stringify(data).slice(0, 500)}` };
  const campaignId = data.campaign_id || data.id;
  const adminUrl = `https://app.constantcontact.com/pages/campaigns/email-details/${campaignId}`;
  await ctx.supabase.from("robot_artifacts").insert({
    user_id: ctx.user_id, robot_id: ctx.robot_id, artifact_type: "cc_email_draft",
    title: input.name, summary: `Subject: ${input.subject}`, external_id: campaignId, external_url: adminUrl,
    payload: { subject: input.subject, from_name: fromName, from_email: fromEmail, preview_text: input.preview_text || "", html_content: input.html_content }, status: "draft",
  });
  return { result: `✓ CC draft "${input.name}" created. Review at ${adminUrl}`, artifact: { type: "cc_email_draft", title: input.name, url: adminUrl, id: campaignId } };
}

// ─── GMAIL ─────────────────────────────────────────────────────────────────
async function createGmailDraft(input: any, ctx: any) {
  const { data: tokenRow } = await ctx.supabase.from("gmail_tokens").select("access_token, refresh_token, expires_at, email").eq("user_id", ctx.user_id).maybeSingle();
  if (!tokenRow?.access_token) return { result: "Error: Gmail not connected." };

  let accessToken = tokenRow.access_token;
  if (tokenRow.expires_at && new Date(tokenRow.expires_at) <= new Date()) {
    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `client_id=${GOOGLE_CLIENT_ID}&client_secret=${GOOGLE_CLIENT_SECRET}&refresh_token=${tokenRow.refresh_token}&grant_type=refresh_token`,
    });
    const rd = await refreshRes.json();
    if (rd.access_token) {
      accessToken = rd.access_token;
      await ctx.supabase.from("gmail_tokens").update({ access_token: rd.access_token, expires_at: new Date(Date.now() + (rd.expires_in || 3600) * 1000).toISOString() }).eq("user_id", ctx.user_id);
    } else return { result: "Error: Gmail refresh failed." };
  }

  const fromEmail = tokenRow.email;
  const headers = [
    `From: ${fromEmail}`, `To: ${input.to}`,
    input.cc ? `Cc: ${input.cc}` : "",
    `Subject: ${input.subject}`, `MIME-Version: 1.0`,
    `Content-Type: text/${input.is_html ? "html" : "plain"}; charset=utf-8`,
  ].filter(Boolean).join("\r\n");
  const rawMessage = `${headers}\r\n\r\n${input.body}`;
  const encoded = btoa(unescape(encodeURIComponent(rawMessage))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ message: { raw: encoded } }),
  });
  const data = await res.json();
  if (!res.ok) return { result: `Error: ${res.status} — ${JSON.stringify(data).slice(0, 500)}` };

  const draftId = data.id;
  const draftsUrl = `https://mail.google.com/mail/u/0/#drafts`;
  await ctx.supabase.from("robot_artifacts").insert({
    user_id: ctx.user_id, robot_id: ctx.robot_id, artifact_type: "gmail_draft",
    title: input.subject, summary: `To: ${input.to}`, external_id: draftId, external_url: draftsUrl,
    payload: { to: input.to, cc: input.cc || null, subject: input.subject, body: input.body, is_html: !!input.is_html }, status: "draft",
  });
  return { result: `✓ Gmail draft saved. Review at ${draftsUrl}`, artifact: { type: "gmail_draft", title: input.subject, url: draftsUrl, id: draftId } };
}

// ─── QUO ───────────────────────────────────────────────────────────────────
function normalizePhone(p: string): string {
  const digits = (p || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (p.startsWith("+")) return p;
  return `+${digits}`;
}

async function draftQuoText(input: any, ctx: any) {
  const persona = input.persona || "assistant";
  const line = QUO_LINES[persona];
  if (!line) return { result: `Error: unknown persona '${persona}'.` };
  const toNumber = normalizePhone(input.to_number);
  if (!/^\+\d{10,15}$/.test(toNumber)) return { result: `Error: invalid phone '${input.to_number}'.` };

  const { data: art } = await ctx.supabase.from("robot_artifacts").insert({
    user_id: ctx.user_id, robot_id: ctx.robot_id, artifact_type: "quo_text_draft",
    title: `Text to ${toNumber}`, summary: input.body.slice(0, 100),
    payload: {
      from_phone_id: line.id, from_number: line.number, from_label: line.label,
      to_number: toNumber, body: input.body, persona, context: input.context || null,
    }, status: "draft",
  }).select().single();
  return { result: `✓ Quo text draft saved (from ${line.label} → ${toNumber}). User must click Send in Drafts pane.`, artifact: { type: "quo_text_draft", title: `Text to ${toNumber}`, id: art?.id } };
}

// ─── TASKS ─────────────────────────────────────────────────────────────────
async function assignTask(input: any, ctx: any) {
  const robotId = input.assigned_robot_id || ctx.robot_id;
  const { data, error } = await ctx.supabase.from("cu_tasks").insert({
    user_id: ctx.user_id, list_id: ROBOT_TASKS_LIST_ID,
    name: input.name, description: input.description,
    priority: input.priority || "normal", due_date: input.due_date || null,
    status: "open", progress: 0, assigned_robot_id: robotId, created_by_robot_id: ctx.robot_id,
  }).select().single();
  if (error) return { result: `Error: ${error.message}` };
  const { data: r } = await ctx.supabase.from("robots").select("name").eq("id", robotId).single();
  return { result: `✓ Task "${data.name}" assigned to ${r?.name || "robot"}.`, artifact: { type: "task", title: data.name, id: data.id } };
}

// ─── CONTACTS / PRODUCTS ──────────────────────────────────────────────────
async function queryContacts(input: any, ctx: any) {
  const limit = Math.min(input.limit || 25, 50);
  let q = ctx.supabase.from("contacts").select("id, name, email, phone, company").eq("user_id", ctx.user_id).limit(limit);
  if (input.search) q = q.or(`name.ilike.%${input.search}%,email.ilike.%${input.search}%,company.ilike.%${input.search}%`);
  const { data, error } = await q;
  if (error) return { result: `Error: ${error.message}` };
  if (!data?.length) return { result: "No matching contacts." };
  return { result: `Found ${data.length} contact(s):\n${data.map((c: any) => `- ${c.name}${c.email ? ` (${c.email})` : ""}${c.phone ? ` ${c.phone}` : ""}${c.company ? ` — ${c.company}` : ""}`).join("\n")}` };
}

async function listProducts(input: any, ctx: any) {
  let q = ctx.supabase.from("products_services").select("name, type, description, price, price_type, features, category").eq("user_id", ctx.user_id);
  if (input.type && input.type !== "all") q = q.eq("type", input.type);
  const { data, error } = await q;
  if (error) return { result: `Error: ${error.message}` };
  if (!data?.length) return { result: "No products/services in catalog." };
  return {
    result: data.map((p: any) => {
      const features = Array.isArray(p.features) ? p.features : (typeof p.features === "string" ? JSON.parse(p.features || "[]") : []);
      return `${p.type === "product" ? "📦" : "⚡"} ${p.name}${p.category ? ` [${p.category}]` : ""}\n  ${p.description || ""}\n  ${p.price ? `$${p.price} ${p.price_type || ""}` : ""}\n  Features: ${features.join(", ") || "none"}`;
    }).join("\n\n"),
  };
}

// ─── PIPELINE ──────────────────────────────────────────────────────────────
async function queryPipeline(input: any, ctx: any) {
  const limit = Math.min(input.limit || 25, 100);
  let q = ctx.supabase.from("sales_pipeline").select("id, deal_name, stage, value, probability, expected_close_date, contact_name, contact_email, company, business_id, source, notes").eq("user_id", ctx.user_id).limit(limit).order("created_at", { ascending: false });
  const stage = input.stage || "all";
  if (stage === "all") q = q.not("stage", "in", "(won,lost)");
  else q = q.eq("stage", stage);
  if (input.business_id) q = q.eq("business_id", input.business_id);
  if (input.search) q = q.or(`deal_name.ilike.%${input.search}%,contact_name.ilike.%${input.search}%,company.ilike.%${input.search}%`);
  const { data, error } = await q;
  if (error) return { result: `Error: ${error.message}` };
  if (!data?.length) return { result: "No matching deals." };
  const bizIds = [...new Set(data.map((d: any) => d.business_id).filter(Boolean))];
  const { data: bizData } = bizIds.length ? await ctx.supabase.from("businesses").select("id, name").in("id", bizIds) : { data: [] };
  const bizMap: any = {};
  (bizData || []).forEach((b: any) => { bizMap[b.id] = b.name; });
  const total = data.reduce((s: number, d: any) => s + Number(d.value || 0), 0);
  const lines = data.map((d: any) =>
    `[${d.id}] "${d.deal_name}" (${d.stage}) — $${Number(d.value || 0).toLocaleString()} · ${d.probability || 0}%${d.business_id ? ` · for ${bizMap[d.business_id] || "?"}` : ""}${d.contact_name ? ` · ${d.contact_name}` : ""}${d.expected_close_date ? ` · close ${d.expected_close_date}` : ""}`
  );
  return { result: `${data.length} deal(s) totaling $${total.toLocaleString()}:\n${lines.join("\n")}` };
}

async function addDeal(input: any, ctx: any) {
  const { data, error } = await ctx.supabase.from("sales_pipeline").insert({
    user_id: ctx.user_id, deal_name: input.deal_name, business_id: input.business_id || null,
    stage: input.stage || "lead", contact_name: input.contact_name || null, contact_email: input.contact_email || null,
    contact_phone: input.contact_phone || null, company: input.company || null,
    value: input.value || 0, probability: input.probability || 0,
    expected_close_date: input.expected_close_date || null, source: input.source || null, notes: input.notes || null,
  }).select().single();
  if (error) return { result: `Error: ${error.message}` };
  return { result: `✓ Deal "${data.deal_name}" added.`, artifact: { type: "pipeline_deal", title: data.deal_name, id: data.id } };
}

async function updateDealStage(input: any, ctx: any) {
  const updates: any = { stage: input.new_stage, updated_at: new Date().toISOString() };
  if (input.note) {
    const { data: cur } = await ctx.supabase.from("sales_pipeline").select("notes").eq("id", input.deal_id).single();
    const ts = new Date().toLocaleDateString();
    updates.notes = (cur?.notes ? cur.notes + "\n" : "") + `[${ts}] ${input.note}`;
  }
  const { data, error } = await ctx.supabase.from("sales_pipeline").update(updates).eq("id", input.deal_id).eq("user_id", ctx.user_id).select().single();
  if (error) return { result: `Error: ${error.message}` };
  if (!data) return { result: "Deal not found." };
  return { result: `✓ Deal "${data.deal_name}" → ${data.stage}.` };
}

// ─── CALENDAR ──────────────────────────────────────────────────────────────
async function queryCalendar(input: any, ctx: any) {
  const today = new Date().toISOString().slice(0, 10);
  const start = input.start_date || today;
  const end = input.end_date || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);
  const { data, error } = await ctx.supabase.from("calendar_events").select("title, event_date, start_time, end_time, description, category").eq("user_id", ctx.user_id).gte("event_date", start).lte("event_date", end).order("event_date", { ascending: true });
  if (error) return { result: `Error: ${error.message}` };
  if (!data?.length) return { result: `No events ${start} to ${end}.` };
  return { result: `Events ${start} to ${end}:\n${data.map((e: any) => `• ${e.event_date}${e.start_time ? ` ${e.start_time}` : ""} — ${e.title}${e.category ? ` [${e.category}]` : ""}${e.description ? `\n   ${e.description}` : ""}`).join("\n")}` };
}

async function createCalendarEvent(input: any, ctx: any) {
  const { data, error } = await ctx.supabase.from("calendar_events").insert({
    user_id: ctx.user_id, title: input.title, event_date: input.event_date,
    start_time: input.start_time || null, end_time: input.end_time || null,
    description: input.description || null, category: input.category || null, color: input.color || "#1C3820",
  }).select().single();
  if (error) return { result: `Error: ${error.message}` };
  return { result: `✓ Event "${data.title}" scheduled for ${data.event_date}.`, artifact: { type: "calendar_event", title: data.title, id: data.id } };
}

// ─── FINANCE ──────────────────────────────────────────────────────────────
async function queryTransactions(input: any, ctx: any) {
  const limit = Math.min(input.limit || 50, 200);
  const end = input.end_date || new Date().toISOString().slice(0, 10);
  const start = input.start_date || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  let q = ctx.supabase.from("transactions").select("date, description, amount, type, category").eq("user_id", ctx.user_id).gte("date", start).lte("date", end).order("date", { ascending: false }).limit(limit);
  if (input.category) q = q.eq("category", input.category);
  if (input.type && input.type !== "all") q = q.eq("type", input.type);
  if (input.search) q = q.ilike("description", `%${input.search}%`);
  const { data, error } = await q;
  if (error) return { result: `Error: ${error.message}` };
  if (!data?.length) return { result: `No transactions ${start} to ${end}.` };
  const total = data.reduce((s: number, t: any) => s + Number(t.amount || 0), 0);
  return { result: `${data.length} transaction(s), total $${total.toLocaleString()}:\n${data.slice(0, 50).map((t: any) => `${t.date} · ${t.type} · $${Number(t.amount || 0).toLocaleString()} · ${t.category || "—"} · ${t.description || ""}`).join("\n")}${data.length > 50 ? `\n...and ${data.length - 50} more` : ""}` };
}

async function getFinancialSummary(input: any, ctx: any) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const start = input.start_date || monthStart;
  const end = input.end_date || today.toISOString().slice(0, 10);
  const { data, error } = await ctx.supabase.from("transactions").select("type, category, amount").eq("user_id", ctx.user_id).gte("date", start).lte("date", end);
  if (error) return { result: `Error: ${error.message}` };
  if (!data?.length) return { result: `No transactions ${start} to ${end}.` };
  let income = 0, expense = 0;
  const byCat: Record<string, number> = {};
  for (const t of data) {
    const amt = Number(t.amount || 0);
    if (t.type === "income") income += amt;
    else if (t.type === "expense") {
      expense += amt;
      byCat[t.category || "Uncategorized"] = (byCat[t.category || "Uncategorized"] || 0) + amt;
    }
  }
  const topCats = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, v]) => `  ${c}: $${v.toLocaleString()}`).join("\n");
  return { result: `Summary ${start} to ${end}:\nIncome: $${income.toLocaleString()}\nExpenses: $${expense.toLocaleString()}\nNet: $${(income - expense).toLocaleString()}\n\nTop categories:\n${topCats}` };
}

async function queryAccounts(input: any, ctx: any) {
  let q = ctx.supabase.from("accounts").select("name, type, institution, current_balance, credit_limit, active").eq("user_id", ctx.user_id);
  if (input.active_only !== false) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) return { result: `Error: ${error.message}` };
  if (!data?.length) return { result: "No accounts." };
  const total = data.reduce((s: number, a: any) => s + Number(a.current_balance || 0), 0);
  return { result: `${data.length} account(s), total $${total.toLocaleString()}:\n${data.map((a: any) => `• ${a.name} (${a.type}${a.institution ? `, ${a.institution}` : ""}) — $${Number(a.current_balance || 0).toLocaleString()}${a.credit_limit ? ` of $${Number(a.credit_limit).toLocaleString()}` : ""}`).join("\n")}` };
}

// ─── MAIN ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { robot_id, user_id, message, history = [] } = await req.json();
    if (!robot_id || !user_id || !message) {
      return new Response(JSON.stringify({ error: "robot_id, user_id, and message are required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: robot, error: robotErr } = await supabase.from("robots").select("id, name, role, description, system_prompt, model, personality").eq("id", robot_id).single();
    if (robotErr || !robot) return new Response(JSON.stringify({ error: "Robot not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: businesses } = await supabase.from("businesses").select("id, name").eq("user_id", user_id).eq("active", true);
    const bizContext = (businesses || []).map((b: any) => `  - ${b.name} (id: ${b.id})`).join("\n");
    const today = new Date().toISOString().slice(0, 10);

    // Load knowledge base context
    const knowledgeBlock = await loadKnowledgeContext(supabase, user_id, message);

    const systemPrompt = `You are ${robot.name}, a ${robot.role || "assistant"} working at Suarez Global.

${robot.personality ? `═══ YOUR PERSONALITY ═══\n${robot.personality}\n` : ""}
${robot.description ? `Role: ${robot.description}\n` : ""}
${robot.system_prompt ? `Additional instructions: ${robot.system_prompt}\n` : ""}

${knowledgeBlock}

═══ CONTEXT ═══
Today's date: ${today}.
The user (Javier) owns these businesses (use these IDs when adding pipeline deals):
${bizContext || "  (none configured)"}

═══ OPERATING RULES ═══
- DRAFT-ONLY for outbound communication: Constant Contact emails, Gmail emails, and Quo texts are ALWAYS created as drafts. Never imply you sent something — say "drafted for your review."
- Be concise. After completing actions, give a one-line summary, not a long explanation.
- BEFORE drafting marketing copy: call list_products_services to get accurate product details.
- BEFORE drafting anything substantive (email, SMS, marketing copy): call get_exemplars to match the user's saved style references.
- BEFORE acting in any situation that might have precedent: call search_memories.
- For Quo texts: 'javier' = personal voice (his line). 'assistant' = formal/admin voice. Default to 'assistant' unless context calls for personal.
- Honor the SOUL, STYLE GUIDE, and MEMORIES above. They represent how Javier and the Suarez Global team operate. Match the voice. Follow the rules. When in doubt, lean toward what the soul implies.

You're not a generic AI. You're a member of this team. Act like it.`;

    const messages = [...history, { role: "user", content: message }];
    const toolCalls: any[] = [];
    const artifacts: any[] = [];
    let finalText = "";
    let iterations = 0;
    const MAX_ITERATIONS = 12;

    while (iterations < MAX_ITERATIONS) {
      iterations++;
      const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: robot.model || "claude-sonnet-4-5", max_tokens: 4096, system: systemPrompt, tools: TOOLS, messages }),
      });
      const apiData = await apiRes.json();
      if (!apiRes.ok) return new Response(JSON.stringify({ error: "Anthropic API error", details: apiData }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      messages.push({ role: "assistant", content: apiData.content });

      if (apiData.stop_reason === "end_turn") {
        finalText = apiData.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
        break;
      }

      if (apiData.stop_reason === "tool_use") {
        const toolUseBlocks = apiData.content.filter((b: any) => b.type === "tool_use");
        const toolResults = [];
        for (const tu of toolUseBlocks) {
          const exec = await executeTool(tu.name, tu.input, { user_id, robot_id, supabase });
          toolCalls.push({ tool: tu.name, input: tu.input, result: exec.result });
          if (exec.artifact) artifacts.push(exec.artifact);
          toolResults.push({ type: "tool_result", tool_use_id: tu.id, content: exec.result });
        }
        messages.push({ role: "user", content: toolResults });
        continue;
      }
      finalText = apiData.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
      break;
    }

    const channelType = "workspace";
    const { data: existingConv } = await supabase.from("robot_conversations").select("id, messages").eq("user_id", user_id).eq("robot_id", robot_id).eq("channel_type", channelType).maybeSingle();
    const newLog = { timestamp: new Date().toISOString(), user_message: message, assistant_response: finalText, tool_calls: toolCalls, artifacts };

    let conversationId;
    if (existingConv) {
      const existingMessages = Array.isArray(existingConv.messages) ? existingConv.messages : [];
      conversationId = existingConv.id;
      await supabase.from("robot_conversations").update({ messages: [...existingMessages, newLog], updated_at: new Date().toISOString() }).eq("id", existingConv.id);
    } else {
      const { data: newConv } = await supabase.from("robot_conversations").insert({ user_id, robot_id, channel_type: channelType, messages: [newLog], status: "active" }).select("id").single();
      conversationId = newConv?.id;
    }

    return new Response(JSON.stringify({ response: finalText, tool_calls: toolCalls, artifacts, conversation_id: conversationId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error", details: err.message || String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
