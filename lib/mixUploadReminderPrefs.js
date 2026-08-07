/**
 * Local dismissal/snooze state for the "upload your first mix" reminder
 * popup. Same shape as appTutorialPrefs — a namespaced AsyncStorage key,
 * fail-open on read errors (missing storage shouldn't nag the user harder).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_SNOOZED_UNTIL = "@rhood/mix_upload_reminder_snoozed_until";
const KEY_DISMISSED = "@rhood/mix_upload_reminder_dismissed";

const SNOOZE_DAYS = 7;

/** True once the user has permanently dismissed the reminder (uploaded a mix, or won't). */
export async function getMixReminderDismissed() {
  try {
    return (await AsyncStorage.getItem(KEY_DISMISSED)) === "true";
  } catch {
    return false;
  }
}

export async function dismissMixReminderForever() {
  try {
    await AsyncStorage.setItem(KEY_DISMISSED, "true");
  } catch {
    /* ignore */
  }
}

/** True while a previous "Maybe later" snooze window hasn't elapsed yet. */
export async function isMixReminderSnoozed() {
  try {
    const raw = await AsyncStorage.getItem(KEY_SNOOZED_UNTIL);
    if (!raw) return false;
    const until = Number(raw);
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

export async function snoozeMixReminder(days = SNOOZE_DAYS) {
  try {
    const until = Date.now() + days * 24 * 60 * 60 * 1000;
    await AsyncStorage.setItem(KEY_SNOOZED_UNTIL, String(until));
  } catch {
    /* ignore */
  }
}
