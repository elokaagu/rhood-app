/**
 * Normalize brand gig rows from RPC or direct Supabase joins for consistent UI + submit paths.
 */

export function normalizeBrandGigStatus(status) {
  if (status == null) return null;
  return String(status).trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function normalizeBrandGig(gig) {
  if (!gig || typeof gig !== "object") return gig;

  const profile = gig.user_profiles ?? null;
  const djId =
    gig.dj_id ?? profile?.id ?? gig.dj_user_id ?? gig.user_id ?? null;

  const djName =
    gig.dj_name ||
    profile?.dj_name ||
    profile?.full_name ||
    profile?.username ||
    "Unknown DJ";

  const djImage =
    gig.dj_profile_image_url || profile?.profile_image_url || null;

  return {
    ...gig,
    status: normalizeBrandGigStatus(gig.status),
    djId,
    djName,
    djImage,
  };
}

/** Status pill colors (matches Brand Gigs / admin patterns). */
export function getBrandGigStatusColor(status) {
  switch (normalizeBrandGigStatus(status)) {
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
