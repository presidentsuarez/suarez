// youtube-callback — receives ?code=... from Google, exchanges for tokens,
// saves into gmail_tokens row (the same row that already holds Drive/Gmail/Calendar
// access — we just merge in YouTube scope).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

const APP_URL = "https://app.suarezglobal.com";
const REDIRECT_URI = "https://bkezvsjhaepgvsvfywhk.supabase.co/functions/v1/youtube-callback";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function htmlPage(title: string, body: string, color = "#1C3820"): Response {
  return new Response(`<!doctype html>
<html><head><meta charset="utf-8"><title>${title}</title>
<style>
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px;}
.card{max-width:480px;background:#fff;border-radius:16px;padding:32px;box-shadow:0 8px 24px rgba(0,0,0,0.08);text-align:center;}
h1{color:${color};font-family:Georgia,serif;margin:0 0 12px;font-size:22px;}
p{color:#475569;line-height:1.6;margin:0 0 16px;}
a{display:inline-block;margin-top:12px;padding:10px 22px;border-radius:8px;background:${color};color:#fff;text-decoration:none;font-weight:700;font-size:13px;}
</style></head><body><div class="card">${body}</div></body></html>`, {
    headers: { ...corsHeaders, "Content-Type": "text/html" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return htmlPage("YouTube auth cancelled", `<h1>Authorization cancelled</h1><p>${error}</p><a href="${APP_URL}">Back to app</a>`, "#dc2626");
  }
  if (!code || !state) {
    return htmlPage("YouTube auth error", `<h1>Missing code or state</h1><p>The OAuth callback didn't receive what it needed.</p><a href="${APP_URL}">Back to app</a>`, "#dc2626");
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        grant_type: "authorization_code",
      }).toString(),
    });
    const tokens = await tokenRes.json();
    if (!tokenRes.ok || !tokens.access_token) {
      return htmlPage("Token exchange failed", `<h1>Auth failed</h1><pre>${JSON.stringify(tokens).slice(0, 500)}</pre><a href="${APP_URL}">Back to app</a>`, "#dc2626");
    }

    // Fetch the user's primary Google email (we use this to populate gmail_tokens.email)
    const profileRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await profileRes.json();
    const email = profile.email || null;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Upsert into gmail_tokens — merge new scopes with anything already there
    const { data: existing } = await supabase
      .from("gmail_tokens")
      .select("id, scopes")
      .eq("user_id", state)
      .maybeSingle();

    const newScopes = String(tokens.scope || "").split(" ").filter(Boolean);
    const existingScopes = existing ? String(existing.scopes || "").split(" ").filter(Boolean) : [];
    const mergedScopes = Array.from(new Set([...existingScopes, ...newScopes])).join(" ");

    const expiresAt = new Date(Date.now() + (tokens.expires_in || 3600) * 1000).toISOString();

    if (existing) {
      await supabase.from("gmail_tokens").update({
        access_token: tokens.access_token,
        // refresh_token only included on first consent or when prompt=consent forces it
        ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
        expires_at: expiresAt,
        scopes: mergedScopes,
        ...(email ? { email } : {}),
        updated_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await supabase.from("gmail_tokens").insert({
        user_id: state,
        email: email || "unknown@unknown",
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expires_at: expiresAt,
        scopes: mergedScopes,
      });
    }

    // Pull the user's YouTube channel info to confirm we have access
    let channelInfo = "";
    try {
      const chRes = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const chData = await chRes.json();
      if (chData?.items?.length > 0) {
        const ch = chData.items[0];
        channelInfo = `<p><strong>Connected as:</strong> ${ch.snippet?.title || "?"} · ${Number(ch.statistics?.subscriberCount || 0).toLocaleString()} subscribers</p>`;
      }
    } catch (_) { /* non-fatal */ }

    return htmlPage("YouTube connected", `<h1>✓ YouTube connected</h1>${channelInfo}<p>You can close this window and return to the app. Performance data will start syncing on the next cron run, or you can hit "Sync now" in Studio.</p><a href="${APP_URL}/?tab=studio">Open Studio</a>`);
  } catch (err) {
    return htmlPage("Server error", `<h1>Auth error</h1><pre>${String(err?.message || err)}</pre><a href="${APP_URL}">Back to app</a>`, "#dc2626");
  }
});
