import { fetchTrendingMixesPage, TRENDING_PAGE_SIZE } from "./mixFeed";

/**
 * One page of ranked public mixes with like/play counts and DJ profiles,
 * ranked in the database (get_trending_mixes) so the phone never loads the
 * whole catalogue.
 *
 * @returns {Promise<{ mixes: Array<object>, hasMore: boolean, error: any }>}
 */
export async function fetchMixesWithAggregates({
  limit = TRENDING_PAGE_SIZE,
  offset = 0,
} = {}) {
  return fetchTrendingMixesPage({ limit, offset });
}

/** @deprecated Use fetchMixesWithAggregates */
export const fetchMixesWithProfilesAndLikeCounts = fetchMixesWithAggregates;
