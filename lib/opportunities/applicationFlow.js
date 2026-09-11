import { db } from "../supabase";

/**
 * Loads numbers needed for the post-apply success modal (remaining applications, boost eligibility).
 */
export async function loadPostApplySuccessContext(userId, applicationId) {
  let updatedRemaining = 0;
  try {
    const freshStats = await db.getUserDailyApplicationStats(userId);
    updatedRemaining = freshStats?.remaining_applications || 0;
  } catch (error) {
    if (__DEV__) console.error("Error getting fresh stats:", error);
  }

  let userCredits = 0;
  try {
    const userProfile = await db.getUserProfile(userId);
    userCredits = userProfile?.credits || 0;
  } catch (error) {
    if (__DEV__) console.error("Error getting user credits:", error);
  }

  const canBoost = userCredits >= 10 && Boolean(applicationId);

  return {
    updatedRemaining,
    userCredits,
    canBoost,
    applicationId,
  };
}

/**
 * Keep the opportunity modal on-screen while the apply request is in flight
 * so Apply → Application Sent does not flash a dismissed card.
 */
export function applyingModalConfig(opportunity) {
  return {
    type: "info",
    title: opportunity?.title || "Applying",
    message: opportunity?.description || "",
    eventDetails: {
      date: opportunity?.date,
      time: opportunity?.time,
      compensation: opportunity?.compensation,
      location: opportunity?.location,
      description: opportunity?.description,
      distanceFormatted: opportunity?.distanceFormatted,
    },
    primaryButtonText: "Sending...",
    secondaryButtonText: undefined,
    showCloseButton: false,
    showShareButton: false,
    busy: true,
  };
}

/** Branded copy for the daily application cap (swipe, tap, or server reject). */
export function dailyLimitReachedModalConfig({
  dailyLimit,
  remaining = 0,
  message,
} = {}) {
  return {
    type: "warning",
    title: "Daily Limit Reached",
    message:
      message ||
      `You have reached your daily limit of ${dailyLimit} applications. You have ${remaining} applications remaining today. Please try again tomorrow.`,
    primaryButtonText: "OK",
  };
}

/**
 * @param {unknown} error
 * @returns {{ kind: 'daily_limit' | 'already_applied' | 'missing_mix' | 'generic', message: string }}
 */
export function classifyApplicationError(error) {
  const errorMessage = error?.message || "";
  const isDailyLimitError = errorMessage.includes("Daily application limit");
  const isAlreadyAppliedError = errorMessage.includes("already applied");
  const isMissingMixError = errorMessage.includes("upload at least one mix");

  if (isDailyLimitError) {
    return { kind: "daily_limit", message: errorMessage };
  }
  if (isAlreadyAppliedError) {
    return { kind: "already_applied", message: errorMessage };
  }
  if (isMissingMixError) {
    return { kind: "missing_mix", message: errorMessage };
  }
  return { kind: "generic", message: errorMessage };
}
