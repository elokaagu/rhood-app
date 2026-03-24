/**
 * Shared screen cache: one place for "is fresh?" and get/set so all screens behave consistently.
 * Namespaced by cache name; keys are typically userId or a single key like 'trending' / 'community'.
 *
 * Namespace discipline: one conceptual dataset per namespace to avoid shape collisions.
 */
import { SCREEN_CACHE_STALE_MS } from "./cacheConstants";

/** @type {Record<string, Record<string, { data: unknown, lastLoadedAt: number }>>} */
const stores = Object.create(null);

/** Namespaces that key data by user id — cleared on sign-out via {@link clearScreenCachesForUser}. */
const userScopedNamespaces = new Set();

/**
 * @param {string} namespace - e.g. 'playlists', 'trending', 'notifications', 'profile', 'community'
 * @param {number | { staleMs?: number, userScoped?: boolean }} [staleMsOrOptions] - TTL in ms, or options object
 * @param {{ userScoped?: boolean }} [options] - when second arg is a number, pass `{ userScoped: true }` here
 * @returns {{
 *   getIfFresh: (key: string) => unknown | null,
 *   set: (key: string, data: unknown) => void,
 *   invalidate: (key?: string | number | null) => void,
 *   peek: (key: string) => { data: unknown, lastLoadedAt: number } | null,
 *   hasFresh: (key: string) => boolean,
 * }}
 */
export function createScreenCache(namespace, staleMsOrOptions, options) {
  let staleMs = SCREEN_CACHE_STALE_MS;
  let userScoped = false;

  if (typeof staleMsOrOptions === "number" && Number.isFinite(staleMsOrOptions)) {
    staleMs = staleMsOrOptions;
    userScoped = !!(options && options.userScoped);
  } else if (staleMsOrOptions != null && typeof staleMsOrOptions === "object") {
    const o = staleMsOrOptions;
    if (typeof o.staleMs === "number" && Number.isFinite(o.staleMs)) {
      staleMs = o.staleMs;
    }
    userScoped = !!o.userScoped;
  }

  if (userScoped) {
    userScopedNamespaces.add(namespace);
  }

  if (!stores[namespace]) {
    stores[namespace] = Object.create(null);
  }
  const store = stores[namespace];

  return {
    getIfFresh(key) {
      const k = String(key);
      const entry = store[k];
      if (!entry || !Number.isFinite(entry.lastLoadedAt)) return null;
      if (Date.now() - entry.lastLoadedAt > staleMs) {
        delete store[k];
        return null;
      }
      return entry.data;
    },

    set(key, data) {
      store[String(key)] = { data, lastLoadedAt: Date.now() };
    },

    invalidate(key) {
      if (key !== undefined && key !== null) {
        delete store[String(key)];
      } else {
        Object.keys(store).forEach((k) => delete store[k]);
      }
    },

    /** Raw entry for debugging (ignores TTL). */
    peek(key) {
      return store[String(key)] ?? null;
    },

    hasFresh(key) {
      return this.getIfFresh(key) !== null;
    },
  };
}

/**
 * Drop an entire namespace (all keys). Next `createScreenCache` recreates it.
 * Removes user-scoped registration so it must be set again when the cache is recreated.
 * @param {string} namespace
 */
export function clearNamespace(namespace) {
  delete stores[namespace];
  userScopedNamespaces.delete(namespace);
}

/**
 * Call on sign-out so the next user doesn't see the previous user's cached data.
 * Only namespaces created with `{ userScoped: true }` are cleared for this user id.
 * @param {string} [userId] - The user who is signing out.
 */
export function clearScreenCachesForUser(userId) {
  if (!userId) return;
  userScopedNamespaces.forEach((ns) => {
    if (stores[ns]) delete stores[ns][String(userId)];
  });
}
