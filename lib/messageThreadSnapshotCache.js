/**
 * In-memory snapshots of open message threads so returning to a chat can show
 * the last-known messages immediately (similar to WhatsApp) while a refresh runs.
 * Cleared on sign-out — not a source of truth; server + realtime remain authoritative.
 */

/** @typedef {{ threadId?: string | null, messages: unknown[], otherUser?: unknown, communityData?: unknown, memberCount?: number, isConnected?: boolean, connectionStatus?: string | null }} MessageThreadSnapshot */

/** @type {Map<string, MessageThreadSnapshot>} */
const snapshots = new Map();

function cacheKey(userId, chatType, djId, communityId) {
  if (!userId) return null;
  if (chatType === "individual" && djId) {
    return `${userId}:dm:${djId}`;
  }
  if (chatType === "group" && communityId) {
    return `${userId}:grp:${communityId}`;
  }
  return null;
}

/**
 * @param {string} userId
 * @param {string} chatType
 * @param {string} [djId]
 * @param {string} [communityId]
 * @returns {MessageThreadSnapshot | null}
 */
export function getMessageThreadSnapshot(userId, chatType, djId, communityId) {
  const key = cacheKey(userId, chatType, djId, communityId);
  if (!key) return null;
  const snap = snapshots.get(key);
  return snap ? { ...snap, messages: Array.isArray(snap.messages) ? snap.messages : [] } : null;
}

/**
 * @param {string} userId
 * @param {string} chatType
 * @param {string} [djId]
 * @param {string} [communityId]
 * @param {MessageThreadSnapshot} snapshot
 */
export function setMessageThreadSnapshot(userId, chatType, djId, communityId, snapshot) {
  const key = cacheKey(userId, chatType, djId, communityId);
  if (!key) return;
  snapshots.set(key, {
    threadId: snapshot.threadId ?? null,
    messages: Array.isArray(snapshot.messages) ? snapshot.messages : [],
    otherUser: snapshot.otherUser,
    communityData: snapshot.communityData,
    memberCount: snapshot.memberCount ?? 0,
    isConnected: snapshot.isConnected,
    connectionStatus: snapshot.connectionStatus ?? null,
  });
}

/**
 * Drop all cached threads for this user (call on sign-out).
 * @param {string} [userId]
 */
export function clearMessageThreadSnapshotsForUser(userId) {
  if (!userId) return;
  const prefix = `${userId}:`;
  for (const k of snapshots.keys()) {
    if (k.startsWith(prefix)) {
      snapshots.delete(k);
    }
  }
}
