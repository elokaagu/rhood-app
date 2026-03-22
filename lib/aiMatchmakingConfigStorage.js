/**
 * Persist AI matchmaking preferences (non-secret) + API key (SecureStore).
 * For production, prefer a backend-held key; this supports power-user / dev flows.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

const CONFIG_PREFIX = "aimatch_config_v1_";
const API_KEY_SECURE = (userId) => `aimatch_apikey_v1_${userId}`;
const API_KEY_ASYNC_FALLBACK = (userId) => `aimatch_apikey_fallback_v1_${userId}`;

const DEFAULT_CONFIG = {
  provider: "openai",
  scenario: "standardMatching",
  limit: 10,
  includeReasons: true,
  includeConfidence: true,
};

function configStorageKey(userId) {
  return `${CONFIG_PREFIX}${userId}`;
}

async function getApiKeyStored(userId) {
  try {
    const useSecure = await SecureStore.isAvailableAsync();
    if (useSecure) {
      return (await SecureStore.getItemAsync(API_KEY_SECURE(userId))) || "";
    }
  } catch {
    /* fall through */
  }
  return (await AsyncStorage.getItem(API_KEY_ASYNC_FALLBACK(userId))) || "";
}

async function setApiKeyStored(userId, apiKey) {
  const trimmed = String(apiKey).trim();
  try {
    const useSecure = await SecureStore.isAvailableAsync();
    if (useSecure) {
      if (trimmed === "") {
        await SecureStore.deleteItemAsync(API_KEY_SECURE(userId));
      } else {
        await SecureStore.setItemAsync(API_KEY_SECURE(userId), trimmed);
      }
      await AsyncStorage.removeItem(API_KEY_ASYNC_FALLBACK(userId));
      return;
    }
  } catch {
    /* fall through */
  }
  if (trimmed === "") {
    await AsyncStorage.removeItem(API_KEY_ASYNC_FALLBACK(userId));
  } else {
    await AsyncStorage.setItem(API_KEY_ASYNC_FALLBACK(userId), trimmed);
  }
}

/**
 * @returns {Promise<{ apiKey: string } & typeof DEFAULT_CONFIG | null>}
 */
export async function loadAiMatchmakingConfig(userId) {
  if (!userId) return null;

  try {
    const raw = await AsyncStorage.getItem(configStorageKey(userId));
    const parsed = raw ? JSON.parse(raw) : {};
    const apiKey = await getApiKeyStored(userId);

    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      apiKey,
    };
  } catch (e) {
    console.warn("loadAiMatchmakingConfig:", e);
    return { ...DEFAULT_CONFIG, apiKey: "" };
  }
}

/**
 * @param {string} userId
 * @param {object} config — full config including apiKey (empty string clears key)
 */
export async function saveAiMatchmakingConfig(userId, config) {
  if (!userId) return;

  const { apiKey, ...rest } = config;
  try {
    await AsyncStorage.setItem(
      configStorageKey(userId),
      JSON.stringify(rest)
    );

    if (apiKey != null) {
      await setApiKeyStored(userId, apiKey);
    }
  } catch (e) {
    console.warn("saveAiMatchmakingConfig:", e);
    throw e;
  }
}
