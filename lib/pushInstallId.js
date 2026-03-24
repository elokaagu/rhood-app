/**
 * Stable per-install id for push token rows (not a hardware device id).
 * Persists until app uninstall; survives user sign-in/out.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@rhood/push_install_id";

function randomUuidV4() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getOrCreatePushInstallId() {
  const existing = await AsyncStorage.getItem(KEY);
  if (existing) return existing;
  const id = randomUuidV4();
  await AsyncStorage.setItem(KEY, id);
  return id;
}
