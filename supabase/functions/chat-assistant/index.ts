import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const DEFAULT_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";

interface ChatRequest {
  userMessage: string;
  history?: Array<{ sender: string; text: string }>;
  model?: string;
  systemPrompt?: string;
  kbContext?: string[];
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

    // Parse request body
    const body: ChatRequest = await req.json();
    const {
      userMessage,
      history = [],
      model = DEFAULT_MODEL,
      systemPrompt,
      kbContext = [],
    } = body;

    if (!userMessage || !userMessage.trim()) {
      return new Response(
        JSON.stringify({ error: "userMessage is required" }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    // Build system prompt
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

    const finalSystemPrompt = systemPrompt || defaultSystemPrompt;

    // Build messages array
    const messages: Array<{ role: string; content: string }> = [
      { role: "system", content: finalSystemPrompt },
    ];

    // Add KB context if provided
    if (kbContext.length > 0) {
      messages.push({
        role: "system",
        content: `Additional context from R/HOOD documentation:\n\n${kbContext.join(
          "\n\n"
        )}`,
      });
    }

    // Add conversation history
    for (const msg of history) {
      messages.push({
        role: msg.sender === "user" ? "user" : "assistant",
        content: msg.text,
      });
    }

    // Add current user message
    messages.push({ role: "user", content: userMessage });

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
          model,
          temperature: 0.6,
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
