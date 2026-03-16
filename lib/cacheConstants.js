/**
 * Shared cache TTL for screen-level caches (Listen, Notifications, Profile, Community, etc.).
 * Data is considered fresh for this many ms; after that, opening the screen triggers a refetch.
 */
export const SCREEN_CACHE_STALE_MS = 60 * 1000;
