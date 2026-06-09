/**
 * Broadcast Expo push: "N new opportunities on R/HOOD".
 *
 * Designed to be called on a schedule (pg_cron → pg_net → this function). It
 * counts opportunities created since the last digest and, only if there are
 * new ones, sends a single digest push to every opted-in device. This makes it
 * safe to run daily — it stays quiet on days with nothing new, so with a
 * Thursday release cadence it naturally fires on Thursday.
 *
 * Secrets (Dashboard → Edge Functions → send-opportunity-digest → Secrets):
 *   INTERNAL_PUSH_SECRET — must match expo_push_delivery_config.internal_secret
 *
 * Auto-provided by Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional POST body:
 *   { "dry_run": true }  — count + resolve audience but don't send or advance state
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_SIZE = 100; // Expo accepts up to 100 messages per request
// First-ever run has no stored timestamp — only look back this far so we don't
// notify about the entire historical backlog.
const FIRST_RUN_LOOKBACK_HOURS = 24 * 8;

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function isDeviceNotRegisteredTicket(ticket: {
  details?: { error?: string };
  message?: string;
}): boolean {
  if (ticket?.details?.error === "DeviceNotRegistered") return true;
  const msg = ticket?.message;
  return typeof msg === "string" && msg.includes("not a registered push");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type, x-internal-secret",
      },
    });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const expectedSecret = Deno.env.get("INTERNAL_PUSH_SECRET") ?? "";
  const provided = req.headers.get("x-internal-secret") ?? "";
  if (!expectedSecret || provided !== expectedSecret) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  let dryRun = false;
  try {
    const body = await req.json();
    dryRun = body?.dry_run === true;
  } catch {
    // empty body is fine
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── 1. How long since the last digest? ────────────────────────────────────
  const { data: state } = await supabase
    .from("opportunity_digest_state")
    .select("last_sent_at")
    .eq("id", 1)
    .maybeSingle();

  const since =
    state?.last_sent_at ??
    new Date(Date.now() - FIRST_RUN_LOOKBACK_HOURS * 3600 * 1000).toISOString();

  // ── 2. Count new opportunities since then ─────────────────────────────────
  const { data: newOpps, error: oppErr } = await supabase
    .from("opportunities")
    .select("id, title, created_at")
    .gt("created_at", since)
    .order("created_at", { ascending: false });

  if (oppErr) {
    console.error("opportunities lookup failed:", oppErr);
    return jsonResponse({ error: "Opportunities lookup failed" }, 500);
  }

  const count = newOpps?.length ?? 0;
  if (count === 0) {
    return jsonResponse({ ok: true, skipped: "no_new_opportunities", since });
  }

  // ── 3. Compose the digest copy ────────────────────────────────────────────
  const title = "R/HOOD 🎧";
  const body =
    count === 1
      ? `A new opportunity just dropped${
          newOpps?.[0]?.title ? `: ${newOpps[0].title}` : ""
        }. Tap to check it out →`
      : `${count} new opportunities just dropped on R/HOOD. Tap to see what's new →`;
  const data = { type: "opportunity_digest", screen: "opportunities", count };

  // ── 4. Resolve the audience (opted-in devices) ────────────────────────────
  const { data: tokenRows, error: tokenErr } = await supabase
    .from("user_expo_tokens")
    .select("user_id, expo_token");
  if (tokenErr) {
    console.error("token lookup failed:", tokenErr);
    return jsonResponse({ error: "Token lookup failed" }, 500);
  }

  // Users who explicitly turned push off (default is on when no row / null).
  const { data: optedOutRows } = await supabase
    .from("user_settings")
    .select("user_id")
    .eq("push_notifications", false);
  const optedOut = new Set((optedOutRows ?? []).map((r) => r.user_id));

  // token -> user_id (for DeviceNotRegistered cleanup), de-duplicated.
  const tokenToUser = new Map<string, string>();
  for (const row of tokenRows ?? []) {
    const t = row.expo_token;
    if (typeof t !== "string" || t.trim().length === 0) continue;
    if (optedOut.has(row.user_id)) continue;
    if (!tokenToUser.has(t)) tokenToUser.set(t, row.user_id);
  }
  const tokens = [...tokenToUser.keys()];

  if (tokens.length === 0) {
    // No audience, but the opportunities are no longer "new" — advance state so
    // we don't accumulate them for a later, larger blast.
    if (!dryRun) {
      await supabase
        .from("opportunity_digest_state")
        .update({ last_sent_at: new Date().toISOString(), last_count: count })
        .eq("id", 1);
    }
    return jsonResponse({ ok: true, skipped: "no_opted_in_tokens", count });
  }

  if (dryRun) {
    return jsonResponse({
      ok: true,
      dry_run: true,
      count,
      audience: tokens.length,
      title,
      body,
    });
  }

  // ── 5. Send to Expo in batches of 100 ─────────────────────────────────────
  let sent = 0;
  for (let i = 0; i < tokens.length; i += EXPO_BATCH_SIZE) {
    const batch = tokens.slice(i, i + EXPO_BATCH_SIZE);
    const messages = batch.map((to) => ({
      to,
      sound: "default",
      title,
      body,
      data,
    }));

    let result: { data?: unknown } = {};
    try {
      const expoRes = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messages),
      });
      result = await expoRes.json().catch(() => ({}));
    } catch (e) {
      console.error("Expo push batch failed:", e);
      continue;
    }

    const tickets = Array.isArray(result.data)
      ? result.data
      : result.data
        ? [result.data]
        : [];

    for (let j = 0; j < tickets.length; j++) {
      const ticket = tickets[j];
      if (ticket?.status === "ok") {
        sent += 1;
      } else if (isDeviceNotRegisteredTicket(ticket) && batch[j]) {
        const staleToken = batch[j];
        const owner = tokenToUser.get(staleToken);
        if (owner) {
          await supabase
            .from("user_expo_tokens")
            .delete()
            .eq("user_id", owner)
            .eq("expo_token", staleToken);
        }
      }
    }
  }

  // ── 6. Advance the digest watermark so we don't re-notify ──────────────────
  await supabase
    .from("opportunity_digest_state")
    .update({ last_sent_at: new Date().toISOString(), last_count: count })
    .eq("id", 1);

  return jsonResponse({
    ok: true,
    count,
    audience: tokens.length,
    sent,
  });
});
