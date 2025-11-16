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
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const generated = require("./kb.json");
  if (generated?.chunks?.length) {
    RHOOD_KB.__chunks = generated.chunks;
  }
} catch (e) {
  // No generated KB present; continue with minimal snippets
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
  const apiKey = getApiKey();
  const model =
    opts.model ||
    Constants?.expoConfig?.extra?.openaiModel ||
    DEFAULT_MODEL;

  const systemPrompt =
    opts.systemPrompt ||
    [
      "You are R/HOOD Assistant — an in‑app helper for the R/HOOD mobile app.",
      "STRICT SOURCING POLICY:",
      "- Do NOT use any external or world knowledge. No web, no finance content.",
      "- Answer ONLY using what’s typical for the R/HOOD app UI/flows and the conversation so far.",
      "- If the user asks for anything outside app usage/support, respond:",
      "  \"I only answer questions about the R/HOOD app.\"",
      "STYLE:",
      "- Be concise, prescriptive, and friendly.",
      "- Use Markdown for rich text: headings (###), bold, and bullet lists.",
      "- Prefer short sections with numbered steps.",
      "- Ask one clarifying question if needed.",
    ].join("\n");

  // If no key configured, gracefully fallback
  if (!apiKey) {
    return {
      text:
        "AI is not enabled yet. Ask the team to set EXPO_PUBLIC_OPENAI_API_KEY or extra.openaiApiKey.",
    };
  }

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.6,
        messages: [
          { role: "system", content: systemPrompt },
          // Provide small, relevant KB snippets based on the latest user message
          ...(userMessage?.toLowerCase?.().includes("credit")
            ? [{ role: "system", content: RHOOD_KB.credits }]
            : []),
          // Add retrieved doc chunks if available
          ...selectRelevantChunks(userMessage, 4).map((c) => ({
            role: "system",
            content: `Context from ${c.source} — ${c.title}\n\n${c.text}`,
          })),
          ...(opts.history || []).map((m) => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text,
          })),
          { role: "user", content: userMessage },
        ],
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


