// youtube-auth — initiates YouTube OAuth flow, requesting full Google scopes
// (existing Gmail/Drive/Calendar/Contacts) PLUS youtube.readonly so we can
// pull video performance stats. State is the user_id.

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;

// All scopes Suarez Global currently uses + youtube.readonly
const SCOPES = [
  "https://mail.google.com/",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/contacts",
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/youtube.readonly",
];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const userId = url.searchParams.get("user_id");
  if (!userId) {
    return new Response(JSON.stringify({ error: "user_id required as query param" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Redirect URI must match what's configured in Google Cloud OAuth client.
  // Same project ref, just a different callback path.
  const redirectUri = "https://bkezvsjhaepgvsvfywhk.supabase.co/functions/v1/youtube-callback";

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent", // forces refresh_token even if user has consented before
    state: userId,
    include_granted_scopes: "true",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return Response.redirect(authUrl, 302);
});
