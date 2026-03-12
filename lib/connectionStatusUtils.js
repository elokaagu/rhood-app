/**
 * Shared connection status helpers (used by ConnectionsScreen and loaders).
 */
export function normalizeConnectionStatus(status) {
  if (status === undefined || status === null) return null;
  const normalized = status.toString().trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function isAcceptedConnectionStatus(status) {
  const normalized = normalizeConnectionStatus(status);
  return (
    normalized === "accepted" ||
    normalized === "approved" ||
    normalized === "connected"
  );
}

export function isPendingConnectionStatus(status) {
  return normalizeConnectionStatus(status) === "pending";
}
