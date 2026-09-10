/**
 * Send / block / boost orchestration used by screens and by CI tests.
 * Keep these free of React Native so node:test can exercise the real paths.
 */

export function validateBlockTarget(blockerId, blockedId) {
  if (!blockerId || !blockedId || blockerId === blockedId) {
    throw new Error("Unable to block this user.");
  }
  return { blocker_id: blockerId, blocked_id: blockedId };
}

export function interpretBoostRpc(data, error) {
  if (error) throw error;
  return data === true;
}

export function interpretReferralRpc(data, error) {
  if (error) throw error;
  return data === true;
}

export function canAttemptSend({ sending, text, mediaCount }) {
  return !sending && (!!String(text || "").trim() || Number(mediaCount) > 0);
}

/**
 * End-to-end send path with injected IO (supabase/db/block check).
 * Mirrors MessagesScreen → sendIndividualChatMessages.
 */
export async function sendDirectMessageFlow({
  sendIndividualChatMessages,
  supabase,
  db,
  userId,
  djId,
  threadId,
  messageContent,
  mediaArray,
  canMessage,
}) {
  if (!canAttemptSend({ sending: false, text: messageContent, mediaCount: mediaArray?.length || 0 })) {
    return { ok: false, skipped: true };
  }
  return sendIndividualChatMessages({
    supabase,
    db,
    userId,
    djId,
    threadId,
    messageContent,
    mediaArray: mediaArray || [],
    canMessage,
  });
}

export async function blockUserFlow({ insertBlock, blockerId, blockedId }) {
  const row = validateBlockTarget(blockerId, blockedId);
  const { error } = await insertBlock(row);
  if (error && error.code !== "23505") {
    throw error;
  }
  return { ok: true, row };
}

export async function boostApplicationFlow({ rpcBoost, applicationId, hours = 24, creditsCost = 10 }) {
  if (!applicationId) {
    throw new Error("Missing application id");
  }
  const { data, error } = await rpcBoost({
    application_id_param: applicationId,
    boost_duration_hours: hours,
    credits_cost: creditsCost,
  });
  return interpretBoostRpc(data, error);
}
