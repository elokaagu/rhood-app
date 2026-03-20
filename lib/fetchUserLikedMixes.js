import { supabase } from "./supabase";
import { buildLikedMixDisplay } from "./yourLikesUtils";

/**
 * Loads only mixes the user liked — no full-table scan, no N+1 profiles.
 * 1) mix_likes + embedded mixes
 * 2) user_profiles for distinct mix.user_id values
 */
export async function fetchUserLikedMixesWithMixes(userId) {
  if (!userId) {
    return { mixes: [], categoryMap: {}, error: null, missingTable: false };
  }

  const { data: rows, error } = await supabase
    .from("mix_likes")
    .select(
      `
      mix_id,
      category_id,
      mixes (*)
    `
    )
    .eq("user_id", userId);

  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") {
      console.warn("mix_likes table not found. Skipping liked mixes fetch.");
      return { mixes: [], categoryMap: {}, error: null, missingTable: true };
    }
    console.error("❌ Error fetching liked mixes with mixes:", error);
    return { mixes: [], categoryMap: {}, error, missingTable: false };
  }

  const categoryMap = {};
  const rawPairs = [];

  for (const row of rows || []) {
    const mix = row.mixes;
    if (!row.mix_id || !mix || typeof mix !== "object") continue;
    categoryMap[row.mix_id] = row.category_id ?? null;
    rawPairs.push(mix);
  }

  const userIds = [
    ...new Set(rawPairs.map((m) => m.user_id).filter(Boolean)),
  ];

  let profileById = {};
  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from("user_profiles")
      .select("id, dj_name, first_name, last_name, profile_image_url, bio")
      .in("id", userIds);

    if (profileError) {
      console.warn("⚠️ Error batch-loading profiles for likes:", profileError);
    } else if (profiles) {
      profileById = Object.fromEntries(profiles.map((p) => [p.id, p]));
    }
  }

  const mixes = rawPairs.map((mix) =>
    buildLikedMixDisplay(mix, profileById[mix.user_id] || null)
  );

  mixes.sort(
    (a, b) =>
      new Date(b.created_at || 0) - new Date(a.created_at || 0)
  );

  return { mixes, categoryMap, error: null, missingTable: false };
}
