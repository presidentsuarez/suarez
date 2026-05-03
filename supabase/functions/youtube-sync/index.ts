// youtube-sync — for each content_post on platform=youtube, fetch latest stats
// from YouTube Data API and write a fresh content_performance row.
//
// POST body: { user_id, post_id?: optional — sync just one post }
// Called by:
//   - Daily pg_cron (no specific post_id, syncs all)
//   - Manual "Sync now" button in Studio (single post or all)

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

// Get a fresh Google access token, refreshing if expired. Requires youtube.readonly scope.
async function getYouTubeToken(supabase: any, user_id: string): Promise<string | null> {
  const { data: tokenRow } = await supabase.from("gmail_tokens")
    .select("access_token, refresh_token, expires_at, scopes")
    .eq("user_id", user_id).maybeSingle();
  if (!tokenRow?.access_token) return null;
  if (!(tokenRow.scopes || "").includes("youtube")) return null;

  if (tokenRow.expires_at && new Date(tokenRow.expires_at).getTime() - Date.now() < 60000) {
    const refreshRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `client_id=${GOOGLE_CLIENT_ID}&client_secret=${GOOGLE_CLIENT_SECRET}&refresh_token=${tokenRow.refresh_token}&grant_type=refresh_token`,
    });
    const rd = await refreshRes.json();
    if (rd.access_token) {
      await supabase.from("gmail_tokens").update({
        access_token: rd.access_token,
        expires_at: new Date(Date.now() + (rd.expires_in || 3600) * 1000).toISOString(),
      }).eq("user_id", user_id);
      return rd.access_token;
    }
    return null;
  }
  return tokenRow.access_token;
}

// Extract a YouTube video ID from various URL forms
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  // Last-resort: if the URL itself looks like an 11-char video id
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { user_id, post_id } = body;
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = await getYouTubeToken(supabase, user_id);
    if (!token) {
      return new Response(JSON.stringify({ error: "YouTube not connected. Visit /youtube-auth to grant access." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find YouTube posts to sync
    let q = supabase.from("content_posts")
      .select("id, post_url, platform_post_id")
      .eq("user_id", user_id)
      .eq("platform", "youtube");
    if (post_id) q = q.eq("id", post_id);
    const { data: posts, error: pErr } = await q;
    if (pErr) {
      return new Response(JSON.stringify({ error: pErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!posts || posts.length === 0) {
      return new Response(JSON.stringify({ success: true, synced: 0, message: "No YouTube posts to sync." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build map of postId → videoId
    const postToVideo: Record<string, string> = {};
    const videoIds: string[] = [];
    for (const p of posts) {
      const vid = p.platform_post_id || extractYouTubeId(p.post_url || "");
      if (!vid) continue;
      postToVideo[p.id] = vid;
      videoIds.push(vid);
    }
    if (videoIds.length === 0) {
      return new Response(JSON.stringify({ success: true, synced: 0, skipped: posts.length, message: "No valid YouTube video IDs found in post URLs." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // YouTube Data API: videos endpoint accepts up to 50 IDs per request, comma-separated
    const results: any[] = [];
    const errors: any[] = [];
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      const url = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet,contentDetails&id=${batch.join(",")}`;
      const ytRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const ytData = await ytRes.json();
      if (!ytRes.ok) {
        errors.push({ status: ytRes.status, body: ytData });
        continue;
      }
      results.push(...(ytData.items || []));
    }

    // Map video_id → stats
    const statsMap: Record<string, any> = {};
    for (const item of results) {
      statsMap[item.id] = item;
    }

    // Insert one content_performance row per post
    const perfRows: any[] = [];
    let synced = 0;
    let notFound = 0;
    for (const post of posts) {
      const vid = postToVideo[post.id];
      if (!vid) continue;
      const stats = statsMap[vid];
      if (!stats) { notFound++; continue; }
      const s = stats.statistics || {};
      // ISO 8601 duration like PT1M30S → seconds (best-effort parse for snapshot context)
      let durationSec: number | null = null;
      if (stats.contentDetails?.duration) {
        const m = stats.contentDetails.duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (m) durationSec = (Number(m[1] || 0) * 3600) + (Number(m[2] || 0) * 60) + Number(m[3] || 0);
      }
      perfRows.push({
        user_id,
        post_id: post.id,
        synced_at: new Date().toISOString(),
        views: Number(s.viewCount || 0),
        likes: Number(s.likeCount || 0),
        comments: Number(s.commentCount || 0),
        // YouTube Data API doesn't expose shares/saves/watch_time without YouTube Analytics API access
        // (which requires channel ownership and is much more locked down). We log what we can.
        shares: 0,
        saves: 0,
        watch_time_seconds: null,
        avg_view_duration_seconds: null,
        retention_pct: null,
        raw_response: { youtube_video_id: vid, snippet: stats.snippet, statistics: s, duration_seconds: durationSec },
      });
      synced++;

      // Also update the post's platform_post_id if it was missing (so future syncs are faster)
      if (!post.platform_post_id) {
        await supabase.from("content_posts").update({ platform_post_id: vid }).eq("id", post.id);
      }
    }

    if (perfRows.length > 0) {
      const { error: insErr } = await supabase.from("content_performance").insert(perfRows);
      if (insErr) {
        return new Response(JSON.stringify({ error: insErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Log usage
    await supabase.from("api_usage_log").insert({
      user_id,
      service: "youtube_data",
      action: "sync_performance",
      tokens_in: 0, tokens_out: 0, cost_estimate: 0,
      metadata: { synced, not_found: notFound, errors: errors.length, posts_checked: posts.length },
    });

    return new Response(JSON.stringify({
      success: true,
      synced,
      not_found: notFound,
      total_posts: posts.length,
      errors: errors.length ? errors : undefined,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Server error", details: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
