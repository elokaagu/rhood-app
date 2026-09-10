/**
 * Custom-scheme routes the DJ app can open from email, push, or Studio.
 * Studio can point booking emails at rhood://bookings/{applicationId}.
 */
export function parseBookingRequestDeepLink(url) {
  const raw = String(url || "").trim();
  if (!raw) return null;
  const match = raw.match(
    /(?:^|\/)bookings\/([^/?#]+)/i
  );
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]).trim() || null;
  } catch {
    return match[1].trim() || null;
  }
}

export function isRhoodAppDeepLink(url) {
  const raw = String(url || "").trim().toLowerCase();
  return (
    raw.startsWith("rhood://") ||
    raw.startsWith("rhoodapp://") ||
    raw.startsWith("exp+rhoodapp://")
  );
}
