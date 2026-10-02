import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

// Cost controls: the client cannot choose the model, reply length, or volume.
const MODEL = "gpt-4o-mini";
const MAX_REPLY_TOKENS = 500;
const TEMPERATURE = 0.6;
const DAILY_LIMIT_PER_USER = 30;
const MAX_MESSAGES = 14;
const MAX_CHARS_PER_MESSAGE = 4000;
const MAX_TOTAL_CHARS = 24000;

const DAILY_LIMIT_TEXT =
  `You've reached today's limit of ${DAILY_LIMIT_PER_USER} AI answers. ` +
  "You can still browse the Help Center articles or tap **Raise a support ticket** and our team will reply by email.";

function capMessages(
  messages: Array<{ role: string; content: string }>
): Array<{ role: string; content: string }> {
  const systemMessages = messages.filter((m) => m.role === "system");
  const conversation = messages.filter((m) => m.role !== "system").slice(-MAX_MESSAGES);
  let budget = MAX_TOTAL_CHARS;
  const capped: Array<{ role: string; content: string }> = [];
  // Keep the newest conversation turns first, then fit as much system context as remains.
  for (const m of [...conversation].reverse()) {
    const content = String(m.content).slice(0, MAX_CHARS_PER_MESSAGE);
    if (content.length > budget) break;
    budget -= content.length;
    capped.unshift({ role: m.role === "assistant" ? "assistant" : "user", content });
  }
  const system: Array<{ role: string; content: string }> = [];
  for (const m of systemMessages) {
    const content = String(m.content).slice(0, Math.min(MAX_CHARS_PER_MESSAGE * 2, budget));
    if (!content) break;
    budget -= content.length;
    system.push({ role: "system", content });
  }
  return [...system, ...capped];
}

interface LegacyChatRequest {
  userMessage: string;
  history?: Array<{ sender: string; text: string }>;
  model?: string;
  systemPrompt?: string;
  kbContext?: string[];
}

interface MessageRequest {
  role: "system" | "user" | "assistant";
  content: string;
}

interface EndpointChatRequest {
  model?: string;
  messages?: MessageRequest[];
  max_tokens?: number;
  temperature?: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Check for API key
    if (!OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({
          error: "OpenAI API key not configured",
          text: "AI assistant is not configured yet. Please contact support.",
        }),
        {
          status: 503,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: usedToday, error: usageError } = await adminClient
      .from("ai_chat_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", since);
    if (usageError) {
      console.error("Usage check failed:", usageError.message);
    } else if ((usedToday ?? 0) >= DAILY_LIMIT_PER_USER) {
      return new Response(JSON.stringify({ text: DAILY_LIMIT_TEXT, limited: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // Parse request body
    const body = (await req.json()) as LegacyChatRequest | EndpointChatRequest;

    // Always sent first so the assistant stays scoped to R/HOOD support.
    const defaultSystemPrompt = [
      "You are R/HOOD Assistant — an in‑app helper for the R/HOOD mobile app.",
      "STRICT SOURCING POLICY:",
      "- Do NOT use any external or world knowledge. No web, no finance content.",
      "- Answer ONLY using what's typical for the R/HOOD app UI/flows and the conversation so far.",
      "- If the user asks for anything outside app usage/support, respond:",
      '  "I only answer questions about the R/HOOD app."',
      "STYLE:",
      "- Be concise, prescriptive, and friendly.",
      "- Use Markdown for rich text: headings (###), bold, and bullet lists.",
      "- Prefer short sections with numbered steps.",
      "- Ask one clarifying question if needed.",
    ].join("\n");

    let messages: Array<{ role: string; content: string }> = [];
    const requestMessages = (body as EndpointChatRequest).messages;
    const hasMessageArray =
      Array.isArray(requestMessages) &&
      requestMessages.length > 0 &&
      requestMessages.every(
        (m) => typeof m?.role === "string" && typeof m?.content === "string"
      );

    if (hasMessageArray) {
      messages = [
        { role: "system", content: defaultSystemPrompt },
        ...(requestMessages as Array<{ role: string; content: string }>),
      ];
    } else {
      const legacy = body as LegacyChatRequest;
      const userMessage = legacy.userMessage;
      const history = legacy.history || [];
      const systemPrompt = legacy.systemPrompt;
      const kbContext = legacy.kbContext || [];

      if (!userMessage || !userMessage.trim()) {
        return new Response(
          JSON.stringify({ error: "userMessage or messages is required" }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          }
        );
      }

      messages = [{ role: "system", content: defaultSystemPrompt }];
      if (systemPrompt) messages.push({ role: "system", content: systemPrompt });

      if (kbContext.length > 0) {
        messages.push({
          role: "system",
          content: `Additional context from R/HOOD documentation:\n\n${kbContext.join(
            "\n\n"
          )}`,
        });
      }

      for (const msg of history) {
        messages.push({
          role: msg.sender === "user" ? "user" : "assistant",
          content: msg.text,
        });
      }
      messages.push({ role: "user", content: userMessage });
    }

    messages = capMessages(messages);

    const { error: logError } = await adminClient
      .from("ai_chat_usage")
      .insert({ user_id: user.id });
    if (logError) console.error("Usage log failed:", logError.message);

    // Call OpenAI API
    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: MODEL,
          temperature: TEMPERATURE,
          max_tokens: MAX_REPLY_TOKENS,
          messages,
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", openaiResponse.status, errorText);
      return new Response(
        JSON.stringify({
          error: "OpenAI API error",
          text: "I'm having trouble processing your request right now. Please try again in a moment.",
        }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const content =
      openaiData?.choices?.[0]?.message?.content?.trim() ||
      "Sorry—I'm having trouble answering right now.";

    return new Response(JSON.stringify({ text: content }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        text: "An unexpected error occurred. Please try again later.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
