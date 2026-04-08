/**
 * R/HOOD–approved promoters: profile flag + notification metadata from DB triggers.
 */

export function rawNotificationHasApprovedPromoter(raw) {
  if (!raw || typeof raw !== "object") return false;
  const v =
    raw.approved_promoter ??
    raw.approvedPromoter ??
    raw.is_rhood_approved_promoter;
  return v === true || v === "true" || v === 1;
}

export function profileIsApprovedPromoter(profile) {
  if (!profile || typeof profile !== "object") return false;
  const v = profile.is_rhood_approved_promoter;
  return v === true || v === "true" || v === 1;
}
