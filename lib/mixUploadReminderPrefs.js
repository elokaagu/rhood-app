/**
 * Local dismissal/snooze state for the "upload your first mix" reminder
 * popup. Same shape as appTutorialPrefs — a namespaced AsyncStorage key,
 * fail-open on read errors (missing storage shouldn't nag the user harder).
 *
 * Keys are scoped per userId — without that, dismissing/snoozing on one
 * account silently suppresses the reminder for whoever signs into the next
 * account on the same device (shared devices, testers cycling accounts).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_SNOOZED_UNTIL_PREFIX = "@rhood/mix_upload_reminder_snoozed_until:";
const KEY_DISMISSED_PREFIX = "@rhood/mix_upload_reminder_dismissed:";

const SNOOZE_DAYS = 7;

/** True once the user has permanently dismissed the reminder (uploaded a mix, or won't). */
export async function getMixReminderDismissed(userId) {
  if (!userId) return false;
  try {
    return (await AsyncStorage.getItem(KEY_DISMISSED_PREFIX + userId)) === "true";
  } catch {
    return false;
  }
}

export async function dismissMixReminderForever(userId) {
  if (!userId) return;
  try {
    await AsyncStorage.setItem(KEY_DISMISSED_PREFIX + userId, "true");
  } catch {
    /* ignore */
  }
}

/** True while a previous "Maybe later" snooze window hasn't elapsed yet. */
export async function isMixReminderSnoozed(userId) {
  if (!userId) return false;
  try {
    const raw = await AsyncStorage.getItem(KEY_SNOOZED_UNTIL_PREFIX + userId);
    if (!raw) return false;
    const until = Number(raw);
    return Number.isFinite(until) && Date.now() < until;
  } catch {
    return false;
  }
}

export async function snoozeMixReminder(userId, days = SNOOZE_DAYS) {
  if (!userId) return;
  try {
    const until = Date.now() + days * 24 * 60 * 60 * 1000;
    await AsyncStorage.setItem(KEY_SNOOZED_UNTIL_PREFIX + userId, String(until));
  } catch {
    /* ignore */
  }
}
