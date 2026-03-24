import Constants from "expo-constants";
import {
  AI_CHAT_TRANSPORTS,
  getAiChatTransportConfig,
  validateAiChatTransportConfig,
} from "./aiChatTransportConfig";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_MAX_TOKENS = 500;
const DEFAULT_TEMPERATURE = 0.7;
const REQUEST_TIMEOUT_MS = 20000;
const MAX_RETRIES = 1;
const MAX_HISTORY_TURNS = 12;
const MAX_RELEVANT_CHUNKS = 4;
const MAX_CHARS_PER_CHUNK = 1400;
const MAX_KB_CONTEXT_CHARS = 5000;
const SUPPORT_EMAIL = "hello@rhood.io";
const KB_TOPIC_SYNONYMS = {
  credits: ["credit", "credits", "points", "reward", "rewards", "achievement", "achievements"],
};

const SUPPORT_SYSTEM_PROMPT = [
  "You are the R/HOOD support assistant for DJs.",
  "Use the provided R/HOOD knowledge context as the source of truth for app-specific facts.",
  "Be friendly but direct: answer the question first, then add brief steps.",
  "Ask a follow-up only if it materially helps solve the issue.",
  "Do not provide developer/backend guidance (APIs, OAuth setup, schema, implementation details).",
  `If context does not support an answer, say you're not sure and route to support at ${SUPPORT_EMAIL}.`,
  "Do not use emojis.",
].join("\n");

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
try {
  // Only try to require if we're in a context where it's safe
  if (typeof require !== "undefined") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const generated = require("./kb.json");
      if (generated && generated.chunks && Array.isArray(generated.chunks) && generated.chunks.length > 0) {
        RHOOD_KB.__chunks = generated.chunks;
      }
    } catch (requireError) {
      // File doesn't exist or can't be loaded - that's okay
      if (__DEV__) {
        console.log("KB file not found, using minimal knowledge base");
      }
    }
  }
} catch (e) {
  // No generated KB present; continue with minimal snippets
  if (__DEV__) {
    console.log("KB loading skipped:", e.message);
  }
}

function normalizeText(value) {
  return String(value || "").toLowerCase();
}

function tokenizeQuery(query) {
  const q = normalizeText(query);
  return Array.from(
    new Set(
      q
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 2)
    )
  );
}

function scoreChunkAgainstTerms(chunk, terms) {
  const title = normalizeText(chunk?.title);
  const text = normalizeText(chunk?.text);
  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) score += 3;
    if (text.includes(term)) score += 1;
  }
  // Prefer concise chunks when relevance is equal
  const brevityBonus = Math.max(0, 2000 - text.length) / 2000;
  return score + brevityBonus;
}

function isChunkUserFacing(chunk) {
  // Prefer explicit metadata when available
  const audience = normalizeText(chunk?.audience || chunk?.metadata?.audience);
  if (audience) return audience === "user" || audience === "support";

  // Fallback heuristic only when metadata is missing
  const source = normalizeText(chunk?.source);
  const title = normalizeText(chunk?.title);
  const blockedHints = [
    "api",
    "oauth",
    "setup",
    "developer",
    "team id",
    "services id",
    "backend",
    "database",
    "schema",
    "implementation",
    "architecture",
    "endpoint",
    "rest",
    "websocket",
  ];
  return !blockedHints.some((hint) => source.includes(hint) || title.includes(hint));
}

function dedupeChunks(chunks) {
  const seen = new Set();
  return chunks.filter((chunk) => {
    const key = `${chunk?.source || "unknown"}::${chunk?.title || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function selectRelevantChunks(query, max = MAX_RELEVANT_CHUNKS) {
  const chunks = RHOOD_KB.__chunks || [];
  if (!chunks.length || !query) return [];

  const terms = tokenizeQuery(query);
  const scored = chunks
    .filter(isChunkUserFacing)
    .map((chunk, idx) => {
      return { idx, score: scoreChunkAgainstTerms(chunk, terms), chunk };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((s) => s.chunk);
  return dedupeChunks(scored);
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
  const model = opts.model || Constants?.expoConfig?.extra?.openaiModel || DEFAULT_MODEL;
  const systemPrompt = opts.systemPrompt || SUPPORT_SYSTEM_PROMPT;

  const kbContext = buildGroundingContext(userMessage);
  const messages = buildChatMessages({
    systemPrompt,
    kbContext,
    history: opts.history,
    userMessage,
  });
  const transportConfig = getAiChatTransportConfig(opts);
  const transportValidation = validateAiChatTransportConfig(transportConfig);
  if (!transportValidation.isValid) {
    if (__DEV__) {
      console.warn(
        "AI transport config invalid:",
        transportValidation.errors.join(" | ")
      );
    }
    return {
      text: `AI assistant configuration is incomplete. Please contact support at ${SUPPORT_EMAIL}.`,
    };
  }

  // Transport adapter: supports direct provider call today and backend/edge endpoints.
  return await getAssistantReplyViaTransport({
    opts,
    model,
    messages,
    transportConfig,
  });
}

function buildGroundingContext(userMessage) {
  const context = [];
  const messageLower = normalizeText(userMessage);
  const creditTerms = KB_TOPIC_SYNONYMS.credits;
  const mentionsCredits = creditTerms.some((term) => messageLower.includes(term));
  if (mentionsCredits) {
    context.push(RHOOD_KB.credits);
  }

  const relevantChunks = selectRelevantChunks(userMessage, MAX_RELEVANT_CHUNKS);
  for (const chunk of relevantChunks) {
    const chunkText = String(chunk?.text || "").slice(0, MAX_CHARS_PER_CHUNK);
    context.push(`Context from ${chunk.source} — ${chunk.title}\n\n${chunkText}`);
  }

  const bounded = [];
  let totalChars = 0;
  for (const entry of context) {
    if (!entry) continue;
    if (totalChars + entry.length > MAX_KB_CONTEXT_CHARS) break;
    bounded.push(entry);
    totalChars += entry.length;
  }
  return bounded;
}

function buildChatMessages({ systemPrompt, kbContext, history, userMessage }) {
  const messages = [{ role: "system", content: systemPrompt }];
  if (kbContext.length > 0) {
    messages.push({
      role: "system",
      content: `R/HOOD knowledge context:\n\n${kbContext.join("\n\n")}`,
    });
  } else {
    messages.push({
      role: "system",
      content: `No specific knowledge context matched this question. If unsure, be explicit and route to ${SUPPORT_EMAIL}.`,
    });
  }

  const historyMapped = (history || [])
    .slice(-MAX_HISTORY_TURNS)
    .map((m) => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.text,
    }));
  const last = historyMapped[historyMapped.length - 1];
  const alreadyHasCurrentUserTurn =
    last && last.role === "user" && last.content === userMessage;

  messages.push(...historyMapped);
  if (!alreadyHasCurrentUserTurn) {
    messages.push({ role: "user", content: userMessage });
  }
  return messages;
}

async function fetchWithTimeout(url, options, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function requestAssistantReply({ apiKey, model, messages, maxTokens, temperature }) {
  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const resp = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxTokens,
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
      lastError = error;
      if (attempt >= MAX_RETRIES) break;
    }
  }
  throw lastError;
}

async function requestAssistantReplyViaEndpoint({
  endpoint,
  endpointAuthToken,
  model,
  messages,
  maxTokens,
  temperature,
}) {
  if (!endpoint) {
    throw new Error("ENDPOINT_MISSING");
  }

  const headers = {
    "Content-Type": "application/json",
  };
  if (endpointAuthToken) {
    headers.Authorization = `Bearer ${endpointAuthToken}`;
  }

  const resp = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Endpoint error ${resp.status}: ${errText}`);
  }

  const data = await resp.json();
  const content =
    data?.text?.trim?.() ||
    data?.content?.trim?.() ||
    data?.reply?.trim?.() ||
    data?.choices?.[0]?.message?.content?.trim?.();
  if (!content) {
    throw new Error("ENDPOINT_RESPONSE_INVALID");
  }
  return { text: content };
}

async function getAssistantReplyViaTransport({ opts, model, messages, transportConfig }) {
  const maxTokens = opts.maxTokens || DEFAULT_MAX_TOKENS;
  const temperature = opts.temperature ?? DEFAULT_TEMPERATURE;
  const {
    transport,
    endpoint,
    endpointBearerToken,
    allowDirectFallback,
    allowClientDirectInProduction,
  } = transportConfig;

  if (
    transport === AI_CHAT_TRANSPORTS.EDGE_FUNCTION ||
    transport === AI_CHAT_TRANSPORTS.BACKEND_ENDPOINT
  ) {
    try {
      return await requestAssistantReplyViaEndpoint({
        endpoint,
        endpointAuthToken: endpointBearerToken,
        model,
        messages,
        maxTokens,
        temperature,
      });
    } catch (error) {
      if (allowDirectFallback === false) {
        return handleAssistantError(error);
      }
      if (__DEV__) {
        console.warn("AI endpoint request failed, falling back to direct transport:", error?.message || error);
      }
      return await getOpenAIReply({
        model,
        messages,
        maxTokens,
        temperature,
      });
    }
  }

  if (!__DEV__ && !allowClientDirectInProduction) {
    return {
      text: `AI assistant is currently unavailable in this app version. Please contact support at ${SUPPORT_EMAIL}.`,
    };
  }

  return await getOpenAIReply({
    model,
    messages,
    maxTokens,
    temperature,
  });
}

function handleAssistantError(error) {
  console.error("AI chat error:", error?.message || error);

  if (error?.message === "ENDPOINT_MISSING") {
    return {
      text: "AI assistant endpoint is not configured yet. Please contact support at hello@rhood.io for help.",
    };
  }

  if (error?.message === "API_KEY_MISSING") {
    return {
      text: `AI assistant is not configured yet. Please contact support at ${SUPPORT_EMAIL} for help.`,
    };
  }

  if (
    error?.message?.includes("fetch") ||
    error?.message?.includes("network") ||
    error?.name === "AbortError"
  ) {
    return {
      text: `I'm having trouble connecting right now. Please check your internet connection and try again, or contact support at ${SUPPORT_EMAIL}.`,
    };
  }

  return {
    text: `I couldn't reach our assistant just now. Try again in a moment or ask a different question. If the problem persists, contact support at ${SUPPORT_EMAIL}.`,
  };
}

async function getOpenAIReply({ model, messages, maxTokens, temperature }) {
  const apiKey = getApiKey();

  if (!apiKey) {
    console.warn("⚠️ OpenAI API key not found - AI chat disabled");
    throw new Error("API_KEY_MISSING");
  }

  try {
    return await requestAssistantReply({
      apiKey,
      model,
      messages,
      maxTokens,
      temperature,
    });
  } catch (error) {
    return handleAssistantError(error);
  }
}


