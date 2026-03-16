/**
 * Shared screen cache: one place for "is fresh?" and get/set so all screens behave consistently.
 * Namespaced by cache name; keys are typically userId or a single key like 'trending' / 'community'.
 */
import { SCREEN_CACHE_STALE_MS } from "./cacheConstants";

const stores = {};

/**
 * @param {string} namespace - e.g. 'playlists', 'trending', 'notifications', 'profile', 'community'
 * @param {number} [staleMs] - TTL in ms (default: SCREEN_CACHE_STALE_MS)
 * @returns {{ getIfFresh: (key: string) => any, set: (key: string, data: any) => void, invalidate: (key?: string) => void }}
 */
export function createScreenCache(namespace, staleMs = SCREEN_CACHE_STALE_MS) {
  if (!stores[namespace]) {
    stores[namespace] = {};
  }
  const store = stores[namespace];

  return {
    getIfFresh(key) {
      const entry = store[key];
      if (!entry || !Number.isFinite(entry.lastLoadedAt)) return null;
      if (Date.now() - entry.lastLoadedAt > staleMs) return null;
      return entry.data;
    },

    set(key, data) {
      store[key] = { data, lastLoadedAt: Date.now() };
    },

    invalidate(key) {
      if (key !== undefined && key !== null) {
        delete store[key];
      } else {
        Object.keys(store).forEach((k) => delete store[k]);
      }
    },
  };
}

/** User-scoped cache namespaces; cleared on sign-out so the next user doesn't see previous data. */
const USER_CACHE_NAMESPACES = ["playlists", "notifications", "profile"];

/**
 * Call on sign-out so the next user doesn't see the previous user's cached data.
 * @param {string} userId - The user who is signing out.
 */
export function clearScreenCachesForUser(userId) {
  if (!userId) return;
  USER_CACHE_NAMESPACES.forEach((ns) => {
    if (stores[ns]) delete stores[ns][userId];
  });
}
