/**
 * Generic transactional email via Resend.
 * Called from Postgres (pg_net) with the same INTERNAL_PUSH_SECRET as send-expo-push.
 *
 * Secrets:
 *   INTERNAL_PUSH_SECRET
 *   RESEND_API_KEY
 *   FROM_EMAIL (optional, default R/HOOD <hello@rhood.io>)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
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

  const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
  if (!resendKey) {
    return jsonResponse({ error: "RESEND_API_KEY is not set" }, 500);
  }

  let payload: {
    to?: string;
    subject?: string;
    html?: string;
    text?: string;
  };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const to = payload.to?.trim();
  const subject = payload.subject?.trim();
  const html = payload.html || payload.text;
  if (!to || !subject || !html) {
    return jsonResponse({ error: "to, subject, and html/text are required" }, 400);
  }

  const from =
    Deno.env.get("FROM_EMAIL")?.trim() || "R/HOOD <hello@rhood.io>";

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text: payload.text || undefined,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    return jsonResponse(
      { error: data?.message || "Resend failed", details: data },
      502
    );
  }

  return jsonResponse({ success: true, id: data?.id || null });
});
