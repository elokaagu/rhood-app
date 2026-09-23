/**
 * Custom-scheme routes the DJ app can open from email, push, or Studio.
 * Studio can point booking emails at rhood://bookings/{applicationId}.
 * Invite links: https://rhood.io/invite/CODE or rhood://invite/CODE
 */

function normalizeInviteToken(raw) {
  return String(raw || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 20);
}

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

/** Extract a DJ/portal invite code from a share URL or custom scheme. */
export function parseInviteCodeFromUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return null;

  const fromQueryOrPath = (value) => {
    const code = normalizeInviteToken(value);
    return code.length >= 4 ? code : null;
  };

  try {
    const parsed = new URL(raw);
    const fromParams =
      parsed.searchParams.get("invite") ||
      parsed.searchParams.get("invite_code") ||
      parsed.searchParams.get("code");
    if (fromParams) return fromQueryOrPath(fromParams);

    const pathMatch = parsed.pathname.match(/\/invite\/([^/]+)/i);
    if (pathMatch) return fromQueryOrPath(decodeURIComponent(pathMatch[1]));

    if (/^invite$/i.test(parsed.hostname) || /^invite$/i.test(parsed.host)) {
      return fromQueryOrPath(parsed.pathname.replace(/^\//, ""));
    }
  } catch {
    /* fall through to regex */
  }

  const match = raw.match(/invite(?:[_-]?code)?[=/:]([A-Za-z0-9]+)/i);
  return match ? fromQueryOrPath(match[1]) : null;
}

export function isRhoodAppDeepLink(url) {
  const raw = String(url || "").trim().toLowerCase();
  return (
    raw.startsWith("rhood://") ||
    raw.startsWith("rhoodapp://") ||
    raw.startsWith("exp+rhoodapp://")
  );
}
