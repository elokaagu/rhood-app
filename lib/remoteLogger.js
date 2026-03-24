/**
 * Optional remote logging for TestFlight / field debugging.
 * - Always logs locally.
 * - Remote POST is fire-and-forget when enabled (see app.json `extra` or defaults below).
 * - Do not pass tokens, passwords, or raw PII in `data`; shallow redaction runs on remote payload only.
 *
 * Signatures:
 * - `remoteLog(level, tag, message, data?)`
 * - `remoteLog(tag, message, data?)` — level defaults to `info` (legacy)
 */
import { Platform } from "react-native";
import Constants from "expo-constants";

export const LogLevel = {
  DEBUG: "debug",
  INFO: "info",
  WARN: "warn",
  ERROR: "error",
};

const LEVEL_RANK = {
  debug: 10,
  info: 20,
  warn: 30,
  warning: 30,
  error: 40,
};

const extra = Constants.expoConfig?.extra ?? {};

/** Both must be set: `remoteLogEnabled: true` and a valid `remoteLogUrl` (https). Empty URL = local-only. */
const configuredUrl =
  typeof extra.remoteLogUrl === "string" ? extra.remoteLogUrl.trim() : "";
const REMOTE_LOG_URL = /^https?:\/\//i.test(configuredUrl) ? configuredUrl : "";
const REMOTE_LOG_ENABLED =
  extra.remoteLogEnabled === true && REMOTE_LOG_URL.length > 0;

/** Minimum level sent remotely; local console always prints. */
const REMOTE_MIN_LEVEL =
  typeof extra.remoteLogMinLevel === "string"
    ? extra.remoteLogMinLevel.toLowerCase()
    : "info";

function rank(level) {
  return LEVEL_RANK[String(level).toLowerCase()] ?? LEVEL_RANK.info;
}

function shouldSendRemote(level) {
  return rank(level) >= rank(REMOTE_MIN_LEVEL);
}

function buildContext() {
  const v = Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? null;
  const build =
    Constants.nativeBuildVersion ??
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode ??
    null;
  return {
    platform: Platform.OS,
    appVersion: v,
    buildNumber: build != null ? String(build) : null,
    channel: __DEV__ ? "development" : "production",
  };
}

const SENSITIVE_KEY =
  /token|password|secret|authorization|cookie|bearer|apikey|api_key|refresh|email/i;

function redactForRemote(value, depth = 0) {
  if (value == null || depth > 4) return value;
  if (Array.isArray(value)) {
    return value.map((item) => redactForRemote(item, depth + 1));
  }
  if (typeof value !== "object") return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (SENSITIVE_KEY.test(k)) {
      out[k] = "[REDACTED]";
    } else if (v != null && typeof v === "object") {
      out[k] = redactForRemote(v, depth + 1);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function isPlainRecord(x) {
  return x != null && typeof x === "object" && !Array.isArray(x);
}

const KNOWN_LEVELS = new Set([
  "debug",
  "info",
  "warn",
  "warning",
  "error",
]);

/**
 * @param {string} levelOrTag
 * @param {string} tagOrMessage
 * @param {string} [messageOrData]
 * @param {Record<string, unknown>} [maybeData]
 */
export function remoteLog(levelOrTag, tagOrMessage, messageOrData, maybeData) {
  let level = LogLevel.INFO;
  let tag;
  let message;
  let data = {};

  if (KNOWN_LEVELS.has(String(levelOrTag).toLowerCase())) {
    level = String(levelOrTag).toLowerCase();
    if (level === "warning") level = LogLevel.WARN;
    tag = tagOrMessage;
    message = messageOrData ?? "";
    data = isPlainRecord(maybeData) ? maybeData : {};
  } else {
    tag = levelOrTag;
    message = tagOrMessage;
    data = isPlainRecord(messageOrData) ? messageOrData : {};
  }

  const line = `[${String(level).toUpperCase()}][${tag}] ${message}`;
  if (level === LogLevel.ERROR) {
    console.error(line, data);
  } else if (level === LogLevel.WARN) {
    console.warn(line, data);
  } else {
    console.log(line, data);
  }

  if (!REMOTE_LOG_ENABLED || !shouldSendRemote(level)) return;

  const payload = {
    level,
    tag,
    message,
    data: redactForRemote(data),
    timestamp: new Date().toISOString(),
    ...buildContext(),
  };

  fetch(REMOTE_LOG_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

// remoteLog(LogLevel.ERROR, 'AUTH', 'Refresh failed', { code: 'xyz' });
// remoteLog('PLAYER', 'Seek', { ms: 1200 }); // info level
