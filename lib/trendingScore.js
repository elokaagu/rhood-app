/**
 * Trending ranking for mixes: engagement with diminishing returns + recency decay.
 * Does not require extra DB fields — uses created_at, like counts, and plays.
 */

import { resolveMixPlayCount } from "./yourLikesUtils";

const MS_PER_DAY = 86400000;

const LIKE_WEIGHT = 2.5;
const PLAY_WEIGHT = 1;
const RECENCY_WINDOW_DAYS = 21;
const NEWNESS_WINDOW_DAYS = 10;
const NEWNESS_MAX_BOOST = 0.2;
/** Multiplier when there is almost no engagement yet (see raw-engagement gate below). */
const LOW_SIGNAL_NEW_MIX_MULTIPLIER = 0.35;
const MIN_SCORE_FLOOR = 0.02;
/** Raw likes+plays gate: "any signal" bar, separate from weighted log engagement. */
const LOW_SIGNAL_RAW_ENGAGEMENT_MAX = 1;
const FLOOR_RAW_ENGAGEMENT_MAX = 2;
const FLOOR_AGE_DAYS = 14;

/**
 * When `created_at` is missing or invalid, treat as old so mixes are not accidentally boosted.
 */
const DEFAULT_AGE_DAYS_WHEN_NO_TIMESTAMP = 90;

function mixCreatedAtMs(mix) {
  const raw = mix?.created_at;
  if (!raw) return NaN;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? NaN : t;
}

/**
 * @param {object} mix
 * @param {number} [now=Date.now()]
 * @returns {number} Score (0 = exclude from trending list)
 */
export function computeTrendingScore(mix, now = Date.now()) {
  const likes = Math.max(
    0,
    Number(mix?.likeCount ?? mix?.like_count ?? mix?.likes ?? 0) || 0
  );
  const plays = Math.max(0, resolveMixPlayCount(mix));
  const rawEngagement = likes + plays;

  let ageDays = DEFAULT_AGE_DAYS_WHEN_NO_TIMESTAMP;
  const createdMs = mixCreatedAtMs(mix);
  if (!Number.isNaN(createdMs)) {
    ageDays = Math.max(0, (now - createdMs) / MS_PER_DAY);
  }

  // Diminishing returns so old mega-hits don't dominate forever
  const engagement =
    LIKE_WEIGHT * Math.log1p(likes) + PLAY_WEIGHT * Math.log1p(plays);

  const recency = 1 / (1 + ageDays / RECENCY_WINDOW_DAYS);

  const newnessBoost =
    ageDays < NEWNESS_WINDOW_DAYS
      ? NEWNESS_MAX_BOOST *
        Math.max(0, 1 - ageDays / NEWNESS_WINDOW_DAYS)
      : 0;

  let score = engagement * recency + newnessBoost;

  // Minimum bar: need some signal unless mix is brand new (raw gate; ranking still log-weighted)
  if (rawEngagement < LOW_SIGNAL_RAW_ENGAGEMENT_MAX) {
    if (ageDays > NEWNESS_WINDOW_DAYS) return 0;
    score *= LOW_SIGNAL_NEW_MIX_MULTIPLIER;
  }

  if (
    score < MIN_SCORE_FLOOR &&
    rawEngagement < FLOOR_RAW_ENGAGEMENT_MAX &&
    ageDays > FLOOR_AGE_DAYS
  ) {
    return 0;
  }

  return score;
}

/**
 * @param {object[]} mixes
 * @param {number} [now]
 * @returns {Array<object & { trendingScore: number }>}
 */
export function rankTrendingMixes(mixes, now = Date.now()) {
  if (!Array.isArray(mixes)) return [];

  return mixes
    .map((mix) => ({
      ...mix,
      trendingScore: computeTrendingScore(mix, now),
    }))
    .filter((m) => m.trendingScore > 0)
    .sort((a, b) => {
      if (b.trendingScore !== a.trendingScore) {
        return b.trendingScore - a.trendingScore;
      }
      const tb = mixCreatedAtMs(b);
      const ta = mixCreatedAtMs(a);
      const nb = Number.isNaN(tb) ? 0 : tb;
      const na = Number.isNaN(ta) ? 0 : ta;
      if (nb !== na) {
        return nb - na;
      }
      const idb = String(b.id ?? b.mix_id ?? "");
      const ida = String(a.id ?? a.mix_id ?? "");
      return idb.localeCompare(ida);
    });
}
