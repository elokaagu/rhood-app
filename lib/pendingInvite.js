import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@rhood/pending_invite_code";

export function normalizeInviteCode(raw) {
  return String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 20);
}

export async function savePendingInviteCode(raw) {
  const code = normalizeInviteCode(raw);
  if (!code) {
    await AsyncStorage.removeItem(KEY);
    return null;
  }
  await AsyncStorage.setItem(KEY, code);
  return code;
}

export async function readPendingInviteCode() {
  const stored = await AsyncStorage.getItem(KEY);
  return normalizeInviteCode(stored);
}

export async function clearPendingInviteCode() {
  await AsyncStorage.removeItem(KEY);
}

export async function consumePendingInviteCode(processFn) {
  const code = await readPendingInviteCode();
  if (!code || typeof processFn !== "function") return false;
  try {
    const ok = await processFn(code);
    return !!ok;
  } finally {
    await clearPendingInviteCode();
  }
}
