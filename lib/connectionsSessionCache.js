/**
 * In-memory session cache for Connections tab data (per user).
 * Survives hook remounts while the JS runtime lives; not persisted to disk.
 */

const store = Object.create(null);

function cloneConnectionsSnapshot(value) {
  return Array.isArray(value) ? [...value] : value;
}

function cloneObjectSnapshot(value) {
  return value && typeof value === "object" ? { ...value } : value;
}

/**
 * @param {string} userId
 * @returns {object|null}
 */
export function connectionsSessionCacheGet(userId) {
  if (!userId) return null;
  const value = store[userId];
  if (!value) return null;
  return {
    ...value,
    connections: cloneConnectionsSnapshot(value.connections),
    lastMessages: cloneObjectSnapshot(value.lastMessages),
    communitiesData: cloneObjectSnapshot(value.communitiesData),
  };
}

/**
 * @param {string} userId
 * @param {{ user?: object, connections?: unknown[], lastMessages?: object, communitiesData?: object, lastLoadedAt?: number }} snapshot
 */
export function connectionsSessionCacheSet(userId, snapshot) {
  if (!userId) return;
  store[userId] = {
    ...snapshot,
    userId,
    connections: cloneConnectionsSnapshot(snapshot?.connections),
    lastMessages: cloneObjectSnapshot(snapshot?.lastMessages),
    communitiesData: cloneObjectSnapshot(snapshot?.communitiesData),
    lastLoadedAt:
      typeof snapshot?.lastLoadedAt === "number" && Number.isFinite(snapshot.lastLoadedAt)
        ? snapshot.lastLoadedAt
        : Date.now(),
  };
}

/** @param {string} [userId] omit to clear all */
export function connectionsSessionCacheClear(userId) {
  if (userId) {
    delete store[userId];
    return;
  }
  Object.keys(store).forEach((k) => delete store[k]);
}

/**
 * @param {string} userId
 * @param {number} staleMs
 */
export function connectionsSessionCacheIsFresh(userId, staleMs) {
  if (!Number.isFinite(staleMs) || staleMs < 0) return false;
  const c = store[userId];
  if (!c || !Number.isFinite(c.lastLoadedAt)) return false;
  return Date.now() - c.lastLoadedAt <= staleMs;
}
