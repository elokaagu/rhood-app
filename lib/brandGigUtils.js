/**
 * Normalize brand gig rows from RPC or direct Supabase joins for consistent UI + submit paths.
 */

export function normalizeBrandGig(gig) {
  if (!gig || typeof gig !== "object") return gig;

  const p = gig.user_profiles;
  const djId =
    gig.dj_id ?? p?.id ?? gig.dj_user_id ?? gig.user_id ?? null;

  const djName =
    gig.dj_name ||
    p?.dj_name ||
    p?.full_name ||
    p?.username ||
    "DJ";

  const djImage =
    gig.dj_profile_image_url || p?.profile_image_url || null;

  return {
    ...gig,
    djId,
    djName,
    djImage,
  };
}

/** Status pill colors (matches Brand Gigs / admin patterns). */
export function getBrandGigStatusColor(status) {
  switch (status) {
    case "completed":
      return "hsl(75, 100%, 60%)";
    case "upcoming":
      return "hsl(45, 100%, 60%)";
    case "in_progress":
      return "hsl(200, 100%, 60%)";
    case "cancelled":
      return "hsl(0, 100%, 60%)";
    default:
      return "hsl(0, 0%, 50%)";
  }
}

/**
 * Resolve DJ user id for achievements / side effects after gig update.
 */
export function resolveBrandGigDjId(gig) {
  if (!gig) return null;
  return (
    gig.djId ??
    gig.dj_id ??
    gig.user_profiles?.id ??
    gig.dj_user_id ??
    gig.user_id ??
    null
  );
}
