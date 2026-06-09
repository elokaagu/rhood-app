import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_MODE = "@rhood/app_tutorial_mode_enabled";
const KEY_DISMISSED = "@rhood/app_tutorial_dismissed_screens";

export async function getTutorialModeEnabled() {
  try {
    const v = await AsyncStorage.getItem(KEY_MODE);
    // First-time users (nothing stored yet) get Tutorial mode ON by default.
    // Once they explicitly toggle it, that choice ("true"/"false") is respected.
    if (v === null) return true;
    return v === "true";
  } catch {
    return true;
  }
}

export async function setTutorialModeEnabled(enabled) {
  try {
    await AsyncStorage.setItem(KEY_MODE, enabled ? "true" : "false");
  } catch {
    /* ignore */
  }
}

export async function getDismissedTutorialScreens() {
  try {
    const raw = await AsyncStorage.getItem(KEY_DISMISSED);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function dismissScreenTutorial(screenId) {
  const d = await getDismissedTutorialScreens();
  d[screenId] = true;
  try {
    await AsyncStorage.setItem(KEY_DISMISSED, JSON.stringify(d));
  } catch {
    /* ignore */
  }
}

export async function resetAllDismissedTutorials() {
  try {
    await AsyncStorage.removeItem(KEY_DISMISSED);
  } catch {
    /* ignore */
  }
}
