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
  // ─ Brand Audit ─
  {
    name: "save_brand_audit",
    description: "Save a completed weekly brand audit report. Call this AFTER you've run web searches, analyzed findings, and built up the full structured analysis. Creates a brand_audit_report artifact the user can review in Reports.",
    input_schema: {
      type: "object",
      properties: {
        audit_date: { type: "string", description: "YYYY-MM-DD. Default: today." },
        overall_score: { type: "number", description: "1-10 brand strength score using rubric: 1-3 minimal/scattered, 4-5 some presence but inconsistent, 6-7 solid consistent narrative, 8-9 strong institutional multi-channel, 10 dominant/polished/undeniable." },
        score_rationale: { type: "string", description: "2-3 sentences explaining the score with specifics." },
        top_wins: {
          type: "array",
          description: "3 strongest brand wins. Each has title (short headline), detail (1-2 sentences with specifics), evidence_url (where you saw this).",
          items: { type: "object", properties: { title: { type: "string" }, detail: { type: "string" }, evidence_url: { type: "string" } }, required: ["title", "detail"] },
        },
        top_issues: {
          type: "array",
          description: "3 most critical issues, tied to investor trust / capital conversion / institutional credibility. Severity: high/medium/low.",
          items: { type: "object", properties: { title: { type: "string" }, detail: { type: "string" }, severity: { type: "string", enum: ["high", "medium", "low"] }, evidence_url: { type: "string" } }, required: ["title", "detail", "severity"] },
        },
        immediate_actions: {
          type: "array",
          description: "Top 5 prioritized actions for the next 7 days. Specific, executable, ordered by priority (1 = most urgent).",
          items: { type: "object", properties: { priority: { type: "number" }, action: { type: "string" }, owner: { type: "string" } }, required: ["priority", "action"] },
        },
        whats_missing: {
          type: "array",
          description: "Items that should exist but don't (pages, press footprint, schema, bios, listings, etc.).",
          items: { type: "object", properties: { item: { type: "string" }, impact: { type: "string" } }, required: ["item", "impact"] },
        },
        risks: {
          type: "array",
          description: "Risks that reduce investor trust. Optional mitigation if obvious.",
          items: { type: "object", properties: { risk: { type: "string" }, mitigation: { type: "string" } }, required: ["risk"] },
        },
        query_findings: {
          type: "array",
          description: "Per-query findings from your web searches. One entry per query.",
          items: { type: "object", properties: { query: { type: "string" }, summary: { type: "string" }, notable_urls: { type: "array", items: { type: "string" } } }, required: ["query", "summary"] },
        },
      },
      required: ["overall_score", "score_rationale", "top_wins", "top_issues", "immediate_actions"],
    },
  },
  {
    name: "clip_long_video",
    description: "Generate clips/polished video from a source. YouTube URL → multi-clip extraction (Magic Clips). Direct file URL → single polished captioned video. Async — appears as 'queued' artifact; real result arrives via webhook in 5-15 min. ALL OPTIONS BELOW are optional — when not specified, Studio defaults are used (configurable in Knowledge Base → Studio Defaults). Per-call values override defaults.",
    input_schema: {
      type: "object",
      properties: {
        source_url: { type: "string", description: "Public URL to the source video. Either a YouTube URL or a Supabase Storage signed URL from an uploaded file." },
        title: { type: "string", description: "Project title (1-100 chars). Visible to user in Studio." },
        template: { type: "string", description: "Override caption template. Examples: 'Hormozi 2' (bold yellow), 'Sara' (default polished), 'Beast', 'Devin'. Omit to use Studio default." },
        min_clip_length: { type: "number", description: "YouTube only. Override min seconds per clip. Default from Studio settings (15)." },
        max_clip_length: { type: "number", description: "YouTube only. Override max seconds per clip. Default from Studio settings (60)." },
        language: { type: "string", description: "Override language code. Default 'en' or Studio setting." },
        magic_zooms: { type: "boolean", description: "Override magic zooms toggle. Auto-zoom on emphasis points." },
        magic_brolls: { type: "boolean", description: "Override magic B-rolls toggle. Auto-insert relevant B-roll." },
        magic_zooms_percentage: { type: "number", description: "0-100 zoom intensity. Default 50." },
        magic_brolls_percentage: { type: "number", description: "0-100 B-roll density. Default 50." },
        remove_bad_takes: { type: "boolean", description: "Auto-remove flubs, false starts, and ums. Useful for unscripted talking-head footage." },
        clean_audio: { type: "boolean", description: "Remove background noise and even audio levels." },
        disable_captions: { type: "boolean", description: "Set true if user wants ZERO captions burned in (for content where captions would clutter)." },
        dictionary: { type: "array", items: { type: "string" }, description: "Per-call dictionary additions, merged with Studio brand dictionary. Use for one-off proper nouns specific to this video." },
      },
      required: ["source_url", "title"],
    },
  },
  // ─── Google Drive ─
  {
    name: "list_drive_videos",
    description: "List video files in a Google Drive folder. Use this when the user asks 'what's in my Studio Inbox' or 'pull up the videos from Drive'. Returns up to 50 most recent files. If folder_path is omitted, lists the user's Suarez Global / Studio / Inbox folder by default.",
    input_schema: {
      type: "object",
      properties: {
        folder_id: { type: "string", description: "Optional Drive folder ID. If omitted, defaults to the Studio Inbox folder." },
        query_extra: { type: "string", description: "Optional extra Drive query filter (e.g. \"name contains 'podcast'\"). Combined with the folder constraint." },
        limit: { type: "number", description: "Max files to return (default 25, max 50)." },
      },
    },
  },
  {
    name: "get_drive_signed_url",
    description: "Bridge a Drive file into Supabase Storage and return a signed URL that external services like Submagic can fetch reliably. Streams the file from Drive to Supabase (4-hour signed URL). Use this AFTER list_drive_videos to prep a file before clip_long_video. Note: this is the recommended path for any non-YouTube source — Drive's public-link sharing is unreliable for external services.",
    input_schema: {
      type: "object",
      properties: {
        file_id: { type: "string", description: "The Drive file ID (from list_drive_videos)." },
      },
      required: ["file_id"],
    },
  },
  {
    name: "move_drive_file",
    description: "Move a Drive file from one folder to another. Use after a clip job is queued to move the source video from Inbox to Processed.",
    input_schema: {
      type: "object",
      properties: {
        file_id: { type: "string" },
        dest_folder_id: { type: "string", description: "Destination folder ID. Use 'studio_processed' to use the Studio / Processed folder by name." },
      },
      required: ["file_id", "dest_folder_id"],
    },
  },
  {
    name: "setup_studio_drive_folders",
    description: "Idempotently create the Suarez Global / Studio / Inbox, Processed, Output folders in Drive. Returns folder IDs. Safe to call multiple times (won't duplicate). Call this once on first Studio use, or if folder IDs aren't configured.",
    input_schema: { type: "object", properties: {} },
  },
  // ─── Content Library (transcripts of past videos) ─
  {
    name: "search_content_library",
    description: "Search the user's library of past video transcripts (everything ever processed in Studio). Use this BEFORE drafting new content to check for repetition, find similar past topics, or pull quotes/themes from previous videos. Searches both summaries and full transcripts. Returns up to 10 matches.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query — keyword, topic, brand mention, or theme. Examples: 'Tampa multifamily', 'cap rate', 'REAP demo', 'Q3 results'." },
        brand: { type: "string", description: "Optional filter to videos that mention a specific brand: 'REAP', 'Suarez Capital', 'Tampa Development Group', etc." },
        limit: { type: "number", description: "Max results (default 5, max 10)." },
      },
      required: ["query"],
    },
  },
  {
    name: "get_transcript",
    description: "Retrieve the full transcript and AI-extracted intelligence (summary, topics, suggested hooks, brand mentions, suggested caption) for a specific video by its transcript_id (returned from search_content_library) or artifact_id. Use when you need to quote from a video, build off a past hook, or write a follow-up.",
    input_schema: {
      type: "object",
      properties: {
        transcript_id: { type: "string", description: "UUID of the content_transcripts row." },
        artifact_id: { type: "string", description: "UUID of the source robot_artifacts row (alternative to transcript_id)." },
        include_full_transcript: { type: "boolean", description: "Default true. Set false to get only the metadata/summary without the full text." },
      },
    },
  },
  {
    name: "list_content_library",
    description: "List recent video transcripts in the library, newest first. Use to give the user an overview of what's in the catalog. Returns title, summary, key topics, brand mentions, duration.",
    input_schema: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Default 10, max 25." },
        brand: { type: "string", description: "Optional brand filter." },
      },
    },
  },
  // ─── Posting & dedup ─
  {
    name: "log_content_post",
    description: "Log that a video has been posted to a platform. Use when the user reports posting something, OR proactively after they confirm intent to post. Required to make dedup tools work over time. Status defaults to 'posted'; can be 'scheduled' or 'draft'.",
    input_schema: {
      type: "object",
      properties: {
        artifact_id: { type: "string", description: "UUID of the video_render or video_clip artifact that was posted." },
        transcript_id: { type: "string", description: "Optional UUID of the content_transcripts row (for cleaner dedup linkage)." },
        platform: { type: "string", description: "Platform name. Common: 'instagram', 'youtube', 'tiktok', 'linkedin', 'twitter', 'facebook'." },
        platform_post_id: { type: "string", description: "Optional ID/slug from the platform (Instagram media ID, YouTube video ID, etc)." },
        post_url: { type: "string", description: "Optional link to the live post." },
        caption_used: { type: "string", description: "The caption you actually posted (may differ from suggested caption)." },
        hashtags_used: { type: "array", items: { type: "string" }, description: "Hashtags actually used (without #)." },
        status: { type: "string", enum: ["posted", "scheduled", "draft"], description: "Default 'posted'." },
        posted_at: { type: "string", description: "ISO timestamp. Default: now." },
        scheduled_for: { type: "string", description: "ISO timestamp if status is 'scheduled'." },
        notes: { type: "string", description: "Optional context — performance notes, A/B variant, etc." },
      },
      required: ["platform"],
    },
  },
  {
    name: "find_repost_risk",
    description: "Check whether a topic or video has already been posted recently. Use BEFORE drafting new content to avoid repetition. Searches recent posts (last 90 days by default) and matches by topic keywords, transcript similarity, or specific artifact ID. Returns matching past posts with platform/date.",
    input_schema: {
      type: "object",
      properties: {
        topic_keywords: { type: "string", description: "Keywords describing the topic of the new content. Examples: 'Tampa multifamily underwriting', 'REAP demo', 'cap rate analysis'." },
        artifact_id: { type: "string", description: "Optional: check if THIS specific video has been posted (anywhere)." },
        platform: { type: "string", description: "Optional: limit to one platform (e.g. only check Instagram repost risk)." },
        days_back: { type: "number", description: "Look back N days. Default 90." },
      },
    },
  },
  {
    name: "list_recent_posts",
    description: "List recently posted content across all platforms. Use for 'what have we posted this week/month' questions, content audit, or showing the user their posting cadence.",
    input_schema: {
      type: "object",
      properties: {
        days_back: { type: "number", description: "Default 30, max 365." },
        platform: { type: "string", description: "Optional platform filter." },
        limit: { type: "number", description: "Default 25, max 100." },
      },
    },
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
      case "save_brand_audit": return await saveBrandAudit(input, ctx);
      case "clip_long_video": return await clipLongVideo(input, ctx);
      case "list_drive_videos": return await listDriveVideos(input, ctx);
      case "get_drive_signed_url": return await getDriveSignedUrl(input, ctx);
      case "move_drive_file": return await moveDriveFile(input, ctx);
      case "setup_studio_drive_folders": return await setupStudioDriveFolders(input, ctx);
      case "search_content_library": return await searchContentLibrary(input, ctx);
      case "get_transcript": return await getTranscript(input, ctx);
      case "list_content_library": return await listContentLibrary(input, ctx);
      case "log_content_post": return await logContentPost(input, ctx);
      case "find_repost_risk": return await findRepostRisk(input, ctx);
      case "list_recent_posts": return await listRecentPosts(input, ctx);
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
  if (!res.ok) {
    await logRobotAction(ctx.supabase, { user_id: ctx.user_id, robot_id: ctx.robot_id, service: "constant_contact", action: "create_cc_email_draft", success: false, error_type: `http_${res.status}`, meta: { subject: input.subject } });
    return { result: `Error: ${res.status} — ${JSON.stringify(data).slice(0, 500)}` };
  }
  const campaignId = data.campaign_id || data.id;
  const adminUrl = `https://app.constantcontact.com/pages/campaigns/email-details/${campaignId}`;
  const { data: artRow } = await ctx.supabase.from("robot_artifacts").insert({
    user_id: ctx.user_id, robot_id: ctx.robot_id, artifact_type: "cc_email_draft",
    title: input.name, summary: `Subject: ${input.subject}`, external_id: campaignId, external_url: adminUrl,
    payload: { subject: input.subject, from_name: fromName, from_email: fromEmail, preview_text: input.preview_text || "", html_content: input.html_content }, status: "draft",
  }).select("id").single();
  await logRobotAction(ctx.supabase, { user_id: ctx.user_id, robot_id: ctx.robot_id, service: "constant_contact", action: "create_cc_email_draft", success: true, meta: { campaign_id: campaignId, subject: input.subject, name: input.name } });
  return { result: `✓ CC draft "${input.name}" created. Review at ${adminUrl}`, artifact: { type: "cc_email_draft", title: input.name, url: adminUrl, id: artRow?.id, external_id: campaignId } };
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
  if (!res.ok) {
    await logRobotAction(ctx.supabase, { user_id: ctx.user_id, robot_id: ctx.robot_id, service: "google", action: "create_gmail_draft", success: false, error_type: `http_${res.status}`, meta: { to: input.to, subject: input.subject } });
    return { result: `Error: ${res.status} — ${JSON.stringify(data).slice(0, 500)}` };
  }

  const draftId = data.id;
  const draftsUrl = `https://mail.google.com/mail/u/0/#drafts`;
  const { data: artRow } = await ctx.supabase.from("robot_artifacts").insert({
    user_id: ctx.user_id, robot_id: ctx.robot_id, artifact_type: "gmail_draft",
    title: input.subject, summary: `To: ${input.to}`, external_id: draftId, external_url: draftsUrl,
    payload: { to: input.to, cc: input.cc || null, subject: input.subject, body: input.body, is_html: !!input.is_html }, status: "draft",
  }).select("id").single();
  await logRobotAction(ctx.supabase, { user_id: ctx.user_id, robot_id: ctx.robot_id, service: "google", action: "create_gmail_draft", success: true, meta: { draft_id: draftId, to: input.to, subject: input.subject } });
  return { result: `✓ Gmail draft saved. Review at ${draftsUrl}`, artifact: { type: "gmail_draft", title: input.subject, url: draftsUrl, id: artRow?.id, external_id: draftId } };
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
  await logRobotAction(ctx.supabase, { user_id: ctx.user_id, robot_id: ctx.robot_id, service: "openphone", action: "draft_quo_text", success: true, meta: { persona, from_label: line.label, to: toNumber, body_chars: input.body.length } });
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

// ─── BRAND AUDIT ───────────────────────────────────────────────────────────
async function saveBrandAudit(input: any, ctx: any) {
  const today = input.audit_date || new Date().toISOString().slice(0, 10);
  const score = Number(input.overall_score) || 0;
  const wins = Array.isArray(input.top_wins) ? input.top_wins : [];
  const issues = Array.isArray(input.top_issues) ? input.top_issues : [];
  const actions = Array.isArray(input.immediate_actions) ? input.immediate_actions : [];
  const missing = Array.isArray(input.whats_missing) ? input.whats_missing : [];
  const risks = Array.isArray(input.risks) ? input.risks : [];
  const findings = Array.isArray(input.query_findings) ? input.query_findings : [];

  const payload = {
    audit_date: today,
    overall_score: score,
    score_rationale: input.score_rationale || "",
    top_wins: wins,
    top_issues: issues,
    immediate_actions: actions.sort((a: any, b: any) => (a.priority || 99) - (b.priority || 99)),
    whats_missing: missing,
    risks: risks,
    query_findings: findings,
  };

  const summary = `Score ${score}/10 · ${wins.length} wins · ${issues.length} issues · ${actions.length} actions queued`;

  const { data, error } = await ctx.supabase.from("robot_artifacts").insert({
    user_id: ctx.user_id,
    robot_id: ctx.robot_id,
    artifact_type: "brand_audit_report",
    title: `Weekly Brand Audit — ${today}`,
    summary,
    payload,
    status: "created",
  }).select().single();

  if (error) return { result: `Error saving brand audit: ${error.message}` };
  return {
    result: `✓ Brand audit saved (score ${score}/10). ${wins.length} wins, ${issues.length} issues, ${actions.length} actions identified. View in Reports.`,
    artifact: { type: "brand_audit_report", title: data.title, id: data.id },
  };
}

// ─── VIDEO (Submagic Magic Clips) ──────────────────────────────────────────
async function clipLongVideo(input: any, ctx: any) {
  const submagicKey = Deno.env.get("SUBMAGIC_API_KEY");
  const sourceUrl = input.source_url;
  if (!sourceUrl) return { result: "Error: source_url is required." };

  // Load Studio defaults so per-render input can override but unset values fall back.
  const { data: settings } = await ctx.supabase
    .from("studio_settings")
    .select("default_template, default_min_clip_length, default_max_clip_length, default_language, default_magic_zooms, default_magic_brolls, default_remove_bad_takes, default_clean_audio, default_disable_captions, default_magic_zooms_percentage, default_magic_brolls_percentage, brand_dictionary, submagic_user_theme_id")
    .eq("user_id", ctx.user_id)
    .maybeSingle();

  const isYouTube = /youtube\.com\/watch|youtu\.be\//.test(sourceUrl);
  const projectTitle = (input.title || "Untitled clipping").slice(0, 100);
  const template = input.template || settings?.default_template || "Sara";
  const minLen = Number(input.min_clip_length) || Number(settings?.default_min_clip_length) || 15;
  const maxLen = Number(input.max_clip_length) || Number(settings?.default_max_clip_length) || 60;
  const language = input.language || settings?.default_language || "en";
  const webhookUrl = "https://bkezvsjhaepgvsvfywhk.supabase.co/functions/v1/video-webhook";

  // Polish toggles (per-call input overrides settings; settings overrides hardcoded defaults).
  const magicZooms = input.magic_zooms !== undefined ? Boolean(input.magic_zooms) : (settings?.default_magic_zooms ?? true);
  const magicBrolls = input.magic_brolls !== undefined ? Boolean(input.magic_brolls) : (settings?.default_magic_brolls ?? true);
  const removeBadTakes = input.remove_bad_takes !== undefined ? Boolean(input.remove_bad_takes) : (settings?.default_remove_bad_takes ?? false);
  const cleanAudio = input.clean_audio !== undefined ? Boolean(input.clean_audio) : (settings?.default_clean_audio ?? false);
  const disableCaptions = input.disable_captions !== undefined ? Boolean(input.disable_captions) : (settings?.default_disable_captions ?? false);
  const magicZoomsPercentage = input.magic_zooms_percentage !== undefined ? Number(input.magic_zooms_percentage) : (settings?.default_magic_zooms_percentage ?? 50);
  const magicBrollsPercentage = input.magic_brolls_percentage !== undefined ? Number(input.magic_brolls_percentage) : (settings?.default_magic_brolls_percentage ?? 50);

  // Brand dictionary: per-call input merges with settings.
  const brandDictFromSettings = Array.isArray(settings?.brand_dictionary) ? settings.brand_dictionary : [];
  const brandDictFromInput = Array.isArray(input.dictionary) ? input.dictionary : [];
  const brandDictionary = Array.from(new Set([...brandDictFromSettings, ...brandDictFromInput])).filter(Boolean);

  const userThemeId = input.user_theme_id || settings?.submagic_user_theme_id || null;

  // Route based on source type:
  //   YouTube  → /v1/projects/magic-clips  (multi-clip extractor; YouTube only)
  //   Direct   → /v1/projects              (single polished video; supports videoUrl)
  const endpoint = isYouTube
    ? "https://api.submagic.co/v1/projects/magic-clips"
    : "https://api.submagic.co/v1/projects";

  const requestBody: any = {
    title: projectTitle,
    language,
    webhookUrl,
  };
  // userThemeId and templateName are mutually exclusive
  if (userThemeId) {
    requestBody.userThemeId = userThemeId;
  } else {
    requestBody.templateName = template;
  }

  if (brandDictionary.length > 0) {
    requestBody.dictionary = brandDictionary;
  }

  if (isYouTube) {
    requestBody.youtubeUrl = sourceUrl;
    requestBody.minClipLength = minLen;
    requestBody.maxClipLength = maxLen;
  } else {
    requestBody.videoUrl = sourceUrl;
    requestBody.magicZooms = magicZooms;
    requestBody.magicBrolls = magicBrolls;
    if (magicZooms && magicZoomsPercentage !== 50) requestBody.magicZoomsPercentage = magicZoomsPercentage;
    if (magicBrolls && magicBrollsPercentage !== 50) requestBody.magicBrollsPercentage = magicBrollsPercentage;
    if (removeBadTakes) requestBody.removeBadTakes = true;
    if (cleanAudio) requestBody.cleanAudio = true;
    if (disableCaptions) requestBody.disableCaptions = true;
  }

  const artifactType = isYouTube ? "video_clips_project" : "video_render";
  const summaryLabel = isYouTube ? "Processing — clips arrive in 5-15 min" : "Processing — polished video arrives in 5-15 min";

  let externalId: string | null = null;
  let submagicError: string | null = null;
  let submagicErrorDetail: string | null = null;

  if (!submagicKey) {
    submagicError = "submagic_not_configured";
    submagicErrorDetail = "SUBMAGIC_API_KEY is not set in Supabase secrets.";
  } else {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "x-api-key": submagicKey, "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const data = await res.json();
    if (!res.ok) {
      submagicError = `http_${res.status}`;
      submagicErrorDetail = data?.message || JSON.stringify(data).slice(0, 400);
      await logRobotAction(ctx.supabase, {
        user_id: ctx.user_id, robot_id: ctx.robot_id, service: "submagic", action: isYouTube ? "magic_clips_request" : "single_project_request",
        success: false, error_type: `http_${res.status}`, meta: { title: projectTitle, error: submagicErrorDetail, source_type: isYouTube ? "youtube" : "file" },
      });
    } else {
      externalId = data.id;
    }
  }

  // ALWAYS create the artifact so failures are visible in Studio (not just in usage_log).
  const isFailed = submagicError !== null;
  const { data: artRow } = await ctx.supabase.from("robot_artifacts").insert({
    user_id: ctx.user_id,
    robot_id: ctx.robot_id,
    artifact_type: artifactType,
    title: projectTitle,
    summary: isFailed
      ? `Submagic rejected request: ${submagicErrorDetail?.slice(0, 200) || submagicError}`
      : summaryLabel,
    external_id: externalId,
    external_url: null,
    payload: {
      provider: "submagic",
      submagic_endpoint: endpoint,
      source_url: sourceUrl,
      source_type: isYouTube ? "youtube" : "file",
      template,
      min_clip_length: minLen,
      max_clip_length: maxLen,
      language,
      submagic_project_id: externalId,
      requested_at: new Date().toISOString(),
      ...(isFailed ? { error: submagicError, error_detail: submagicErrorDetail, failed_at: new Date().toISOString() } : {}),
    },
    status: isFailed ? "failed" : "queued",
  }).select("id").single();

  if (isFailed) {
    return {
      result: `❌ Submagic rejected the request: ${submagicErrorDetail || submagicError}\n\nThe project was saved as failed in Studio so you can see what happened. ${!isYouTube ? "\n\nNote: Submagic's Magic Clips (multi-clip extraction) only works with YouTube URLs. For Drive files we use their single-project endpoint, which produces ONE polished video instead of multiple clips." : ""}`,
      artifact: { type: artifactType, title: projectTitle, id: artRow?.id, status: "failed" },
    };
  }

  await logRobotAction(ctx.supabase, {
    user_id: ctx.user_id, robot_id: ctx.robot_id, service: "submagic", action: isYouTube ? "magic_clips_request" : "single_project_request",
    success: true, meta: { submagic_project_id: externalId, title: projectTitle, template, source_type: isYouTube ? "youtube" : "file" },
  });

  return {
    result: isYouTube
      ? `✓ Submagic Magic Clips queued: "${projectTitle}" (id ${externalId}). Template: ${template}. Multiple clips will appear in Studio in 5-15 minutes.`
      : `✓ Submagic single-project queued: "${projectTitle}" (id ${externalId}). Template: ${template}. Polished captioned video will appear in 5-15 minutes. Note: this is one polished video, not multiple clips — Magic Clips only works with YouTube URLs.`,
    artifact: { type: artifactType, title: projectTitle, id: artRow?.id, external_id: externalId },
  };
}

// ─── GOOGLE DRIVE ──────────────────────────────────────────────────────────
// Returns a fresh Google access token with Drive scope, refreshing if expired.
async function getGoogleAccessToken(ctx: any): Promise<string | null> {
  const { data: tokenRow } = await ctx.supabase.from("gmail_tokens").select("access_token, refresh_token, expires_at, scopes").eq("user_id", ctx.user_id).maybeSingle();
  if (!tokenRow?.access_token) return null;
  const hasDriveScope = (tokenRow.scopes || "").includes("/auth/drive");
  if (!hasDriveScope) {
    console.warn("Google token missing drive scope");
    return null;
  }
  // Refresh if expiring within 60 seconds
  if (tokenRow.expires_at && new Date(tokenRow.expires_at).getTime() - Date.now() < 60000) {
    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `client_id=${GOOGLE_CLIENT_ID}&client_secret=${GOOGLE_CLIENT_SECRET}&refresh_token=${tokenRow.refresh_token}&grant_type=refresh_token`,
    });
    const rd = await refreshRes.json();
    if (rd.access_token) {
      await ctx.supabase.from("gmail_tokens").update({
        access_token: rd.access_token,
        expires_at: new Date(Date.now() + (rd.expires_in || 3600) * 1000).toISOString(),
      }).eq("user_id", ctx.user_id);
      return rd.access_token;
    }
    return null;
  }
  return tokenRow.access_token;
}

// Find or create a Drive folder by name + parent. Idempotent — returns existing if found.
async function ensureDriveFolder(token: string, name: string, parentId: string | null = null): Promise<string | null> {
  const escapedName = name.replace(/'/g, "\\'");
  const parentClause = parentId ? `'${parentId}' in parents and ` : "";
  const q = `${parentClause}name='${escapedName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)&pageSize=1`;
  const findRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const findData = await findRes.json();
  if (findData.files && findData.files.length > 0) return findData.files[0].id;

  // Create
  const createBody: any = { name, mimeType: "application/vnd.google-apps.folder" };
  if (parentId) createBody.parents = [parentId];
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(createBody),
  });
  const created = await createRes.json();
  return created.id || null;
}

async function setupStudioDriveFolders(_input: any, ctx: any) {
  const token = await getGoogleAccessToken(ctx);
  if (!token) return { result: "Error: Google Drive is not connected with the right scope. Reconnect Google in Inbox → Email." };

  // Suarez Global / Studio / { Inbox, Processed, Output }
  const root = await ensureDriveFolder(token, "Suarez Global");
  if (!root) return { result: "Error: could not create Suarez Global root folder." };
  const studio = await ensureDriveFolder(token, "Studio", root);
  if (!studio) return { result: "Error: could not create Studio folder." };
  const inbox = await ensureDriveFolder(token, "Inbox", studio);
  const processed = await ensureDriveFolder(token, "Processed", studio);
  const output = await ensureDriveFolder(token, "Output", studio);

  if (!inbox || !processed || !output) return { result: "Error: could not create one of the Studio subfolders." };

  // Save to studio_settings
  await ctx.supabase.from("studio_settings").upsert({
    user_id: ctx.user_id,
    drive_root_folder_id: studio,
    drive_inbox_folder_id: inbox,
    drive_processed_folder_id: processed,
    drive_output_folder_id: output,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  return {
    result: `✓ Studio Drive folders ready in My Drive → Suarez Global → Studio (Inbox, Processed, Output). Folder IDs saved. Drop videos into Inbox to process.`,
    artifact: { type: "studio_drive_setup", title: "Drive folders configured", id: studio },
  };
}

async function listDriveVideos(input: any, ctx: any) {
  const token = await getGoogleAccessToken(ctx);
  if (!token) return { result: "Error: Google Drive is not connected." };

  // Build the list of folder IDs to search.
  // - If caller specified one, search only that.
  // - Otherwise search all three Studio folders so users who drop into the wrong subfolder still see their files.
  const folderIdsToSearch: { id: string; label: string }[] = [];
  if (input.folder_id) {
    folderIdsToSearch.push({ id: input.folder_id, label: "Specified" });
  } else {
    const { data: settings } = await ctx.supabase.from("studio_settings").select("drive_inbox_folder_id, drive_processed_folder_id, drive_output_folder_id").eq("user_id", ctx.user_id).maybeSingle();
    if (!settings?.drive_inbox_folder_id) {
      return { result: "Error: Studio folders not configured. Call setup_studio_drive_folders first." };
    }
    folderIdsToSearch.push({ id: settings.drive_inbox_folder_id, label: "Inbox" });
    if (settings.drive_processed_folder_id) folderIdsToSearch.push({ id: settings.drive_processed_folder_id, label: "Processed" });
    if (settings.drive_output_folder_id) folderIdsToSearch.push({ id: settings.drive_output_folder_id, label: "Output" });
  }

  const limit = Math.min(input.limit || 25, 50);
  const allFiles: any[] = [];

  for (const f of folderIdsToSearch) {
    const baseQuery = `'${f.id}' in parents and trashed=false and (mimeType contains 'video/' or name contains '.mp4' or name contains '.mov' or name contains '.MOV' or name contains '.mkv' or name contains '.webm')`;
    const q = input.query_extra ? `${baseQuery} and (${input.query_extra})` : baseQuery;
    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,size,createdTime,modifiedTime,videoMediaMetadata)&orderBy=modifiedTime desc&pageSize=${limit}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (!res.ok) continue; // skip folders that error, don't fail entire list
    for (const file of (data.files || [])) {
      allFiles.push({ ...file, _folder: f.label });
    }
  }

  if (allFiles.length === 0) return { result: `No video files in any Studio folder. Drop videos into Drive → Suarez Global → Studio → Inbox to process.` };

  // Sort all by modifiedTime desc
  allFiles.sort((a, b) => (b.modifiedTime || "").localeCompare(a.modifiedTime || ""));
  const limited = allFiles.slice(0, limit);

  const lines = limited.map((f: any) => {
    const sizeMB = f.size ? `${(Number(f.size) / 1024 / 1024).toFixed(1)} MB` : "—";
    const dur = f.videoMediaMetadata?.durationMillis ? `${Math.round(Number(f.videoMediaMetadata.durationMillis) / 1000)}s` : "";
    return `[${f.id}] (${f._folder}) ${f.name} · ${sizeMB}${dur ? " · " + dur : ""} · ${(f.modifiedTime || "").slice(0, 10)}`;
  });
  return { result: `${limited.length} video${limited.length !== 1 ? "s" : ""} across Studio folders:\n${lines.join("\n")}` };
}

async function getDriveSignedUrl(input: any, ctx: any) {
  // RENAMED IN SPIRIT: this now streams the Drive file into Supabase Storage and
  // returns a clean Supabase signed URL that Submagic (or any external service)
  // can fetch reliably. The function name stays the same for backward compat,
  // but the strategy is completely different — no Drive public permissions.

  const token = await getGoogleAccessToken(ctx);
  if (!token) return { result: "Error: Google Drive is not connected." };
  if (!input.file_id) return { result: "Error: file_id required." };

  // 1. Get file metadata
  const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${input.file_id}?fields=id,name,mimeType,size`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meta = await metaRes.json();
  if (!metaRes.ok) return { result: `Error: Drive file ${input.file_id} not found. ${JSON.stringify(meta).slice(0, 200)}` };

  const sizeBytes = Number(meta.size || 0);
  const sizeMB = sizeBytes ? Math.round(sizeBytes / 1024 / 1024) : null;

  // 2. Sanity-check size against Supabase project file limit (5GB after our config bump)
  if (sizeBytes > 5 * 1024 * 1024 * 1024) {
    return { result: `Error: file is ${sizeMB} MB, exceeds 5 GB Supabase Storage cap. Trim or compress before processing.` };
  }

  // 3. Build target path in videos-source bucket
  const cleanName = (meta.name || "video.mp4").replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectPath = `${ctx.user_id}/drive-${input.file_id}-${Date.now()}-${cleanName}`;

  // 4. Stream Drive file → Supabase Storage.
  // Drive's alt=media gives us the raw bytes when authenticated.
  const driveDownloadUrl = `https://www.googleapis.com/drive/v3/files/${input.file_id}?alt=media`;
  const driveStreamRes = await fetch(driveDownloadUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!driveStreamRes.ok) {
    const errText = await driveStreamRes.text();
    return { result: `Error downloading from Drive: ${driveStreamRes.status} — ${errText.slice(0, 300)}` };
  }
  if (!driveStreamRes.body) {
    return { result: "Error: Drive returned no body stream." };
  }

  // Encode each path segment but preserve the slashes — Supabase Storage
  // requires the path to keep its hierarchical structure. encodeURIComponent
  // on the whole path encodes slashes as %2F, which Storage signs OK but then
  // rejects on download with InvalidSignature.
  const encodedPath = objectPath.split("/").map((seg) => encodeURIComponent(seg)).join("/");

  // 5. Upload to Supabase Storage. We use the storage API's binary upload endpoint,
  // streaming the body directly without buffering. Deno fetch supports passing a
  // ReadableStream as body.
  // NOTE: We use STORAGE_SERVICE_KEY (the JWT-format service role key) explicitly
  // because Supabase's auto-injected SUPABASE_SERVICE_ROLE_KEY may use the newer
  // sb_secret_... format, which Storage rejects with "Invalid Compact JWS".
  const storageKey = Deno.env.get("STORAGE_SERVICE_KEY") || SUPABASE_SERVICE_ROLE_KEY;
  const storageUploadUrl = `${SUPABASE_URL}/storage/v1/object/videos-source/${encodedPath}`;
  const contentType = meta.mimeType || driveStreamRes.headers.get("content-type") || "video/mp4";

  // Some upstreams require Content-Length for the upload; if Drive provided it, pass it through.
  const contentLength = driveStreamRes.headers.get("content-length") || (sizeBytes ? String(sizeBytes) : null);

  const uploadHeaders: Record<string, string> = {
    "Authorization": `Bearer ${storageKey}`,
    "Content-Type": contentType,
    "x-upsert": "true",
  };
  if (contentLength) uploadHeaders["Content-Length"] = contentLength;

  const uploadRes = await fetch(storageUploadUrl, {
    method: "POST",
    headers: uploadHeaders,
    body: driveStreamRes.body,
    // @ts-ignore — Deno-specific option to allow streaming request bodies
    duplex: "half",
  });
  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    return { result: `Error uploading to Supabase Storage: ${uploadRes.status} — ${errText.slice(0, 300)}` };
  }

  // 6. Generate a signed URL for Submagic. 4-hour validity covers Submagic's
  // download + processing window comfortably. Re-issuable if needed.
  const signedRes = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/videos-source/${encodedPath}`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${storageKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: 4 * 60 * 60 }),
  });
  const signed = await signedRes.json();
  if (!signedRes.ok || !signed.signedURL) {
    return { result: `Error creating signed URL: ${JSON.stringify(signed).slice(0, 200)}` };
  }

  // Supabase returns a relative path; build the full URL
  const signedUrl = signed.signedURL.startsWith("http")
    ? signed.signedURL
    : `${SUPABASE_URL}/storage/v1${signed.signedURL.startsWith("/") ? "" : "/"}${signed.signedURL}`;

  // 7. PRE-FLIGHT CHECK: verify the signed URL actually works before we hand it
  // off to Submagic. We had a bug where URL encoding broke the download path —
  // this catches that class of issue before failing in production.
  const headRes = await fetch(signedUrl, { method: "HEAD" });
  if (!headRes.ok) {
    return { result: `Error: signed URL failed pre-flight check (${headRes.status}). Storage said: ${headRes.headers.get("content-type") || "unknown"}. URL: ${signedUrl.slice(0, 200)}...` };
  }
  const verifiedSize = headRes.headers.get("content-length");
  const verifiedType = headRes.headers.get("content-type");

  return {
    result: `✓ Bridged "${meta.name}" (${sizeMB ? sizeMB + " MB" : "unknown size"}) Drive → Supabase Storage. Signed URL verified (${verifiedSize ? Math.round(Number(verifiedSize)/1024/1024) + " MB" : "?"}, ${verifiedType || "?"}) and ready for Submagic (4h validity):\n${signedUrl}\n\nStored at: videos-source/${objectPath}`,
    artifact: {
      type: "drive_bridged_url",
      title: meta.name,
      id: input.file_id,
      external_id: input.file_id,
      external_url: signedUrl,
      payload: { storage_path: objectPath, size_bytes: sizeBytes, source: "drive" },
    },
  };
}

async function moveDriveFile(input: any, ctx: any) {
  const token = await getGoogleAccessToken(ctx);
  if (!token) return { result: "Error: Google Drive is not connected." };
  if (!input.file_id || !input.dest_folder_id) return { result: "Error: file_id and dest_folder_id required." };

  // Resolve symbolic dest_folder_id values
  let destId = input.dest_folder_id;
  if (destId === "studio_processed" || destId === "studio_output" || destId === "studio_inbox") {
    const { data: settings } = await ctx.supabase.from("studio_settings").select("*").eq("user_id", ctx.user_id).maybeSingle();
    if (!settings) return { result: "Error: Studio folders not configured. Call setup_studio_drive_folders first." };
    if (destId === "studio_processed") destId = settings.drive_processed_folder_id;
    if (destId === "studio_output") destId = settings.drive_output_folder_id;
    if (destId === "studio_inbox") destId = settings.drive_inbox_folder_id;
  }

  // Get current parents so we can remove them
  const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${input.file_id}?fields=parents,name`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const meta = await metaRes.json();
  if (!metaRes.ok) return { result: `Error fetching file: ${JSON.stringify(meta).slice(0, 200)}` };

  const removeParents = (meta.parents || []).join(",");
  const url = `https://www.googleapis.com/drive/v3/files/${input.file_id}?addParents=${destId}&removeParents=${removeParents}&fields=id,parents,name`;
  const res = await fetch(url, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } });
  const data = await res.json();
  if (!res.ok) return { result: `Error moving file: ${JSON.stringify(data).slice(0, 200)}` };

  return { result: `✓ Moved "${meta.name}" to destination folder.` };
}

// ─── CONTENT LIBRARY (transcripts) ─────────────────────────────────────────
async function searchContentLibrary(input: any, ctx: any) {
  const limit = Math.min(Number(input.limit) || 5, 10);
  const query = String(input.query || "").trim();
  if (!query) return { result: "Error: query required." };

  // Use ilike across title, summary, full_transcript. Also filter by brand if given.
  // We split the query into significant terms and OR them so partial matches still hit.
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length >= 3);
  if (terms.length === 0) terms.push(query.toLowerCase());

  let q = ctx.supabase.from("content_transcripts")
    .select("id, source_artifact_id, title, summary, key_topics, brand_mentions, suggested_hooks, duration_seconds, created_at")
    .eq("user_id", ctx.user_id)
    .eq("ai_processing_status", "completed")
    .order("created_at", { ascending: false })
    .limit(limit);

  // Build OR clause: each term searched across title + summary + full_transcript
  const orParts: string[] = [];
  for (const t of terms) {
    const safe = t.replace(/[%,()]/g, "");
    if (!safe) continue;
    orParts.push(`title.ilike.%${safe}%`);
    orParts.push(`summary.ilike.%${safe}%`);
    orParts.push(`full_transcript.ilike.%${safe}%`);
  }
  if (orParts.length) q = q.or(orParts.join(","));

  const { data, error } = await q;
  if (error) return { result: `Error: ${error.message}` };
  if (!data || data.length === 0) return { result: `No videos in the content library match "${query}". Either you haven't covered this topic yet, or process more videos through Studio first.` };

  let results = data;
  if (input.brand) {
    const brandLower = String(input.brand).toLowerCase();
    results = results.filter((r: any) => {
      const mentions = Array.isArray(r.brand_mentions) ? r.brand_mentions : [];
      return mentions.some((m: any) => String(m).toLowerCase().includes(brandLower));
    });
    if (results.length === 0) return { result: `No videos mention "${input.brand}" specifically. Did you mean to search without that filter?` };
  }

  const lines = results.map((r: any) => {
    const dur = r.duration_seconds ? `${Math.round(r.duration_seconds)}s` : "?";
    const date = (r.created_at || "").slice(0, 10);
    const topics = Array.isArray(r.key_topics) ? r.key_topics.slice(0, 4).join(", ") : "";
    const brands = Array.isArray(r.brand_mentions) && r.brand_mentions.length > 0 ? `[${r.brand_mentions.join(", ")}]` : "";
    return `[${r.id}] "${r.title}" · ${date} · ${dur}${brands ? " · " + brands : ""}\n  Summary: ${r.summary || "(no summary)"}\n  Topics: ${topics}`;
  });
  return { result: `Found ${results.length} video(s) matching "${query}":\n\n${lines.join("\n\n")}` };
}

async function getTranscript(input: any, ctx: any) {
  const includeFullTranscript = input.include_full_transcript !== false;
  let q = ctx.supabase.from("content_transcripts").select("*").eq("user_id", ctx.user_id);
  if (input.transcript_id) q = q.eq("id", input.transcript_id);
  else if (input.artifact_id) q = q.eq("source_artifact_id", input.artifact_id);
  else return { result: "Error: transcript_id or artifact_id required." };

  const { data, error } = await q.maybeSingle();
  if (error) return { result: `Error: ${error.message}` };
  if (!data) return { result: "No transcript found for that ID." };

  const parts: string[] = [];
  parts.push(`═══ "${data.title}" ═══`);
  parts.push(`Date: ${(data.created_at || "").slice(0, 10)} · Duration: ${data.duration_seconds ? Math.round(data.duration_seconds) + "s" : "?"} · Language: ${data.language}`);
  if (data.summary) parts.push(`\nSummary: ${data.summary}`);
  if (Array.isArray(data.key_topics) && data.key_topics.length) parts.push(`Topics: ${data.key_topics.join(", ")}`);
  if (Array.isArray(data.brand_mentions) && data.brand_mentions.length) parts.push(`Brand mentions: ${data.brand_mentions.join(", ")}`);
  if (Array.isArray(data.suggested_hooks) && data.suggested_hooks.length) {
    parts.push(`\nSuggested hooks:`);
    data.suggested_hooks.forEach((h: any, i: number) => parts.push(`  ${i + 1}. ${h}`));
  }
  if (data.suggested_caption) parts.push(`\nSuggested caption:\n${data.suggested_caption}`);
  if (Array.isArray(data.suggested_hashtags) && data.suggested_hashtags.length) parts.push(`Hashtags: ${data.suggested_hashtags.map((t: string) => `#${t}`).join(" ")}`);
  if (includeFullTranscript && data.full_transcript) {
    parts.push(`\n--- FULL TRANSCRIPT ---\n${data.full_transcript}`);
  }
  return { result: parts.join("\n") };
}

async function listContentLibrary(input: any, ctx: any) {
  const limit = Math.min(Number(input.limit) || 10, 25);
  let q = ctx.supabase.from("content_transcripts")
    .select("id, title, summary, key_topics, brand_mentions, duration_seconds, created_at")
    .eq("user_id", ctx.user_id)
    .eq("ai_processing_status", "completed")
    .order("created_at", { ascending: false })
    .limit(limit);
  const { data, error } = await q;
  if (error) return { result: `Error: ${error.message}` };
  if (!data || data.length === 0) return { result: "Content library is empty. Process videos through Studio to start building it." };

  let results = data;
  if (input.brand) {
    const brandLower = String(input.brand).toLowerCase();
    results = results.filter((r: any) => {
      const mentions = Array.isArray(r.brand_mentions) ? r.brand_mentions : [];
      return mentions.some((m: any) => String(m).toLowerCase().includes(brandLower));
    });
    if (results.length === 0) return { result: `No videos in library mention "${input.brand}".` };
  }

  const lines = results.map((r: any) => {
    const dur = r.duration_seconds ? `${Math.round(r.duration_seconds)}s` : "?";
    const date = (r.created_at || "").slice(0, 10);
    const topics = Array.isArray(r.key_topics) ? r.key_topics.slice(0, 3).join(", ") : "";
    return `• [${r.id}] "${r.title}" · ${date} · ${dur}\n   ${r.summary || "(no summary yet)"}\n   Topics: ${topics}`;
  });
  return { result: `${results.length} video${results.length !== 1 ? "s" : ""} in your content library (newest first):\n\n${lines.join("\n\n")}` };
}

// ─── POSTING & DEDUP ───────────────────────────────────────────────────────
async function logContentPost(input: any, ctx: any) {
  const platform = (input.platform || "").toLowerCase().trim();
  if (!platform) return { result: "Error: platform required." };

  const row: any = {
    user_id: ctx.user_id,
    source_artifact_id: input.artifact_id || null,
    source_transcript_id: input.transcript_id || null,
    platform,
    platform_post_id: input.platform_post_id || null,
    post_url: input.post_url || null,
    caption_used: input.caption_used || null,
    hashtags_used: Array.isArray(input.hashtags_used) ? input.hashtags_used : [],
    status: input.status || "posted",
    posted_at: input.posted_at || new Date().toISOString(),
    scheduled_for: input.scheduled_for || null,
    notes: input.notes || null,
  };

  // If an artifact_id was provided but no transcript_id, look up the transcript automatically
  if (row.source_artifact_id && !row.source_transcript_id) {
    const { data: t } = await ctx.supabase.from("content_transcripts")
      .select("id").eq("source_artifact_id", row.source_artifact_id).maybeSingle();
    if (t) row.source_transcript_id = t.id;
  }

  const { data, error } = await ctx.supabase.from("content_posts").insert(row).select().single();
  if (error) return { result: `Error logging post: ${error.message}` };

  return {
    result: `✓ Logged: ${platform} ${row.status === "posted" ? "post" : row.status} on ${(row.posted_at || "").slice(0, 10)}${row.post_url ? ` — ${row.post_url}` : ""}.`,
    artifact: { type: "content_post", title: `${platform} ${row.status}`, id: data.id },
  };
}

async function findRepostRisk(input: any, ctx: any) {
  const daysBack = Math.min(Number(input.days_back) || 90, 365);
  const sinceDate = new Date(Date.now() - daysBack * 86400000).toISOString();

  // If specific artifact_id given, check direct match first
  if (input.artifact_id) {
    let q = ctx.supabase.from("content_posts")
      .select("id, platform, posted_at, post_url, caption_used")
      .eq("user_id", ctx.user_id)
      .eq("source_artifact_id", input.artifact_id)
      .gte("posted_at", sinceDate);
    if (input.platform) q = q.eq("platform", String(input.platform).toLowerCase());
    const { data, error } = await q.order("posted_at", { ascending: false });
    if (error) return { result: `Error: ${error.message}` };
    if (!data || data.length === 0) return { result: `✓ Safe to post — this specific video has not been posted${input.platform ? ` to ${input.platform}` : ""} in the last ${daysBack} days.` };
    return {
      result: `⚠️ REPOST RISK: this video was already posted ${data.length} time(s) in the last ${daysBack} days:\n${data.map((p: any) => `  • ${p.platform} on ${(p.posted_at || "").slice(0, 10)}${p.post_url ? ` — ${p.post_url}` : ""}`).join("\n")}`,
    };
  }

  // Topic-based search: look at content_transcripts joined to content_posts
  if (!input.topic_keywords) return { result: "Error: provide topic_keywords or artifact_id." };

  const terms = String(input.topic_keywords).toLowerCase().split(/\s+/).filter((t) => t.length >= 3);
  if (terms.length === 0) terms.push(String(input.topic_keywords).toLowerCase());

  // Find transcripts matching the topic
  let tq = ctx.supabase.from("content_transcripts")
    .select("id, title, summary, key_topics")
    .eq("user_id", ctx.user_id);
  const orParts: string[] = [];
  for (const t of terms) {
    const safe = t.replace(/[%,()]/g, "");
    if (!safe) continue;
    orParts.push(`title.ilike.%${safe}%`);
    orParts.push(`summary.ilike.%${safe}%`);
    orParts.push(`full_transcript.ilike.%${safe}%`);
  }
  if (orParts.length) tq = tq.or(orParts.join(","));
  const { data: tData } = await tq;

  if (!tData || tData.length === 0) {
    return { result: `✓ Safe to post — no past videos in your library cover "${input.topic_keywords}".` };
  }

  // Find posts linked to those transcripts
  const transcriptIds = tData.map((t: any) => t.id);
  let pq = ctx.supabase.from("content_posts")
    .select("id, platform, posted_at, post_url, source_transcript_id")
    .eq("user_id", ctx.user_id)
    .in("source_transcript_id", transcriptIds)
    .gte("posted_at", sinceDate);
  if (input.platform) pq = pq.eq("platform", String(input.platform).toLowerCase());
  const { data: pData } = await pq.order("posted_at", { ascending: false });

  if (!pData || pData.length === 0) {
    const titles = tData.slice(0, 3).map((t: any) => `"${t.title}"`).join(", ");
    return { result: `✓ Safe to post — found ${tData.length} related video(s) in library (${titles}) but none have been posted${input.platform ? ` to ${input.platform}` : ""} in the last ${daysBack} days.` };
  }

  const transcriptMap: any = {};
  tData.forEach((t: any) => { transcriptMap[t.id] = t; });
  const lines = pData.map((p: any) => {
    const t = transcriptMap[p.source_transcript_id];
    return `  • ${p.platform} on ${(p.posted_at || "").slice(0, 10)} — "${t?.title || "?"}"${p.post_url ? ` (${p.post_url})` : ""}`;
  });
  return {
    result: `⚠️ REPOST RISK: ${pData.length} related post(s) in the last ${daysBack} days covering similar topics:\n${lines.join("\n")}\n\nConsider a different angle or wait before reposting.`,
  };
}

async function listRecentPosts(input: any, ctx: any) {
  const daysBack = Math.min(Number(input.days_back) || 30, 365);
  const limit = Math.min(Number(input.limit) || 25, 100);
  const sinceDate = new Date(Date.now() - daysBack * 86400000).toISOString();

  let q = ctx.supabase.from("content_posts")
    .select("id, platform, posted_at, post_url, caption_used, source_transcript_id, status, source_artifact_id")
    .eq("user_id", ctx.user_id)
    .gte("posted_at", sinceDate)
    .order("posted_at", { ascending: false })
    .limit(limit);
  if (input.platform) q = q.eq("platform", String(input.platform).toLowerCase());
  const { data, error } = await q;
  if (error) return { result: `Error: ${error.message}` };
  if (!data || data.length === 0) return { result: `No posts logged in the last ${daysBack} days${input.platform ? ` for ${input.platform}` : ""}.` };

  // Pull transcript titles for context
  const transcriptIds = [...new Set(data.map((p: any) => p.source_transcript_id).filter(Boolean))];
  const { data: tData } = transcriptIds.length
    ? await ctx.supabase.from("content_transcripts").select("id, title").in("id", transcriptIds)
    : { data: [] };
  const titleMap: any = {};
  (tData || []).forEach((t: any) => { titleMap[t.id] = t.title; });

  // Group by platform for readability
  const byPlatform: Record<string, any[]> = {};
  for (const p of data) {
    if (!byPlatform[p.platform]) byPlatform[p.platform] = [];
    byPlatform[p.platform].push(p);
  }

  const sections = Object.entries(byPlatform).map(([platform, posts]) => {
    const lines = posts.map((p: any) => {
      const title = titleMap[p.source_transcript_id] || "(unlinked post)";
      return `  • ${(p.posted_at || "").slice(0, 10)} — "${title}"${p.post_url ? ` ${p.post_url}` : ""}`;
    });
    return `${platform.toUpperCase()} (${posts.length}):\n${lines.join("\n")}`;
  });
  return { result: `${data.length} post(s) in last ${daysBack} days:\n\n${sections.join("\n\n")}` };
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

    // Detect brand audit task — when present, skip heavy KB injection and slim tools
    // to fit within rate-limit budgets (audit needs facts + web search, not soul/style)
    const isBrandAudit = /\b(brand audit|reputation audit|saturday audit|brand check|brand sweep)\b/i.test(message);

    // Load knowledge base context (skipped for brand audits)
    const knowledgeBlock = isBrandAudit ? "" : await loadKnowledgeContext(supabase, user_id, message);

    const systemPrompt = isBrandAudit ? `You are ${robot.name}, ${robot.role || "the strategic operator"} at Suarez Global. Your task right now: run the weekly brand audit.

═══ CONTEXT ═══
Today's date: ${today}.
The user (Javier Suarez) operates: Suarez Global, Suarez Capital Partners, Suarez Global Ventures, Tampa Development Group, Clear Capital Group. Flagship product: REAP (real estate analytics platform).

═══ WEEKLY BRAND AUDIT PROTOCOL ═══
1. Use web_search for these queries (one search per query — do not skip):
   • "Javier Suarez real estate"
   • "Suarez Capital"
   • "Suarez Global Ventures"
   • "REAP AI"
   • "Tampa multifamily syndication Javier Suarez"
   • "Tampa real estate REAP AI"
2. From SERPs, capture: Page 1 results, LinkedIn presence/duplicates, YouTube channel signals, press/podcast mentions, event listings, any negative or off-brand mentions.
3. Score brand strength 1–10 using this rubric (use the same rubric every time so scores are comparable week-over-week):
   1-3: minimal/scattered presence
   4-5: some presence but inconsistent
   6-7: solid consistent narrative
   8-9: strong institutional multi-channel
   10: dominant, polished, undeniable
4. Identify EXACTLY 3 wins, 3 critical issues (tied to investor trust / capital conversion / institutional credibility), and 5 prioritized actions for the next 7 days.
5. Call save_brand_audit with the structured report.

Voice: institutional, direct, decisive. Specific and quantified — no filler. After saving, give a one-line summary.` : `You are ${robot.name}, a ${robot.role || "assistant"} working at Suarez Global.

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
      // For brand audit: send only the tools we need (web_search + save_brand_audit)
      // For everything else: full custom tool set + web_search
      const auditTools = TOOLS.filter((t: any) => t.name === "save_brand_audit");
      const customTools = isBrandAudit ? auditTools : TOOLS;
      // Brand audits cap web_search at 6 (one per planned query) and use truncated results to fit tier-1 token budget
      const webSearchTool = isBrandAudit
        ? { type: "web_search_20250305", name: "web_search", max_uses: 6, user_location: { type: "approximate", city: "Tampa", region: "Florida", country: "US", timezone: "America/New_York" } }
        : { type: "web_search_20250305", name: "web_search", max_uses: 8, user_location: { type: "approximate", city: "Tampa", region: "Florida", country: "US", timezone: "America/New_York" } };
      const allTools = [...customTools, webSearchTool];
      // Brand audits use Haiku (cheaper input tokens, fast enough for structured output).
      // Other conversations use whatever model is configured on the robot.
      const modelToUse = isBrandAudit ? "claude-haiku-4-5" : (robot.model || "claude-sonnet-4-5");
      const maxTokens = isBrandAudit ? 4096 : 8192;
      const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY!, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: modelToUse, max_tokens: maxTokens, system: systemPrompt, tools: allTools, messages }),
      });
      const apiData = await apiRes.json();
      // Log API usage (success or failure — both consume tokens or are billable signals)
      await logApiUsage(supabase, {
        user_id,
        robot_id,
        service: "anthropic",
        action: isBrandAudit ? "brand_audit" : "robot_chat",
        model: modelToUse,
        usage: apiData?.usage,
        success: apiRes.ok,
        error_type: apiData?.error?.type,
        iteration: iterations,
      });
      if (!apiRes.ok) {
        // Persist the failed turn so it survives a page refresh
        const errMsg = `⚠️ ${apiData?.error?.type === "rate_limit_error" ? "Rate limit hit — try again in a minute, or add Anthropic API credit to bump your tier." : `Anthropic API error: ${apiData?.error?.message || "unknown"}`}`;
        const failedLog = { timestamp: new Date().toISOString(), user_message: message, assistant_response: errMsg, tool_calls: toolCalls, artifacts, error: true };
        await persistConversation(supabase, user_id, robot_id, failedLog, "workspace");
        return new Response(JSON.stringify({ error: "Anthropic API error", details: apiData, response: errMsg, tool_calls: toolCalls, artifacts }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

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

    const newLog = { timestamp: new Date().toISOString(), user_message: message, assistant_response: finalText, tool_calls: toolCalls, artifacts };
    const conversationId = await persistConversation(supabase, user_id, robot_id, newLog, "workspace");

    return new Response(JSON.stringify({ response: finalText, tool_calls: toolCalls, artifacts, conversation_id: conversationId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error", details: err.message || String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

// Append a turn to a robot's conversation log, creating the row if needed.
async function persistConversation(supabase: any, user_id: string, robot_id: string, newLog: any, channel_type: string): Promise<string | undefined> {
  try {
    const { data: existing } = await supabase.from("robot_conversations").select("id, messages").eq("user_id", user_id).eq("robot_id", robot_id).eq("channel_type", channel_type).maybeSingle();
    if (existing) {
      const existingMessages = Array.isArray(existing.messages) ? existing.messages : [];
      await supabase.from("robot_conversations").update({ messages: [...existingMessages, newLog], updated_at: new Date().toISOString() }).eq("id", existing.id);
      return existing.id;
    } else {
      const { data: newConv } = await supabase.from("robot_conversations").insert({ user_id, robot_id, channel_type, messages: [newLog], status: "active" }).select("id").single();
      return newConv?.id;
    }
  } catch (e) {
    console.error("persistConversation failed:", e);
    return undefined;
  }
}

// Log a single Anthropic API call to api_usage_log.
// Pricing in $ per 1M tokens — keep in sync with anthropic.com/pricing.
const MODEL_PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-7": { in: 15, out: 75 },
  "claude-opus-4-6": { in: 15, out: 75 },
  "claude-sonnet-4-7": { in: 3, out: 15 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-sonnet-4-5": { in: 3, out: 15 },
  "claude-haiku-4-5": { in: 1, out: 5 },
};

function modelPricing(model: string): { in: number; out: number } {
  // Match by prefix so dated variants like "claude-haiku-4-5-20251001" still resolve
  for (const key of Object.keys(MODEL_PRICING)) {
    if (model && model.startsWith(key)) return MODEL_PRICING[key];
  }
  // Conservative default
  return { in: 3, out: 15 };
}

// Detect which workspace the active key belongs to so usage can be partitioned in reports.
// (We don't have a way to introspect this from the key itself; we rely on a marker in the env.)
function workspaceLabel(): string {
  return Deno.env.get("ANTHROPIC_WORKSPACE_LABEL") || "default";
}

async function logApiUsage(supabase: any, opts: {
  user_id: string;
  robot_id?: string;
  service: string;
  action: string;
  model: string;
  usage?: { input_tokens?: number; output_tokens?: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number };
  success: boolean;
  error_type?: string;
  iteration?: number;
}): Promise<void> {
  try {
    const u = opts.usage || {};
    const tokens_in = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
    const tokens_out = u.output_tokens || 0;
    const pricing = modelPricing(opts.model);
    // Cache reads are typically 10% of base cost; we approximate by using base price (slight overestimate, fine for tracking)
    const cost_estimate = (tokens_in / 1_000_000) * pricing.in + (tokens_out / 1_000_000) * pricing.out;

    await supabase.from("api_usage_log").insert({
      user_id: opts.user_id,
      service: opts.service,
      action: opts.action,
      tokens_in,
      tokens_out,
      cost_estimate,
      metadata: {
        model: opts.model,
        robot_id: opts.robot_id || null,
        success: opts.success,
        error_type: opts.error_type || null,
        iteration: opts.iteration || null,
        workspace: workspaceLabel(),
      },
    });
  } catch (e) {
    console.error("logApiUsage failed (non-fatal):", e);
  }
}

// Log a robot-driven action against an external service (Gmail, OpenPhone, Constant Contact, etc.)
// where there's no token-based cost model — just a count + metadata about what was done.
async function logRobotAction(supabase: any, opts: {
  user_id: string;
  robot_id?: string;
  service: string;          // 'google', 'openphone', 'constant_contact', etc.
  action: string;           // 'create_gmail_draft', 'draft_quo_text', 'create_cc_email_draft'
  success: boolean;
  error_type?: string;
  meta?: Record<string, any>; // anything else worth keeping (recipient, subject snippet, persona, etc.)
}): Promise<void> {
  try {
    await supabase.from("api_usage_log").insert({
      user_id: opts.user_id,
      service: opts.service,
      action: opts.action,
      tokens_in: 0,
      tokens_out: 0,
      cost_estimate: 0,
      metadata: {
        robot_id: opts.robot_id || null,
        success: opts.success,
        error_type: opts.error_type || null,
        ...(opts.meta || {}),
      },
    });
  } catch (e) {
    console.error("logRobotAction failed (non-fatal):", e);
  }
}
