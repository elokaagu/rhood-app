/**
 * Daily "open the app" nudge — a light broadcast push to bring DJs back into
 * R/HOOD. Rotates through friendly copy so it doesn't feel repetitive, and
 * politely steps aside on days the opportunity digest already went out (so a
 * Thursday drop never produces two pushes).
 *
 * Secrets: INTERNAL_PUSH_SECRET (same value as send-expo-push).
 * Auto-provided: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional POST body: { "dry_run": true }
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_SIZE = 100;
// If the opportunity digest fired within this window, skip the nudge today.
const SUPPRESS_IF_DIGEST_WITHIN_HOURS = 18;
// Send at most once every 84 hours (~every 3-4 days). Cron still fires daily
// but skips if not enough time has passed since the last nudge.
const MIN_HOURS_BETWEEN_NUDGES = 84;

// Rotating copy — one is chosen per day so consecutive days differ.
const NUDGE_MESSAGES: { title: string; body: string }[] = [
  { title: "R/HOOD 🎧", body: "Fresh mixes are waiting. Tap in and have a listen →" },
  { title: "R/HOOD 🎧", body: "See who's been spinning in the community today →" },
  { title: "R/HOOD 🎧", body: "Your next gig could be one tap away. Check what's new →" },
  { title: "R/HOOD 🎧", body: "New connections and mixes are live. Come take a look →" },
  { title: "R/HOOD 🎧", body: "Keep your momentum going — open R/HOOD and dig in →" },
  { title: "R/HOOD 🎧", body: "The underground's buzzing. Tap to see what you're missing →" },
  { title: "R/HOOD 🎧", body: "Discover a new mix to vibe to right now →" },
];

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

function hoursSince(iso: string | null | undefined): number {
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Infinity;
  return (Date.now() - t) / 3600000;
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
    // empty body fine
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── Suppression: skip if a nudge already went out, or the opportunity digest
  //    fired recently (so we don't double-notify on release day). ─────────────
  const { data: nudgeState } = await supabase
    .from("daily_nudge_state")
    .select("last_sent_at")
    .eq("id", 1)
    .maybeSingle();

  if (hoursSince(nudgeState?.last_sent_at) < MIN_HOURS_BETWEEN_NUDGES) {
    return jsonResponse({ ok: true, skipped: "nudge_recently_sent" });
  }

  const { data: digestState } = await supabase
    .from("opportunity_digest_state")
    .select("last_sent_at")
    .eq("id", 1)
    .maybeSingle();

  if (hoursSince(digestState?.last_sent_at) < SUPPRESS_IF_DIGEST_WITHIN_HOURS) {
    return jsonResponse({ ok: true, skipped: "opportunity_digest_sent_today" });
  }

  // ── Choose today's copy (rotates day to day) ───────────────────────────────
  const dayIndex = Math.floor(Date.now() / 86400000);
  const pick = NUDGE_MESSAGES[dayIndex % NUDGE_MESSAGES.length];
  const title = pick.title;
  const bodyText = pick.body;
  const data = { type: "daily_nudge", screen: "listen" };

  // ── Resolve audience (opted-in devices) ────────────────────────────────────
  const { data: tokenRows, error: tokenErr } = await supabase
    .from("user_expo_tokens")
    .select("user_id, expo_token");
  if (tokenErr) {
    console.error("token lookup failed:", tokenErr);
    return jsonResponse({ error: "Token lookup failed" }, 500);
  }

  const { data: optedOutRows } = await supabase
    .from("user_settings")
    .select("user_id")
    .eq("push_notifications", false);
  const optedOut = new Set((optedOutRows ?? []).map((r) => r.user_id));

  const tokenToUser = new Map<string, string>();
  for (const row of tokenRows ?? []) {
    const t = row.expo_token;
    if (typeof t !== "string" || t.trim().length === 0) continue;
    if (optedOut.has(row.user_id)) continue;
    if (!tokenToUser.has(t)) tokenToUser.set(t, row.user_id);
  }
  const tokens = [...tokenToUser.keys()];

  if (dryRun) {
    return jsonResponse({
      ok: true,
      dry_run: true,
      audience: tokens.length,
      title,
      body: bodyText,
    });
  }

  if (tokens.length === 0) {
    return jsonResponse({ ok: true, skipped: "no_opted_in_tokens" });
  }

  // ── Send in batches of 100 ─────────────────────────────────────────────────
  let sent = 0;
  for (let i = 0; i < tokens.length; i += EXPO_BATCH_SIZE) {
    const batch = tokens.slice(i, i + EXPO_BATCH_SIZE);
    const messages = batch.map((to) => ({
      to,
      sound: "default",
      title,
      body: bodyText,
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
        const owner = tokenToUser.get(batch[j]);
        if (owner) {
          await supabase
            .from("user_expo_tokens")
            .delete()
            .eq("user_id", owner)
            .eq("expo_token", batch[j]);
        }
      }
    }
  }

  await supabase
    .from("daily_nudge_state")
    .update({ last_sent_at: new Date().toISOString() })
    .eq("id", 1);

  return jsonResponse({ ok: true, audience: tokens.length, sent });
});
