/**
 * Trending ranking for mixes: engagement with diminishing returns + recency decay.
 * Does not require extra DB fields — uses created_at, like counts, and plays.
 */

import { resolveMixPlayCount } from "./yourLikesUtils";

const MS_PER_DAY = 86400000;

/**
 * @param {object} mix
 * @param {number} [now=Date.now()]
 * @returns {number} Score (0 = exclude from trending list)
 */
export function computeTrendingScore(mix, now = Date.now()) {
  const likes = Math.max(0, Number(mix.likeCount ?? mix.like_count ?? mix.likes ?? 0) || 0);
  const plays = Math.max(0, resolveMixPlayCount(mix));
  const rawEngagement = likes + plays;

  let ageDays = 90;
  if (mix.created_at) {
    const t = new Date(mix.created_at).getTime();
    if (!Number.isNaN(t)) {
      ageDays = Math.max(0, (now - t) / MS_PER_DAY);
    }
  }

  // Diminishing returns so old mega-hits don't dominate forever
  const engagement =
    2.5 * Math.log1p(likes) + Math.log1p(plays);

  // Recency: ~half weight after ~3 weeks, keeps feed feeling "alive"
  const recency = 1 / (1 + ageDays / 21);

  // Slight boost for very new uploads (surface fresh mixes with few stats)
  const newnessBoost =
    ageDays < 10 ? 0.2 * Math.max(0, 1 - ageDays / 10) : 0;

  let score = engagement * recency + newnessBoost;

  // Minimum bar: need some signal unless mix is brand new
  if (rawEngagement < 1) {
    if (ageDays > 10) return 0;
    score *= 0.35;
  }

  // Floor tiny numerical noise
  if (score < 0.02 && rawEngagement < 2 && ageDays > 14) return 0;

  return score;
}

/**
 * @param {object[]} mixes
 * @param {number} [now]
 * @returns {Array<object & { trendingScore: number }>}
 */
export function rankTrendingMixes(mixes, now = Date.now()) {
  return [...mixes]
    .map((mix) => ({
      ...mix,
      trendingScore: computeTrendingScore(mix, now),
    }))
    .filter((m) => m.trendingScore > 0)
    .sort((a, b) => b.trendingScore - a.trendingScore);
}
