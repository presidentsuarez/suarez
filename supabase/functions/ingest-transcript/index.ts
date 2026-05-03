// ingest-transcript — pulls transcript from Submagic for a completed project,
// runs AI extraction, saves to content_transcripts.
//
// Called from:
//   - video-webhook (on completion)
//   - video-status-sync (when poller catches a missed webhook)
//   - manual UI "Re-extract" button
//
// POST body: { artifact_id, user_id, force?: boolean }
// Idempotent: skips if transcript already exists, unless force=true.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUBMAGIC_API_KEY = Deno.env.get("SUBMAGIC_API_KEY");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function wordsToText(words: any[]): string {
  if (!Array.isArray(words)) return "";
  return words
    .filter((w: any) => w.type === "word" && w.text)
    .map((w: any) => w.text)
    .join(" ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .trim();
}

async function runAIExtraction(transcript: string, title: string): Promise<{
  summary: string;
  key_topics: string[];
  suggested_hooks: string[];
  brand_mentions: string[];
  suggested_caption: string;
  suggested_hashtags: string[];
}> {
  if (!ANTHROPIC_API_KEY || !transcript || transcript.length < 10) {
    return { summary: "", key_topics: [], suggested_hooks: [], brand_mentions: [], suggested_caption: "", suggested_hashtags: [] };
  }

  const prompt = `You are analyzing a video transcript for Suarez Global, a real estate / capital / tech holding company. Extract structured intelligence about the content for a content library.

Video title: ${title}

Transcript:
${transcript.slice(0, 8000)}

Respond ONLY with valid JSON in this exact shape, no other text:
{
  "summary": "2-3 sentence summary of what this video is about",
  "key_topics": ["array", "of", "5-8", "specific", "topics", "covered"],
  "suggested_hooks": ["3 punchy first-line hooks for social posts about this content, no more than 12 words each"],
  "brand_mentions": ["any Suarez Global brand entities mentioned: REAP, Suarez Capital, Tampa Development Group, etc"],
  "suggested_caption": "A polished 2-paragraph social caption — direct, executive voice, no exclamation points, no 'I hope you're doing well' filler",
  "suggested_hashtags": ["array", "of", "5-10", "hashtags", "without", "the", "#"]
}`;

  const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const apiData = await apiRes.json();
  if (!apiRes.ok) {
    throw new Error(`Anthropic error: ${JSON.stringify(apiData).slice(0, 300)}`);
  }
  const text = apiData?.content?.[0]?.text || "";

  // Strip markdown fences if Claude added them
  const cleaned = text.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      summary: String(parsed.summary || ""),
      key_topics: Array.isArray(parsed.key_topics) ? parsed.key_topics.map(String) : [],
      suggested_hooks: Array.isArray(parsed.suggested_hooks) ? parsed.suggested_hooks.map(String) : [],
      brand_mentions: Array.isArray(parsed.brand_mentions) ? parsed.brand_mentions.map(String) : [],
      suggested_caption: String(parsed.suggested_caption || ""),
      suggested_hashtags: Array.isArray(parsed.suggested_hashtags) ? parsed.suggested_hashtags.map(String) : [],
    };
  } catch (e) {
    throw new Error(`JSON parse error: ${e.message}. Response: ${text.slice(0, 200)}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { artifact_id, user_id, force = false } = await req.json();
    if (!artifact_id || !user_id) {
      return new Response(JSON.stringify({ error: "artifact_id and user_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Idempotent: skip if transcript already exists
    if (!force) {
      const { data: existing } = await supabase
        .from("content_transcripts")
        .select("id, ai_processing_status")
        .eq("source_artifact_id", artifact_id)
        .maybeSingle();
      if (existing && existing.ai_processing_status === "completed") {
        return new Response(JSON.stringify({ success: true, already_processed: true, transcript_id: existing.id }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: artifact } = await supabase
      .from("robot_artifacts")
      .select("id, user_id, title, external_id, payload, artifact_type")
      .eq("id", artifact_id)
      .eq("user_id", user_id)
      .maybeSingle();
    if (!artifact) {
      return new Response(JSON.stringify({ error: "artifact not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!artifact.external_id) {
      return new Response(JSON.stringify({ error: "artifact has no Submagic project ID" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull project (which includes transcript) from Submagic
    const sm = await fetch(`https://api.submagic.co/v1/projects/${artifact.external_id}`, {
      headers: { "x-api-key": SUBMAGIC_API_KEY! },
    });
    const smData = await sm.json();
    if (!sm.ok) {
      return new Response(JSON.stringify({ error: "submagic fetch failed", details: smData }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const words = Array.isArray(smData.words) ? smData.words : [];
    const transcript = wordsToText(words);
    const payload = artifact.payload || {};

    if (!transcript || transcript.length < 5) {
      return new Response(JSON.stringify({ error: "transcript empty (Submagic returned no words)" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pre-create / find row, mark in-progress
    const baseRow = {
      user_id,
      source_artifact_id: artifact.id,
      title: artifact.title || "Untitled",
      duration_seconds: smData?.videoMetaData?.duration || payload?.duration_seconds || null,
      language: smData?.language || payload?.language || "en",
      source_type: payload?.source_type || null,
      external_id: artifact.external_id,
      full_transcript: transcript,
      word_timestamps: words,
      ai_processing_status: "in_progress",
    };

    let transcriptId: string;
    const { data: existing } = await supabase
      .from("content_transcripts")
      .select("id")
      .eq("source_artifact_id", artifact_id)
      .maybeSingle();
    if (existing) {
      transcriptId = existing.id;
      await supabase.from("content_transcripts").update({ ...baseRow, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("content_transcripts")
        .insert(baseRow)
        .select("id")
        .single();
      if (insErr) {
        return new Response(JSON.stringify({ error: "insert failed", details: insErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      transcriptId = inserted.id;
    }

    // Run AI extraction
    let extraction;
    try {
      extraction = await runAIExtraction(transcript, baseRow.title);
    } catch (e) {
      await supabase.from("content_transcripts").update({
        ai_processing_status: "failed",
        ai_processing_error: String(e?.message || e).slice(0, 500),
        updated_at: new Date().toISOString(),
      }).eq("id", transcriptId);
      return new Response(JSON.stringify({
        success: true, transcript_id: transcriptId, ai_failed: true, error: String(e?.message || e),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await supabase.from("content_transcripts").update({
      ai_processing_status: "completed",
      summary: extraction.summary,
      key_topics: extraction.key_topics,
      suggested_hooks: extraction.suggested_hooks,
      brand_mentions: extraction.brand_mentions,
      suggested_caption: extraction.suggested_caption,
      suggested_hashtags: extraction.suggested_hashtags,
      updated_at: new Date().toISOString(),
    }).eq("id", transcriptId);

    // Log usage
    await supabase.from("api_usage_log").insert({
      user_id,
      service: "studio_transcripts",
      action: "ingest_transcript",
      tokens_in: 0, tokens_out: 0, cost_estimate: 0,
      metadata: {
        artifact_id: artifact.id,
        transcript_id: transcriptId,
        success: true,
        word_count: words.length,
        topic_count: extraction.key_topics.length,
        brand_mentions: extraction.brand_mentions,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      transcript_id: transcriptId,
      word_count: words.length,
      summary: extraction.summary,
      key_topics: extraction.key_topics,
      brand_mentions: extraction.brand_mentions,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("ingest-transcript error:", err);
    return new Response(JSON.stringify({ error: "Server error", details: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
