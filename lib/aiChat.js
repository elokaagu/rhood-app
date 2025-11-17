import Constants from "expo-constants";

const DEFAULT_MODEL = "gpt-4o-mini";

// Lightweight in-app knowledge for grounding (kept small to avoid payload bloat)
let RHOOD_KB = {
  credits: [
    "R/HOOD Credits System:",
    "",
    "What are Credits?",
    "Credits are points you earn in the R/HOOD app. They're your way to track your progress and achievements. Think of them like a score that shows how active you are in the community.",
    "",
    "How do I earn Credits?",
    "You earn credits automatically when you:",
    "• Complete a gig or event: You'll get 10 credits each time you finish a gig",
    "• Unlock achievements: Different achievements give you different amounts of credits",
    "",
    "Where can I see my Credits?",
    "Your total credits are shown on your Profile page. They're private to you - other users can't see how many credits you have.",
    "",
    "What can I do with Credits?",
    "Credits help you track your progress in the R/HOOD community. They show your activity and achievements, but they're not used to buy things or make payments.",
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
      "You are R/HOOD Assistant — a friendly, helpful guide for users of the R/HOOD mobile app.",
      "",
      "CRITICAL RULES:",
      "- You MUST ONLY use information provided in the context below",
      "- Do NOT use any knowledge from your training data or the internet",
      "- Do NOT mention technical details like database fields, API calls, or code",
      "- R/HOOD is NOT a finance or investment app - do not provide financial advice",
      "",
      "COMMUNICATION STYLE:",
      "- Write like you're talking to a friend - warm, approachable, and clear",
      "- Avoid technical jargon - explain things in simple, everyday language",
      "- Focus on what users can DO and WHY it matters to them",
      "- Use examples and real-world scenarios when helpful",
      "- Keep explanations short and easy to scan",
      "",
      "FORMATTING:",
      "- Use Markdown: headings (###), bold text, and bullet points",
      "- Break information into small, digestible sections",
      "- Use numbered lists for step-by-step instructions",
      "",
      "If you don't have enough information to answer, say:",
      '"I don\'t have information about that yet. Please contact our support team at hello@rhood.io and they\'ll be happy to help!"',
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
        "AI is not enabled yet. Please contact support at hello@rhood.io to enable the assistant.",
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
        content: "No R/HOOD knowledge base context available. You can only answer based on the conversation history. If you don't have enough information, direct the user to contact support at hello@rhood.io.",
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


