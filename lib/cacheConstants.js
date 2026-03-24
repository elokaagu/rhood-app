/**
 * Shared cache TTL for screen-level caches (Listen, Notifications, Profile, Community, etc.).
 * Data is considered fresh for this many ms; after that, opening the screen triggers a refetch.
 */
export const SCREEN_CACHE_STALE_MS = 60 * 1000;

export const SCREEN_CACHE_STALE_SECONDS = 60;
export const SCREEN_CACHE_STALE_MINUTES = 1;

/** Clamp to a reasonable TTL range for screen caches. */
export function normalizeScreenCacheStaleMs(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return SCREEN_CACHE_STALE_MS;
  return Math.max(5 * 1000, Math.min(10 * 60 * 1000, Math.round(n)));
}
