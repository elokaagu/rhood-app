/** Canonical Rhood app community id (shared across navigation, realtime, list badges). */
export const RHOOD_COMMUNITY_ID =
  "550e8400-e29b-41d4-a716-446655440000";

const UUID_V4_LOOSE_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeCommunityId(id) {
  if (id == null) return null;
  const normalized = String(id).trim().toLowerCase();
  return normalized || null;
}

export function isValidCommunityId(id) {
  const normalized = normalizeCommunityId(id);
  return normalized != null && UUID_V4_LOOSE_REGEX.test(normalized);
}

export function isRhoodCommunityId(id) {
  return normalizeCommunityId(id) === RHOOD_COMMUNITY_ID;
}
