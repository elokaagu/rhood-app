import Constants from "expo-constants";

const DEFAULT_MODEL = "gpt-4o-mini";

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
    "You are R/HOOD Assistant, a concise, friendly support agent for the R/HOOD app. Tone: upbeat, street-smart, welcoming. Be specific and prescriptive. When giving steps, number them. Avoid fluff. Keep answers short unless the user asks for more. If the user asks about app features, explain how to navigate within the app. If you need to ask a follow-up, ask only one clear question.";

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


