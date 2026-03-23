/**
 * In-memory session cache for Connections tab data (per user).
 * Survives hook remounts while the JS runtime lives; not persisted to disk.
 */

const store = Object.create(null);

/**
 * @param {string} userId
 * @returns {object|null}
 */
export function connectionsSessionCacheGet(userId) {
  if (!userId) return null;
  return store[userId] ?? null;
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
  const c = store[userId];
  if (!c || !Number.isFinite(c.lastLoadedAt)) return false;
  return Date.now() - c.lastLoadedAt <= staleMs;
}
