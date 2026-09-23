/** Normalise application opportunity ids for Set lookup. */
export function toAppliedOpportunityIdSet(ids) {
  const list = ids instanceof Set ? [...ids] : Array.isArray(ids) ? ids : [];
  return new Set(
    list
      .map((id) => (id == null ? "" : String(id).trim()))
      .filter(Boolean)
  );
}

/**
 * Swipe deck should not show listings this DJ already applied to
 * (pending, accepted, rejected, or completed).
 */
export function excludeAppliedOpportunities(opportunities, appliedIds) {
  const rows = Array.isArray(opportunities) ? opportunities : [];
  const applied = toAppliedOpportunityIdSet(appliedIds);
  if (!applied.size) return rows;
  return rows.filter((opp) => !applied.has(String(opp?.id ?? "").trim()));
}
