import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "../lib/supabase";
import { tutorialContextRef } from "../context/AppTutorialContext";
import { APP_TUTORIAL_SCREEN_IDS } from "../lib/appTutorialContent";
import {
  getMixReminderDismissed,
  isMixReminderSnoozed,
  dismissMixReminderForever,
  snoozeMixReminder,
} from "../lib/mixUploadReminderPrefs";

/** Gap before the first check — lets onboarding's own first-run modals
 * (Complete Profile, Opportunities tutorial tip) claim the screen first. */
const INITIAL_DELAY_MS = 6000;
/** Mirrors scheduleCompleteProfileModal's backoff cadence/cap in App.js. */
const RETRY_DELAY_MS = 1000;
const MAX_RETRIES = 6;

/**
 * One-shot-per-app-open popup nudging users who haven't uploaded any mixes
 * yet. Read-only against `mixes` (via db.hasUserUploadedMixes) and purely
 * local (AsyncStorage) for snooze/dismiss — no schema or server changes.
 *
 * Deliberately its own `visible` + RhoodModal wiring (like the Complete
 * Profile / Audio Error modals in App.js) rather than piggybacking on the
 * shared showCustomModal, so it can't clobber or be clobbered by whatever
 * else happens to be using that shared modal at the same moment.
 */
export default function useMixUploadReminder({ user, isFirstTime }) {
  const [visible, setVisible] = useState(false);
  const checkedRef = useRef(false);
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  useEffect(() => {
    // Reset so a fresh sign-in (different user) gets its own check.
    if (!user?.id) {
      checkedRef.current = false;
      return;
    }
    if (isFirstTime) return; // still mid-onboarding — not eligible yet
    if (checkedRef.current) return;
    checkedRef.current = true;

    const attempt = async (tries = 0) => {
      if (cancelledRef.current) return;

      const ctx = tutorialContextRef.current;
      const tipShowing =
        ctx?.enabled && !ctx?.dismissed?.[APP_TUTORIAL_SCREEN_IDS.OPPORTUNITIES];
      if (tipShowing && tries < MAX_RETRIES) {
        setTimeout(() => attempt(tries + 1), RETRY_DELAY_MS);
        return;
      }

      const [dismissed, snoozed] = await Promise.all([
        getMixReminderDismissed(),
        isMixReminderSnoozed(),
      ]);
      if (cancelledRef.current || dismissed || snoozed) return;

      const hasMixes = await db.hasUserUploadedMixes(user.id);
      if (cancelledRef.current || hasMixes) return;

      setVisible(true);
    };

    const timer = setTimeout(() => attempt(), INITIAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [user?.id, isFirstTime]);

  const dismissForever = useCallback(() => {
    setVisible(false);
    dismissMixReminderForever();
  }, []);

  const snoozeAndClose = useCallback(() => {
    setVisible(false);
    snoozeMixReminder();
  }, []);

  return { visible, dismissForever, snoozeAndClose };
}
