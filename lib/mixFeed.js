/**
 * Ranked / searched mix pages from the database (get_trending_mixes, search_mixes).
 * Phones fetch one page at a time instead of every mix and every like.
 */
import { supabase } from "./supabase";
import { buildLikedMixDisplay } from "./yourLikesUtils";
import { listBlockedUserIds } from "./moderation";

export const TRENDING_PAGE_SIZE = 30;
export const MIN_SEARCH_LENGTH = 2;

/** Row from get_trending_mixes / search_mixes → list/playback-ready mix. */
export function mixFromFeedRow(row) {
  if (!row?.id) return null;
  const profile =
    row.dj_name || row.first_name || row.last_name || row.profile_image_url
      ? {
          id: row.user_id,
          dj_name: row.dj_name,
          first_name: row.first_name,
          last_name: row.last_name,
          profile_image_url: row.profile_image_url,
        }
      : null;
  const base = buildLikedMixDisplay(row, profile);
  if (!base) return null;
  const likeCount = Math.max(0, Number(row.likes_count) || 0);
  const plays = Math.max(0, Number(row.play_count) || 0);
  return {
    ...base,
    description: row.description || null,
    file_url: row.file_url,
    image_url: base.image,
    likeCount,
    plays,
    play_count: plays,
    trendingScore: Number(row.trending_score) || 0,
  };
}

async function rowsToMixes(rows) {
  const blocked = new Set(await listBlockedUserIds().catch(() => []));
  return (rows || [])
    .filter((row) => !row?.user_id || !blocked.has(row.user_id))
    .map(mixFromFeedRow)
    .filter(Boolean);
}

/**
 * @returns {Promise<{ mixes: object[], hasMore: boolean, error: any }>}
 */
export async function fetchTrendingMixesPage({
  limit = TRENDING_PAGE_SIZE,
  offset = 0,
} = {}) {
  const { data, error } = await supabase.rpc("get_trending_mixes", {
    p_limit: limit,
    p_offset: offset,
  });
  if (error) return { mixes: [], hasMore: false, error };
  const rows = data || [];
  return {
    mixes: await rowsToMixes(rows),
    hasMore: rows.length === limit,
    error: null,
  };
}

/**
 * Searches every public mix by title, artist, genre or DJ name.
 * @returns {Promise<{ mixes: object[], error: any }>}
 */
export async function searchMixes(query, { limit = 30 } = {}) {
  const q = typeof query === "string" ? query.trim() : "";
  if (q.length < MIN_SEARCH_LENGTH) return { mixes: [], error: null };
  const { data, error } = await supabase.rpc("search_mixes", {
    p_query: q,
    p_limit: limit,
  });
  if (error) return { mixes: [], error };
  return { mixes: await rowsToMixes(data), error: null };
}
