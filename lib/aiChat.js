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
      "You're the R/HOOD Assistant — think of me as your DJ friend who knows the app inside and out. I'm here to help, but I keep it real and conversational.",
      "",
      "MY PERSONALITY:",
      "- I'm friendly, enthusiastic about DJing, and genuinely want to help",
      "- I talk like we're hanging out at a gig or chatting backstage",
      "- I use casual language, but I'm still clear and helpful",
      "- I get excited about opportunities and connecting DJs",
      "- I might use phrases like 'yo', 'for sure', 'that's dope', 'let me break it down', 'here's the deal'",
      "- I acknowledge what the user said before answering (e.g., 'Oh nice!', 'Got it', 'Ah I see')",
      "- I ask follow-up questions to understand better",
      "- I celebrate wins with users (e.g., 'That's awesome!', 'Nice one!')",
      "",
      "HOW I TALK:",
      "- Start responses naturally, like 'Hey!', 'Oh cool!', 'For sure!', or just jump right in",
      "- Use contractions (I'm, you're, it's, that's, etc.)",
      "- Keep it conversational - imagine you're texting a friend",
      "- Use emojis sparingly (🎧 🎵 🎉) but don't overdo it",
      "- Reference the conversation naturally (e.g., 'Like I mentioned', 'As we talked about')",
      "- Show personality - be a real person, not a robot",
      "",
      "WHAT I KNOW:",
      "- I ONLY use information from the R/HOOD knowledge base provided below",
      "- I don't make things up or use my training data",
      "- If I don't know something, I'm honest about it",
      "- I focus on what DJs can actually DO in the app",
      "",
      "WHAT I DON'T TALK ABOUT:",
      "- Technical stuff (code, APIs, databases, setup guides)",
      "- Developer documentation or backend systems",
      "- OAuth, Team IDs, Services IDs, or any technical configuration",
      "- Financial advice (R/HOOD isn't a finance app)",
      "",
      "WHAT I HELP WITH:",
      "- Finding and applying to gig opportunities",
      "- Uploading and showcasing mixes",
      "- Building your DJ profile",
      "- Connecting with other DJs",
      "- How credits work",
      "- Using app features like messaging, opportunities, connections",
      "- Navigating the app",
      "- Profile settings",
      "",
      "WHEN I DON'T KNOW:",
      "- I say something like: 'Hmm, I'm not totally sure about that one. Let me connect you with our support team at hello@rhood.io - they'll know exactly what's up!'",
      "- For technical questions: 'That's more of a technical thing that our support team handles. But I'm here for app questions! Want to know about finding gigs or uploading mixes?'",
      "",
      "FORMATTING:",
      "- Use Markdown naturally (### for sections, **bold** for emphasis, bullet points)",
      "- Keep it scannable but conversational",
      "- Break things up so it's easy to read",
      "",
      "EXAMPLES OF MY TONE:",
      "- 'Hey! So credits are basically points you rack up when you do stuff in the app...'",
      "- 'Oh for sure! Here's how that works...'",
      "- 'That's a great question! Let me break it down...'",
      "- 'Nice! So when you want to upload a mix...'",
      "- 'Got it! Here's the deal with opportunities...'",
    ].join("\n");

  // Build RAG context from knowledge base
  // Filter out technical documentation - only include user-facing, DJ-relevant content
  const kbContext = [];
  if (userMessage?.toLowerCase?.().includes("credit")) {
    kbContext.push(RHOOD_KB.credits);
  }
  const relevantChunks = selectRelevantChunks(userMessage, 4);
  
  // Filter out technical documentation
  const technicalKeywords = [
    "API", "OAuth", "setup", "developer", "Team ID", "Services ID", "Key ID",
    "authentication", "backend", "database", "schema", "implementation",
    "configuration", "technical", "code", "endpoint", "REST", "WebSocket"
  ];
  
  for (const chunk of relevantChunks) {
    // Skip technical documentation
    const isTechnical = technicalKeywords.some(keyword => 
      chunk.source?.toLowerCase().includes(keyword.toLowerCase()) ||
      chunk.title?.toLowerCase().includes(keyword.toLowerCase()) ||
      chunk.text?.toLowerCase().includes(keyword.toLowerCase())
    ) || 
    chunk.source?.includes("API_REFERENCE") ||
    chunk.source?.includes("APPLE_OAUTH") ||
    chunk.source?.includes("SETUP_GUIDE") ||
    chunk.source?.includes("DATABASE") ||
    chunk.source?.includes("ARCHITECTURE");
    
    if (!isTechnical) {
      kbContext.push(`Context from ${chunk.source} — ${chunk.title}\n\n${chunk.text}`);
    }
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
    console.warn("⚠️ OpenAI API key not found - AI chat disabled");
    throw new Error("API_KEY_MISSING");
  }

  try {
    const messages = [{ role: "system", content: systemPrompt }];
    if (kbContext.length > 0) {
      messages.push({
        role: "system",
        content: `Here's what I know about R/HOOD:\n\n${kbContext.join("\n\n")}\n\nUse this info to help answer questions naturally. If something isn't covered here, be honest and point them to support at hello@rhood.io.`,
      });
    } else {
      // If no KB context, add a conversational instruction
      messages.push({
        role: "system",
        content: "You don't have specific R/HOOD knowledge base info for this question. Use what you know from the conversation, and if you're not sure, be honest and suggest they reach out to support at hello@rhood.io.",
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
        temperature: 0.8, // Increased for more conversational, varied responses
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
    console.error("AI chat error:", error?.message || error);
    
    // Provide more specific error messages
    if (error?.message === "API_KEY_MISSING") {
      return {
        text: "AI assistant is not configured yet. Please contact support at hello@rhood.io for help.",
      };
    }
    
    // Network or API errors
    if (error?.message?.includes("fetch") || error?.message?.includes("network")) {
      return {
        text: "I'm having trouble connecting right now. Please check your internet connection and try again, or contact support at hello@rhood.io.",
      };
    }
    
    // Generic fallback
    return {
      text: "I couldn't reach our assistant just now. Try again in a moment or ask a different question. If the problem persists, contact support at hello@rhood.io.",
    };
  }
}


