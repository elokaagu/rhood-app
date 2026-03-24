import { supabase } from "./supabase";
import { buildLikedMixDisplay } from "./yourLikesUtils";

/**
 * Fetches all public mix rows, then batch-loads like counts and user_profiles.
 * Avoids N+1 profile queries (used by Trending and similar discovery UIs).
 *
 * @returns {Promise<{ mixes: Array<object>, error: any }>} Display-shaped mixes with likeCount on each item
 */
export async function fetchMixesWithAggregates() {
  const { data, error } = await supabase
    .from("mixes")
    .select("*")
    .eq("is_public", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Error fetching mixes:", error);
    return { mixes: [], error };
  }

  const rows = data || [];
  if (rows.length === 0) {
    return { mixes: [], error: null };
  }

  const mixIds = rows.map((m) => m.id).filter(Boolean);
  const userIds = [...new Set(rows.map((m) => m.user_id).filter(Boolean))];

  let likeCountsMap = {};
  if (mixIds.length > 0) {
    const { data: likeRows, error: likeError } = await supabase
      .from("mix_likes")
      .select("mix_id")
      .in("mix_id", mixIds);

    if (likeError) {
      if (likeError.code === "42P01" || likeError.code === "PGRST205") {
        console.warn("mix_likes table not found. Skipping like counts.");
      } else {
        console.error("❌ Error fetching like counts:", likeError);
      }
    } else if (Array.isArray(likeRows)) {
      likeCountsMap = likeRows.reduce((acc, row) => {
        if (!row?.mix_id) return acc;
        acc[row.mix_id] = (acc[row.mix_id] || 0) + 1;
        return acc;
      }, {});
    }
  }

  let profileById = {};
  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, dj_name, first_name, last_name, profile_image_url, bio")
      .in("id", userIds);

    if (profileError) {
      console.warn("⚠️ Batch profile load failed:", profileError);
    } else if (profiles) {
      profileById = Object.fromEntries(profiles.map((p) => [p.id, p]));
    }
  }

  const mixes = rows
    .map((mix) => {
      const base = buildLikedMixDisplay(
        mix,
        profileById[mix.user_id] || null
      );
      if (!base) return null;
      const rawLike =
        likeCountsMap[mix.id] ??
        mix.likes_count ??
        mix.like_count ??
        mix.likes ??
        mix.likeCount ??
        0;
      const likeCount = Math.max(0, Number(rawLike) || 0);
      return {
        ...base,
        likeCount,
      };
    })
    .filter(Boolean);

  return { mixes, error: null };
}

/** @deprecated Use fetchMixesWithAggregates */
export const fetchMixesWithProfilesAndLikeCounts = fetchMixesWithAggregates;
