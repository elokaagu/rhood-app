/** Canonical Rhood app community id (shared across navigation, realtime, list badges). */
export const RHOOD_COMMUNITY_ID =
  "550e8400-e29b-41d4-a716-446655440000";

export function isRhoodCommunityId(id) {
  return id === RHOOD_COMMUNITY_ID;
}
