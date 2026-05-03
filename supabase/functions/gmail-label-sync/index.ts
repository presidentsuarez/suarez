// gmail-label-sync — applies Suarez/<Category> labels to Gmail threads based
// on inbox_triage state. Idempotent. Three actions:
//
//   sync_one    — sync a single thread's label to its current triage category
//   sync_all    — backfill: walk every active triage row and ensure its label is right
//   ensure_setup — make sure all category labels exist in Gmail (no thread changes)

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

async function ensureLabel(supabase: any, user_id: string, token: string, categoryName: string): Promise<{ id: string; name: string } | null> {
  const labelName = `Suarez/${categoryName}`;

  // Cache lookup first
  const { data: catRow } = await supabase.from("inbox_categories")
    .select("id, gmail_label_id, gmail_label_name").eq("user_id", user_id).ilike("name", categoryName).maybeSingle();
  if (catRow?.gmail_label_id) {
    return { id: catRow.gmail_label_id, name: catRow.gmail_label_name || labelName };
  }

  // Find or create
  const listRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!listRes.ok) return null;
  const labels = (await listRes.json()).labels || [];
  let label = labels.find((l: any) => l.name === labelName);

  if (!label) {
    const createRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: labelName,
        labelListVisibility: "labelShow",
        messageListVisibility: "show",
      }),
    });
    if (!createRes.ok) return null;
    label = await createRes.json();
  }

  if (catRow?.id && label?.id) {
    await supabase.from("inbox_categories")
      .update({ gmail_label_id: label.id, gmail_label_name: labelName })
      .eq("id", catRow.id);
  }
  return label?.id ? { id: label.id, name: labelName } : null;
}

async function syncOneThread(supabase: any, user_id: string, token: string, threadId: string, categoryName: string, ourLabelIds: Set<string>): Promise<{ ok: boolean; changed: boolean; reason?: string }> {
  // Get thread's current labels
  const tRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=metadata`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!tRes.ok) return { ok: false, changed: false, reason: `gmail status ${tRes.status}` };
  const tData = await tRes.json();
  const allMessages = tData.messages || [];

  const labelsOnThread = new Set<string>();
  for (const m of allMessages) {
    for (const lid of (m.labelIds || [])) labelsOnThread.add(lid);
  }

  // Ensure target label
  const target = await ensureLabel(supabase, user_id, token, categoryName);
  if (!target) return { ok: false, changed: false, reason: "could not ensure label" };

  // Remove our other labels, add the target
  const toRemove = [...labelsOnThread].filter((id) => ourLabelIds.has(id) && id !== target.id);
  const alreadyOn = labelsOnThread.has(target.id);

  if (alreadyOn && toRemove.length === 0) {
    return { ok: true, changed: false };
  }

  const body: any = {};
  if (!alreadyOn) body.addLabelIds = [target.id];
  if (toRemove.length) body.removeLabelIds = toRemove;
  if (Object.keys(body).length === 0) return { ok: true, changed: false };

  const modRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}/modify`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: modRes.ok, changed: modRes.ok, reason: modRes.ok ? undefined : `modify ${modRes.status}` };
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
      return new Response(JSON.stringify({ error: "Gmail not connected" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "ensure_setup") {
      // Make sure all active categories have Gmail labels
      const { data: cats } = await supabase.from("inbox_categories").select("name").eq("user_id", user_id).eq("active", true);
      const created: string[] = [];
      const reused: string[] = [];
      for (const c of (cats || [])) {
        const before = await supabase.from("inbox_categories").select("gmail_label_id").eq("user_id", user_id).ilike("name", c.name).maybeSingle();
        const existing = !!before?.data?.gmail_label_id;
        const result = await ensureLabel(supabase, user_id, token, c.name);
        if (result) {
          if (existing) reused.push(c.name);
          else created.push(c.name);
        }
      }
      return new Response(JSON.stringify({ ok: true, created, reused }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sync_one") {
      // Body: { user_id, thread_id, category_name? }
      const { thread_id, category_name } = body;
      if (!thread_id) return new Response(JSON.stringify({ error: "thread_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // If category_name not provided, look it up from the triage row
      let catName = category_name;
      if (!catName) {
        const { data: triage } = await supabase.from("inbox_triage")
          .select("category_id, user_override_category_id")
          .eq("user_id", user_id).eq("gmail_thread_id", thread_id).maybeSingle();
        if (!triage) return new Response(JSON.stringify({ error: "no triage row for thread" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const catId = triage.user_override_category_id || triage.category_id;
        const { data: cat } = await supabase.from("inbox_categories").select("name").eq("id", catId).maybeSingle();
        catName = cat?.name;
      }
      if (!catName) return new Response(JSON.stringify({ error: "could not resolve category" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // Build set of our label IDs (so we know what to strip)
      const { data: cats } = await supabase.from("inbox_categories").select("gmail_label_id").eq("user_id", user_id).not("gmail_label_id", "is", null);
      const ourLabelIds = new Set<string>((cats || []).map((c: any) => c.gmail_label_id));

      const result = await syncOneThread(supabase, user_id, token, thread_id, catName, ourLabelIds);
      return new Response(JSON.stringify({ thread_id, category: catName, ...result }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "sync_all") {
      // Walk every active triage row, ensure label is correct.
      const { data: triages } = await supabase.from("inbox_triage")
        .select("gmail_thread_id, category_id, user_override_category_id")
        .eq("user_id", user_id);

      // Pre-fetch category names
      const catIds = new Set<string>();
      (triages || []).forEach((t: any) => {
        const cid = t.user_override_category_id || t.category_id;
        if (cid) catIds.add(cid);
      });
      const { data: cats } = catIds.size ? await supabase.from("inbox_categories").select("id, name, gmail_label_id").in("id", Array.from(catIds)) : { data: [] };
      const catMap: any = {};
      (cats || []).forEach((c: any) => { catMap[c.id] = c; });
      const ourLabelIds = new Set<string>((cats || []).map((c: any) => c.gmail_label_id).filter(Boolean));

      // Ensure all needed labels exist first
      for (const c of (cats || [])) {
        if (!c.gmail_label_id) {
          const result = await ensureLabel(supabase, user_id, token, c.name);
          if (result) ourLabelIds.add(result.id);
        }
      }

      let synced = 0;
      let skipped = 0;
      let failed = 0;
      const errors: any[] = [];
      for (const t of (triages || [])) {
        const cid = t.user_override_category_id || t.category_id;
        const cat = catMap[cid];
        if (!cat) { skipped++; continue; }
        try {
          const result = await syncOneThread(supabase, user_id, token, t.gmail_thread_id, cat.name, ourLabelIds);
          if (result.ok && result.changed) synced++;
          else if (result.ok) skipped++;
          else { failed++; errors.push({ thread: t.gmail_thread_id, reason: result.reason }); }
        } catch (e) {
          failed++;
          errors.push({ thread: t.gmail_thread_id, error: String(e) });
        }
      }

      return new Response(JSON.stringify({
        ok: true, synced, skipped_already_correct: skipped, failed, error_samples: errors.slice(0, 5),
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("gmail-label-sync error:", err);
    return new Response(JSON.stringify({ error: "Server error", details: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
