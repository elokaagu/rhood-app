/**
 * The DJ feed only shows published listings: listing_status 'active',
 * is_active true and not archived. Draft, pending (in review), closed,
 * completed and archived rows stay hidden — including when Studio
 * auto-closes a listing on its apply-by date.
 */

/** Adds the live-listing conditions to a Supabase `opportunities` select. */
export function whereLiveOpportunity(query) {
  return query
    .eq("listing_status", "active")
    .eq("is_active", true)
    .not("is_archived", "is", true);
}

/** Same rule for a single row, e.g. a realtime insert/update payload. */
export function isLiveOpportunityRow(row) {
  if (!row) return false;
  return (
    String(row.listing_status ?? "").trim().toLowerCase() === "active" &&
    row.is_active === true &&
    row.is_archived !== true
  );
}
