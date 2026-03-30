/**
 * Server-side Expo push: called from Postgres (pg_net) after a `notifications` row
 * is inserted for a new DM. Uses service role to read tokens + user settings.
 *
 * Secrets (Dashboard → Edge Functions → send-expo-push → Secrets):
 *   INTERNAL_PUSH_SECRET — must match `expo_push_delivery_config.internal_secret` in DB
 *
 * Auto-provided by Supabase: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushBody {
  user_id?: string;
  title?: string;
  body?: string;
  data?: Record<string, unknown>;
}

function isDeviceNotRegisteredTicket(ticket: {
  details?: { error?: string };
  message?: string;
}): boolean {
  if (ticket?.details?.error === "DeviceNotRegistered") return true;
  const msg = ticket?.message;
  return typeof msg === "string" && msg.includes("not a registered push");
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
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

  let payload: PushBody;
  try {
    payload = (await req.json()) as PushBody;
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const userId = payload.user_id?.trim();
  const title = payload.title?.trim() || "Notification";
  const bodyText = payload.body?.trim() || "";

  if (!userId) {
    return jsonResponse({ error: "user_id required" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: settings } = await supabase
    .from("user_settings")
    .select("push_notifications, message_notifications")
    .eq("user_id", userId)
    .maybeSingle();

  const pushOn = settings?.push_notifications !== false;
  const messageOn = settings?.message_notifications === true;
  const isMessage =
    String((payload.data as { type?: string } | undefined)?.type ?? "")
      .toLowerCase() === "message";

  if (!pushOn) {
    return jsonResponse({ ok: true, skipped: "push_notifications_disabled" });
  }
  if (isMessage && !messageOn) {
    return jsonResponse({
      ok: true,
      skipped: "message_notifications_disabled",
    });
  }

  let data: Record<string, unknown> = {
    ...(typeof payload.data === "object" && payload.data !== null
      ? payload.data
      : {}),
  };

  if (isMessage) {
    const relatedId = data.related_id as string | undefined;
    if (relatedId) {
      const { data: msg } = await supabase
        .from("messages")
        .select("sender_id, thread_id")
        .eq("id", relatedId)
        .maybeSingle();
      if (msg?.sender_id) {
        data = {
          ...data,
          sender_id: msg.sender_id,
          thread_id: msg.thread_id ?? undefined,
        };
      }
    }
  }

  const { data: rows, error: tokenError } = await supabase
    .from("user_expo_tokens")
    .select("expo_token")
    .eq("user_id", userId);

  if (tokenError) {
    console.error("user_expo_tokens select error:", tokenError);
    return jsonResponse({ error: "Token lookup failed" }, 500);
  }

  const tokens = [
    ...new Set(
      (rows ?? [])
        .map((r) => r.expo_token)
        .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
    ),
  ];

  if (!tokens.length) {
    return jsonResponse({ ok: true, skipped: "no_expo_tokens" });
  }

  const messages = tokens.map((to) => ({
    to,
    sound: "default",
    title,
    body: bodyText,
    data,
  }));

  const expoRes = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(messages),
  });

  const result = await expoRes.json().catch(() => ({}));
  const tickets = Array.isArray(result.data)
    ? result.data
    : result.data
      ? [result.data]
      : [];

  let anyOk = false;
  for (let i = 0; i < tickets.length; i++) {
    const ticket = tickets[i];
    if (ticket?.status === "ok") {
      anyOk = true;
    } else if (isDeviceNotRegisteredTicket(ticket) && tokens[i]) {
      await supabase
        .from("user_expo_tokens")
        .delete()
        .eq("user_id", userId)
        .eq("expo_token", tokens[i]);
    }
  }

  if (!anyOk) {
    console.error("Expo push failed:", result);
    return jsonResponse(
      {
        ok: false,
        error: result?.message ?? "Expo push rejected",
        details: result,
      },
      502
    );
  }

  return jsonResponse({ ok: true, sent: tokens.length });
});
