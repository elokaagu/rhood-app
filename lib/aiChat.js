import Constants from "expo-constants";

const DEFAULT_MODEL = "gpt-4o-mini";

// Lightweight in-app knowledge for grounding (kept small to avoid payload bloat)
let RHOOD_KB = {
  credits: [
    "R/HOOD Credits (from app code and migrations):",
    "- Stored on each user as user_profiles.credits (integer).",
    "- Private to the user; used for progression/achievements in-app.",
    "- Awarded automatically when:",
    "  1) A gig is completed (award_gig_credits): +10 credits (typical default).",
    "  2) An achievement is unlocked (award_achievement_credits): +credits_value per achievement.",
    "- You can fetch totals via RPC get_user_credits(user_id).",
    "- UI shows credits on Profile and in stats; they are not a payment instrument.",
  ].join("\n"),
};
// Try to load generated KB (if build:kb has been run)
// Use dynamic import to avoid crashes if file doesn't exist
let kbLoaded = false;
try {
  // Only try to require if we're in a context where it's safe
  if (typeof require !== "undefined") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const generated = require("./kb.json");
      if (generated && generated.chunks && Array.isArray(generated.chunks) && generated.chunks.length > 0) {
        RHOOD_KB.__chunks = generated.chunks;
        kbLoaded = true;
      }
    } catch (requireError) {
      // File doesn't exist or can't be loaded - that's okay
      console.log("KB file not found, using minimal knowledge base");
    }
  }
} catch (e) {
  // No generated KB present; continue with minimal snippets
  console.log("KB loading skipped:", e.message);
}

function selectRelevantChunks(query, max = 5) {
  const chunks = RHOOD_KB.__chunks || [];
  if (!chunks.length || !query) return [];
  const q = query.toLowerCase();
  const terms = Array.from(
    new Set(
      q
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 3)
    )
  );
  const scored = chunks
    .map((c, idx) => {
      const text = `${c.title}\n${c.text}`.toLowerCase();
      let score = 0;
      for (const t of terms) {
        if (text.includes(t)) score += 1;
      }
      return { idx, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((s) => chunks[s.idx]);
  return scored;
}

function getApiKey() {
  // Prefer secure runtime injection if provided
  const fromEnv = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  const fromExtra =
    Constants?.expoConfig?.extra?.openaiApiKey ||
    Constants?.manifest?.extra?.openaiApiKey;
  return fromEnv || fromExtra || "";
}

export async function getAssistantReply(userMessage, opts = {}) {
  const model =
    opts.model ||
    Constants?.expoConfig?.extra?.openaiModel ||
    DEFAULT_MODEL;

  const systemPrompt =
    opts.systemPrompt ||
    [
      "You are R/HOOD Assistant — an in‑app helper for the R/HOOD mobile app.",
      "",
      "CRITICAL: You MUST ONLY use information provided in the context below. Do NOT use:",
      "- Any knowledge from your training data",
      "- General internet knowledge",
      "- Information about other apps or services",
      "- Financial or investment information (R/HOOD is NOT a finance app)",
      "",
      "If the provided context doesn't contain enough information to answer, say:",
      '"I don\'t have information about that in my knowledge base. Please contact support at info@rhood.io for help."',
      "",
      "STYLE:",
      "- Be concise, prescriptive, and friendly.",
      "- Use Markdown for rich text: headings (###), bold, and bullet lists.",
      "- Prefer short sections with numbered steps.",
      "- Ask one clarifying question if needed.",
    ].join("\n");

  // Build RAG context from knowledge base
  const kbContext = [];
  if (userMessage?.toLowerCase?.().includes("credit")) {
    kbContext.push(RHOOD_KB.credits);
  }
  const relevantChunks = selectRelevantChunks(userMessage, 4);
  for (const chunk of relevantChunks) {
    kbContext.push(`Context from ${chunk.source} — ${chunk.title}\n\n${chunk.text}`);
  }

  // Use direct OpenAI API with RAG
  return await getOpenAIReply(userMessage, opts, systemPrompt, kbContext);
}

async function getOpenAIReply(userMessage, opts, systemPrompt, kbContext) {
  const apiKey = getApiKey();
  const model =
    opts.model ||
    Constants?.expoConfig?.extra?.openaiModel ||
    DEFAULT_MODEL;

  if (!apiKey) {
    return {
      text:
        "AI is not enabled yet. Please contact support at info@rhood.io to enable the assistant.",
    };
  }

  try {
    const messages = [{ role: "system", content: systemPrompt }];
    if (kbContext.length > 0) {
      messages.push({
        role: "system",
        content: `=== R/HOOD KNOWLEDGE BASE (ONLY SOURCE OF INFORMATION) ===\n\n${kbContext.join("\n\n")}\n\n=== END OF KNOWLEDGE BASE ===\n\nIMPORTANT: Use ONLY the information above. If the answer isn't in the knowledge base above, tell the user to contact support.`,
      });
    } else {
      // If no KB context, add a strict instruction
      messages.push({
        role: "system",
        content: "No R/HOOD knowledge base context available. You can only answer based on the conversation history. If you don't have enough information, direct the user to contact support at info@rhood.io.",
      });
    }
    messages.push(
      ...(opts.history || []).map((m) => ({
        role: m.sender === "user" ? "user" : "assistant",
        content: m.text,
      })),
      { role: "user", content: userMessage }
    );

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        messages,
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`OpenAI error ${resp.status}: ${errText}`);
    }
    const data = await resp.json();
    const content =
      data?.choices?.[0]?.message?.content?.trim() ||
      "Sorry—I'm having trouble answering right now.";
    return { text: content };
  } catch (error) {
    console.log("AI chat error:", error?.message || error);
    return {
      text:
        "I couldn't reach our assistant just now. Try again in a moment or ask a different question.",
    };
  }
}


