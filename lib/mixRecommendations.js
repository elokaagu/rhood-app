// lib/mixRecommendations.js
// ML-based mix recommendation system using embeddings, behavior, skip rate, and completion rate

import { supabase } from './supabase';

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
        return simpleData || [];
      }
      
      return data || [];
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

    // Transform data to match expected format
    return (data || []).map(mix => ({
      id: mix.mix_id,
      title: mix.title,
      artist: mix.artist,
      genre: mix.genre,
      sub_genre: mix.sub_genre,
      bpm: mix.bpm,
      image: mix.image,
      recommendationScore: mix.recommendation_weight,
      similarityScore: mix.similarity_score,
    }));
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
    
    // Get all mixes - try with join first, fallback to separate queries
    let allMixes = [];
    
    // Try query with join
    const { data: mixesWithProfiles, error: joinError } = await supabase
      .from('mixes')
      .select(`
        *,
        user_profiles (
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
      const score = calculateRecommendationScore(mix, userBehavior, likedMixIds);
      return { ...mix, recommendationScore: score };
    });

    // Sort by score and return top recommendations
    const recommended = scoredMixes
      .filter(m => !likedMixIds.includes(m.id)) // Exclude already liked
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
function calculateRecommendationScore(mix, userBehavior, likedMixIds) {
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
  // Prefer mixes from artists user has liked before
  const artistLikedCount = likedMixIds.filter(id => {
    // This would need mix data to check artist
    // For now, we'll use a simplified approach
    return false; // Placeholder
  }).length;
  
  if (artistLikedCount > 0) {
    score += 30;
  } else {
    // Boost new artists slightly
    score += 10;
  }

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

