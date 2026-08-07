import {
  calculateDistance,
  formatDistance,
} from "../locationService";
import {
  formatOpportunityDate,
  formatOpportunityTime,
  formatOpportunityCompensation,
} from "../formatters";
import { optimizeOpportunityImageUrl } from "./opportunityImageUrl";

/**
 * Normalise a raw `opportunities` row into the shape used by the swipe UI.
 * Pure — safe to use from fetch and realtime handlers.
 *
 * @param {Record<string, unknown>} opp
 * @param {{ latitude: number; longitude: number } | null | undefined} userLocation
 */
export function transformOpportunityRow(opp, userLocation) {
  const formattedDate = formatOpportunityDate(opp.event_date);
  let startTimeRaw =
    opp.event_start_time ??
    opp.start_time ??
    opp.event_time ??
    opp.event_date ??
    null;
  let endTimeRaw =
    opp.event_end_time ?? opp.event_time_end ?? opp.end_time ?? null;

  if (!endTimeRaw && typeof startTimeRaw === "string") {
    const timeRangeParts = startTimeRaw
      .split(/\s*(?:-|–|to)\s*/i)
      .map((part) => part.trim())
      .filter(Boolean);

    if (timeRangeParts.length === 2) {
      startTimeRaw = timeRangeParts[0] || startTimeRaw;
      endTimeRaw = timeRangeParts[1] || endTimeRaw;
    }
  }

  const formattedTime = formatOpportunityTime(startTimeRaw, endTimeRaw);
  const formattedCompensation = formatOpportunityCompensation(
    opp.payment,
    opp.payment_currency,
    opp.payment_max ?? opp.max_payment ?? null
  );
  const paymentValue =
    typeof opp.payment === "string"
      ? parseFloat(opp.payment)
      : Number(opp.payment);
  const resolvedLocation =
    opp.location ||
    [opp.city, opp.country].filter(Boolean).join(", ") ||
    "Location not set";
  const createdAt = opp.created_at ? new Date(opp.created_at) : null;
  const isNew =
    createdAt &&
    createdAt.getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000;

  let distance = null;
  let distanceFormatted = null;
  if (userLocation && opp.latitude && opp.longitude) {
    distance = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      opp.latitude,
      opp.longitude
    );
    distanceFormatted = formatDistance(distance);
  }

  return {
    id: opp.id,
    venue: opp.venue || "",
    title: opp.title,
    location: resolvedLocation,
    distance,
    distanceFormatted,
    date: formattedDate,
    rawDate: opp.event_date,
    time: formattedTime,
    rawTime: startTimeRaw,
    rawTimeEnd: endTimeRaw,
    audienceSize: opp.audience_size || "TBD",
    description: opp.description,
    genres: opp.genre ? [opp.genre] : ["Electronic"],
    genre: opp.genre || null,
    compensation: formattedCompensation,
    paymentValue: Number.isFinite(paymentValue) ? paymentValue : null,
    paymentCurrency: opp.payment_currency
      ? opp.payment_currency.toUpperCase()
      : "GBP",
    applicationsLeft: 0,
    status: isNew ? "new" : "hot",
    /** For merging / sorting when applying realtime patches */
    createdAt: opp.created_at || null,
    image: (() => {
      const trimmed =
        typeof opp.image_url === "string" ? opp.image_url.trim() : "";
      const fallback =
        opp.genre === "Techno"
          ? "https://images.unsplash.com/photo-1571266028243-e68f8570c0e8?w=400&h=400&fit=crop"
          : opp.genre === "House"
          ? "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop"
          : opp.genre === "Electronic"
          ? "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop"
          : "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop";
      const base = trimmed || fallback;
      return optimizeOpportunityImageUrl(base) ?? base;
    })(),
  };
}

/**
 * @param {Array<{ createdAt?: string | null }>} list
 */
export function sortOpportunitiesByCreatedAtDesc(list) {
  return [...list].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });
}

/**
 * Patch local list from a realtime row (insert/update). Removes row if `is_active` is false.
 *
 * The swipe deck addresses `opportunities` by a plain integer index that only
 * ever moves forward. Re-sorting the whole list newest-first on every
 * realtime insert (the previous behaviour) shifted every card at or after
 * index 0 out from under that pointer — a brand new opportunity landed
 * *behind* wherever the user currently was in the deck (invisible until a
 * full refresh), while an already-swiped card could reappear at the current
 * index. Splicing the new row in right at `currentIndex` instead makes it
 * the very next card, and leaves every already-positioned card untouched.
 *
 * @param {Array<Record<string, unknown>>} prev
 * @param {Record<string, unknown>} rawRow
 * @param {{ latitude: number; longitude: number } | null | undefined} userLocation
 * @param {number} [currentIndex] Where the user currently is in the deck —
 *   a brand new row is inserted here so it's up next, not appended/resorted.
 */
export function mergeOpportunityFromRealtime(
  prev,
  rawRow,
  userLocation,
  currentIndex = 0
) {
  const id = rawRow?.id;
  if (id == null) return prev;

  if (!rawRow.is_active) {
    return prev.filter((o) => o.id !== id);
  }

  const transformed = transformOpportunityRow(rawRow, userLocation);
  const idx = prev.findIndex((o) => o.id === id);
  if (idx === -1) {
    const insertAt = Math.min(Math.max(currentIndex, 0), prev.length);
    const next = [...prev];
    next.splice(insertAt, 0, transformed);
    return next;
  }
  // Update in place — no resort, so currentIndex keeps pointing at the same card.
  const next = [...prev];
  next[idx] = transformed;
  return next;
}
