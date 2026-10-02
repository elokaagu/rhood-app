/**
 * Help chat replies come from OpenAI via our chat-assistant Edge Function.
 * App Review Guideline 5.1.2(i): ask before sending messages to a third-party AI.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { rhoodAlert } from "./rhoodAlert";

const STORAGE_KEY = "rhood_help_chat_ai_consent";
export const AI_CONSENT_GRANTED = "granted";
export const AI_CONSENT_DECLINED = "declined";

export const AI_CONSENT_TITLE = "Use AI answers?";
export const AI_CONSENT_MESSAGE =
  "To answer your question, Help chat sends your messages (not your profile, email, or contacts) to OpenAI, our AI provider. OpenAI processes them only to generate a reply and does not use them to train its models. Without AI, you'll get standard help articles and can still contact our team.";

export async function getHelpChatAiConsent() {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function setHelpChatAiConsent(value) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Non-fatal: the user is asked again next time.
  }
}

/** Resolves true when the user allows AI replies; asks once and remembers the answer. */
export async function ensureHelpChatAiConsent() {
  const saved = await getHelpChatAiConsent();
  if (saved === AI_CONSENT_GRANTED) return true;
  if (saved === AI_CONSENT_DECLINED) return false;

  return new Promise((resolve) => {
    rhoodAlert(AI_CONSENT_TITLE, AI_CONSENT_MESSAGE, [
      {
        text: "Not now",
        style: "cancel",
        onPress: () => {
          setHelpChatAiConsent(AI_CONSENT_DECLINED);
          resolve(false);
        },
      },
      {
        text: "Allow",
        onPress: () => {
          setHelpChatAiConsent(AI_CONSENT_GRANTED);
          resolve(true);
        },
      },
    ]);
  });
}
