// lib/mixRecommendations.js
// ML-based mix recommendation system using embeddings, behavior, skip rate, and completion rate

import { supabase } from './supabase';

function normalizeRecommendedMix(mix = {}) {
  return {
    id: mix.id || mix.mix_id || null,
    title: mix.title || 'Untitled Mix',
    artist:
      mix.artist ||
      mix.user_profiles?.dj_name ||
      mix.user_dj_name ||
      'Unknown Artist',
    genre: mix.genre || null,
    sub_genre: mix.sub_genre || null,
    bpm: Number.isFinite(Number(mix.bpm)) ? Number(mix.bpm) : null,
    image: mix.image || mix.artwork_url || mix.image_url || null,
    recommendationScore:
      Number.isFinite(Number(mix.recommendationScore))
        ? Number(mix.recommendationScore)
        : Number.isFinite(Number(mix.recommendation_weight))
        ? Number(mix.recommendation_weight)
        : 0,
    similarityScore:
      Number.isFinite(Number(mix.similarityScore))
        ? Number(mix.similarityScore)
        : Number.isFinite(Number(mix.similarity_score))
        ? Number(mix.similarity_score)
        : null,
    created_at: mix.created_at || null,
    user: mix.user_profiles || mix.user || null,
  };
}

/**
 * Get recommended mixes for a user based on ML model results
 * Uses the new recommendation graph system with embeddings
 */
export async function getRecommendedMixes(userId, limit = 10, includePlayed = false) {
  try {
    if (!userId) {
      // Return popular mixes if no user
      const { data, error } = await supabase
        .from('mixes')
        .select(`
          *,
          user_profiles (
            dj_name,
            profile_image_url
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.warn('Error fetching popular mixes:', error);
        // Fallback to simple query
        const { data: simpleData, error: simpleError } = await supabase
          .from('mixes')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (simpleError) throw simpleError;
        return (simpleData || []).map((mix) =>
          normalizeRecommendedMix({ ...mix, recommendationScore: 0 })
        );
      }
      
      return (data || []).map((mix) =>
        normalizeRecommendedMix({ ...mix, recommendationScore: 0 })
      );
    }

    // Use database function for recommendations (uses embeddings and similarity)
    const { data, error } = await supabase.rpc('get_recommended_mixes', {
      p_user_id: userId,
      p_limit: limit,
      p_include_played: includePlayed
    });

    if (error) {
      console.warn('Error using recommendation function, falling back to simple scoring:', error);
      // Fallback to simple scoring
      return await getRecommendedMixesSimple(userId, limit);
    }

    return (data || []).map((mix) => normalizeRecommendedMix(mix));
  } catch (error) {
    console.error('Error getting recommended mixes:', error);
    return await getRecommendedMixesSimple(userId, limit);
  }
}

/**
 * Fallback: Simple recommendation scoring (for when embeddings aren't available)
 */
async function getRecommendedMixesSimple(userId, limit = 10) {
  try {
    // Get user's listening behavior
    const userBehavior = await getUserListeningBehavior(userId);
    
    // Get user's liked mixes and genres
    const { data: likedMixes } = await supabase
      .from('mix_likes')
      .select('mix_id')
      .eq('user_id', userId);
    
    const likedMixIds = (likedMixes || []).map(m => m.mix_id);
    const likedMixIdSet = new Set(likedMixIds);
    
    // Get all mixes - try with join first, fallback to separate queries
    let allMixes = [];
    
    // Try query with join - specify the relationship to avoid ambiguity
    const { data: mixesWithProfiles, error: joinError } = await supabase
      .from('mixes')
      .select(`
        *,
        user_profiles!mixes_user_id_fkey (
          dj_name,
          profile_image_url,
          genres
        )
      `)
      .order('created_at', { ascending: false });
    
    if (!joinError && mixesWithProfiles) {
      allMixes = mixesWithProfiles;
    } else {
      // Fallback: fetch mixes and profiles separately
      console.warn('Join query failed, using separate queries:', joinError);
      
      const { data: simpleMixes, error: simpleError } = await supabase
        .from('mixes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (simpleError) throw simpleError;
      if (!simpleMixes || simpleMixes.length === 0) return [];
      
      // Fetch user profiles separately
      const userIds = [...new Set(simpleMixes.map(m => m.user_id).filter(Boolean))];
      let profiles = [];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('id, dj_name, profile_image_url, genres')
          .in('id', userIds);
        profiles = profileData || [];
      }
      
      const profileMap = new Map(profiles.map(p => [p.id, p]));
      
      // Combine mixes with profiles
      allMixes = simpleMixes.map(mix => ({
        ...mix,
        user_profiles: profileMap.get(mix.user_id) || null,
      }));
    }
    
    if (!allMixes || allMixes.length === 0) return [];

    // Score and rank mixes
    const scoredMixes = allMixes.map(mix => {
      const score = calculateRecommendationScore(mix, userBehavior);
      return normalizeRecommendedMix({ ...mix, recommendationScore: score });
    });

    // Sort by score and return top recommendations
    const recommended = scoredMixes
      .filter(m => !likedMixIdSet.has(m.id)) // Exclude already liked
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);

    return recommended;
  } catch (error) {
    console.error('Error in simple recommendation:', error);
    return [];
  }
}

/**
 * Get user's listening behavior patterns
 */
async function getUserListeningBehavior(userId) {
  try {
    // Get user's liked genres from profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('genres')
      .eq('id', userId)
      .single();

    // Get listening history (if available)
    // For now, we'll use liked mixes as a proxy
    const { data: likedMixes } = await supabase
      .from('mix_likes')
      .select('mix_id, mixes!inner(genre)')
      .eq('user_id', userId);

    const genreCounts = {};
    (likedMixes || []).forEach(like => {
      const genre = like.mixes?.genre;
      if (genre) {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      }
    });

    // Calculate preferred genres
    const preferredGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre);

    return {
      preferredGenres: preferredGenres.length > 0 
        ? preferredGenres 
        : (profile?.genres || []),
      totalLikes: likedMixes?.length || 0,
      genreDistribution: genreCounts,
    };
  } catch (error) {
    console.error('Error getting user behavior:', error);
    return {
      preferredGenres: [],
      totalLikes: 0,
      genreDistribution: {},
    };
  }
}

/**
 * Calculate recommendation score for a mix
 * Based on genre match, behavior patterns, skip rate, and completion rate
 */
function calculateRecommendationScore(mix, userBehavior) {
  let score = 0;

  // Genre matching (40% weight)
  if (mix.genre && userBehavior.preferredGenres.length > 0) {
    const genreMatch = userBehavior.preferredGenres.includes(mix.genre);
    if (genreMatch) {
      score += 40;
    } else {
      // Partial match for similar genres
      const genreSimilarity = calculateGenreSimilarity(
        mix.genre,
        userBehavior.preferredGenres
      );
      score += genreSimilarity * 40;
    }
  }

  // Behavior patterns (30% weight)
  // Artist-affinity scoring is not implemented yet; keep neutral baseline.
  score += 10;

  // Popularity/Quality signals (20% weight)
  // Use like count as a proxy for quality
  const likeCount = mix.likes_count || mix.likeCount || 0;
  const popularityScore = Math.min(likeCount / 10, 1) * 20; // Cap at 20 points
  score += popularityScore;

  // Recency (10% weight)
  const daysSinceCreation = (Date.now() - new Date(mix.created_at).getTime()) / (1000 * 60 * 60 * 24);
  const recencyScore = Math.max(0, 10 - (daysSinceCreation / 30) * 10); // Decay over 30 days
  score += recencyScore;

  return score;
}

/**
 * Calculate genre similarity score
 */
function calculateGenreSimilarity(genre, preferredGenres) {
  // Simple similarity based on genre keywords
  const genreKeywords = {
    'house': ['house', 'deep house', 'tech house', 'progressive house'],
    'techno': ['techno', 'tech', 'industrial'],
    'trance': ['trance', 'progressive', 'uplifting'],
    'drum & bass': ['drum', 'bass', 'dnb', 'jungle'],
    'afro house': ['afro', 'house', 'tribal'],
  };

  const genreLower = genre.toLowerCase();
  let maxSimilarity = 0;

  preferredGenres.forEach(prefGenre => {
    const prefLower = prefGenre.toLowerCase();
    const keywords = genreKeywords[prefLower] || [prefLower];
    
    keywords.forEach(keyword => {
      if (genreLower.includes(keyword) || keyword.includes(genreLower)) {
        maxSimilarity = Math.max(maxSimilarity, 0.7);
      }
    });
  });

  return maxSimilarity;
}

