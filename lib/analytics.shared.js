export const debugAnalytics = (...args) => {
  if (__DEV__) console.log("[analytics]", ...args);
};

export const warnAnalytics = (...args) => {
  if (__DEV__) console.warn("[analytics]", ...args);
};

export function normalizeGA4EventName(eventName) {
  const fallback = "custom_event";
  const normalized = String(eventName || fallback)
    .replace(/[^a-zA-Z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase()
    .slice(0, 40);

  if (!normalized) return fallback;
  return /^[a-z]/.test(normalized) ? normalized : `e_${normalized}`.slice(0, 40);
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
