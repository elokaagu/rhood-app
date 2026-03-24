/**
 * Shared connection status helpers (used by ConnectionsScreen and loaders).
 */
const ACCEPTED_CONNECTION_STATUSES = new Set(["accepted", "approved", "connected"]);
const PENDING_CONNECTION_STATUSES = new Set(["pending"]);
const DECLINED_CONNECTION_STATUSES = new Set(["rejected", "declined", "denied"]);
const BLOCKED_CONNECTION_STATUSES = new Set(["blocked"]);

export function normalizeConnectionStatus(status) {
  if (status === undefined || status === null) return null;
  if (typeof status !== "string" && typeof status !== "number") return null;
  const normalized = String(status).trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function isAcceptedConnectionStatus(status) {
  return ACCEPTED_CONNECTION_STATUSES.has(normalizeConnectionStatus(status));
}

export function isPendingConnectionStatus(status) {
  return PENDING_CONNECTION_STATUSES.has(normalizeConnectionStatus(status));
}

export function isDeclinedConnectionStatus(status) {
  return DECLINED_CONNECTION_STATUSES.has(normalizeConnectionStatus(status));
}

export function isBlockedConnectionStatus(status) {
  return BLOCKED_CONNECTION_STATUSES.has(normalizeConnectionStatus(status));
}

export function isTerminalConnectionStatus(status) {
  const normalized = normalizeConnectionStatus(status);
  if (!normalized) return false;
  return (
    DECLINED_CONNECTION_STATUSES.has(normalized) ||
    BLOCKED_CONNECTION_STATUSES.has(normalized)
  );
}
