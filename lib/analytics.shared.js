export const debugAnalytics = (...args) => {
  if (__DEV__) console.log("[analytics]", ...args);
};

export const warnAnalytics = (...args) => {
  if (__DEV__) console.warn("[analytics]", ...args);
};

/** Firebase Analytics reserves these names for automatic collection — do not send as custom events. */
const GA4_RESERVED_EVENT_NAMES = new Set([
  "session_start",
  "first_open",
  "in_app_purchase",
  "user_engagement",
  "app_update",
  "app_remove",
  "notification_receive",
  "notification_open",
  "notification_dismiss",
]);

export function normalizeGA4EventName(eventName) {
  const fallback = "custom_event";
  let normalized = String(eventName || fallback)
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase()
    .slice(0, 40);

  if (!normalized) return fallback;
  if (!/^[a-z]/.test(normalized)) {
    normalized = `e_${normalized}`.slice(0, 40);
  }
  if (GA4_RESERVED_EVENT_NAMES.has(normalized)) {
    normalized = `rh_${normalized}`.slice(0, 40);
  }
  return normalized;
}

export function sanitizeAnalyticsParams(input = {}) {
  const output = {};
  for (const [rawKey, rawValue] of Object.entries(input || {})) {
    if (rawValue == null) continue;
    const key = String(rawKey)
      .replace(/[^a-zA-Z0-9_]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40);
    if (!key) continue;

    if (
      typeof rawValue === "string" ||
      typeof rawValue === "number" ||
      typeof rawValue === "boolean"
    ) {
      output[key] =
        typeof rawValue === "string" ? rawValue.slice(0, 100) : rawValue;
    }
  }
  return output;
}
