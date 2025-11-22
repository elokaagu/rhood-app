// lib/embeddingGenerator.js
// Generate embeddings for users and mixes (Phase 1: Simple weighted scoring, Phase 2: Vector embeddings)

import { supabase } from './supabase';

/**
 * Generate or update user embedding
 * Phase 1: Uses weighted scoring
 * Phase 2: Will use actual vector embeddings (Pinecone, Weaviate, Supabase Vector)
 */
export async function generateUserEmbedding(userId) {
  try {
    // Trigger database function to calculate embedding
    const { data, error } = await supabase.rpc('calculate_user_embedding', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Error generating user embedding:', error);
      // Fallback: calculate simple embedding client-side
      return await generateUserEmbeddingSimple(userId);
    }

    return data;
  } catch (error) {
    console.error('Error in user embedding generation:', error);
    return false;
  }
}

/**
 * Simple user embedding (fallback when database function not available)
 */
async function generateUserEmbeddingSimple(userId) {
  try {
    // Get user's listening behavior
    const { data: sessions } = await supabase
      .from('mix_listening_sessions')
      .select('*, mixes!inner(genre, sub_genre, bpm)')
      .eq('user_id', userId);

    if (!sessions || sessions.length === 0) {
      return false;
    }

    // Calculate genre weights
    const genreCounts = {};
    const genreCompletions = {};
    
    sessions.forEach(session => {
      const genre = session.mixes?.genre;
      if (genre) {
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
        genreCompletions[genre] = (genreCompletions[genre] || 0) + (session.completion_percentage || 0);
      }
    });

    const genreWeights = {};
    const totalListens = sessions.length;
    
    Object.keys(genreCounts).forEach(genre => {
      const count = genreCounts[genre];
      const avgCompletion = genreCompletions[genre] / count;
      genreWeights[genre] = (count / totalListens) * (avgCompletion / 100);
    });

    // Calculate skip rates
    const skipRates = {};
    Object.keys(genreCounts).forEach(genre => {
      const genreSessions = sessions.filter(s => s.mixes?.genre === genre);
      const skips = genreSessions.filter(s => s.was_skipped && s.skip_time_seconds < 10).length;
      skipRates[genre] = skips / genreSessions.length;
    });

    // Calculate average listen duration
    const avgDuration = sessions.reduce((sum, s) => sum + (s.listen_duration_seconds || 0), 0) / sessions.length;

    // Calculate completion rate
    const avgCompletion = sessions.reduce((sum, s) => sum + (s.completion_percentage || 0), 0) / sessions.length;

    // Get BPM preferences
    const completedSessions = sessions.filter(s => s.completion_percentage >= 80);
    const bpms = completedSessions
      .map(s => s.mixes?.bpm)
      .filter(bpm => bpm != null);
    
    const preferredBPM = bpms.length > 0
      ? [Math.min(...bpms), Math.max(...bpms)]
      : null;

    // Get user location
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('city, country')
      .eq('id', userId)
      .single();

    // Store embedding
    const embedding = {
      user_id: userId,
      genre_weights: genreWeights,
      skip_rate_weights: skipRates,
      avg_listen_duration: Math.round(avgDuration),
      completion_rate: avgCompletion,
      preferred_bpm_range: preferredBPM,
      geographic_signals: {
        city: profile?.city || null,
        country: profile?.country || null,
      },
    };

    // Upsert to database
    const { error: upsertError } = await supabase
      .from('user_embeddings')
      .upsert(embedding, { onConflict: 'user_id' });

    if (upsertError) throw upsertError;

    return true;
  } catch (error) {
    console.error('Error in simple user embedding:', error);
    return false;
  }
}

/**
 * Generate or update mix embedding
 */
export async function generateMixEmbedding(mixId) {
  try {
    // Trigger database function
    const { data, error } = await supabase.rpc('calculate_mix_embedding', {
      p_mix_id: mixId,
    });

    if (error) {
      console.error('Error generating mix embedding:', error);
      return await generateMixEmbeddingSimple(mixId);
    }

    return data;
  } catch (error) {
    console.error('Error in mix embedding generation:', error);
    return false;
  }
}

/**
 * Simple mix embedding (fallback)
 */
async function generateMixEmbeddingSimple(mixId) {
  try {
    // Get mix details
    const { data: mix } = await supabase
      .from('mixes')
      .select('*, user_profiles!inner(credits, gigs_completed)')
      .eq('id', mixId)
      .single();

    if (!mix) return false;

    // Calculate DJ quality score
    const djQualityScore = (
      ((mix.user_profiles?.credits || 0) / 1000) * 0.3 +
      ((mix.user_profiles?.gigs_completed || 0) / 100) * 0.3 +
      ((mix.likes_count || 0) / 100) * 0.2 +
      ((mix.play_count || 0) / 1000) * 0.2
    );

    // Store embedding
    const embedding = {
      mix_id: mixId,
      bpm: mix.bpm,
      genre_vector: {
        genre: mix.genre,
        sub_genre: mix.sub_genre,
      },
      mood_vector: {
        moods: mix.mood_tags || [],
      },
      audio_features: mix.audio_features || {},
      dj_quality_score: djQualityScore,
    };

    // Upsert to database
    const { error: upsertError } = await supabase
      .from('mix_embeddings')
      .upsert(embedding, { onConflict: 'mix_id' });

    if (upsertError) throw upsertError;

    return true;
  } catch (error) {
    console.error('Error in simple mix embedding:', error);
    return false;
  }
}

/**
 * Calculate similarity between user and mix
 * Phase 1: Simple weighted scoring
 * Phase 2: Cosine similarity on vector embeddings
 */
export async function calculateUserMixSimilarity(userId, mixId) {
  try {
    // Get user and mix embeddings
    const { data: userEmbedding } = await supabase
      .from('user_embeddings')
      .select('*')
      .eq('user_id', userId)
      .single();

    const { data: mixEmbedding } = await supabase
      .from('mix_embeddings')
      .select('*')
      .eq('mix_id', mixId)
      .single();

    if (!userEmbedding || !mixEmbedding) {
      return 0; // No similarity data available
    }

    // Calculate similarity score (simple weighted approach)
    let similarityScore = 0;
    let totalWeight = 0;

    // Genre match (40% weight)
    const userGenres = userEmbedding.genre_weights || {};
    const mixGenre = mixEmbedding.genre_vector?.genre;
    if (mixGenre && userGenres[mixGenre]) {
      similarityScore += userGenres[mixGenre] * 0.4;
      totalWeight += 0.4;
    }

    // BPM match (20% weight)
    if (mixEmbedding.bpm && userEmbedding.preferred_bpm_range) {
      const [minBPM, maxBPM] = userEmbedding.preferred_bpm_range;
      if (mixEmbedding.bpm >= minBPM && mixEmbedding.bpm <= maxBPM) {
        similarityScore += 0.2;
        totalWeight += 0.2;
      }
    }

    // Skip rate (negative weight, 20%)
    const skipRate = userEmbedding.skip_rate_weights?.[mixGenre] || 0;
    if (skipRate < 0.3) { // Low skip rate = good match
      similarityScore += (1 - skipRate) * 0.2;
      totalWeight += 0.2;
    }

    // DJ quality (20% weight)
    const qualityScore = mixEmbedding.dj_quality_score || 0;
    similarityScore += qualityScore * 0.2;
    totalWeight += 0.2;

    // Normalize score
    const normalizedScore = totalWeight > 0 ? similarityScore / totalWeight : 0;

    // Calculate recommendation weight (includes recency boost)
    const { data: mix } = await supabase
      .from('mixes')
      .select('created_at')
      .eq('id', mixId)
      .single();

    const daysSinceCreation = mix
      ? (Date.now() - new Date(mix.created_at).getTime()) / (1000 * 60 * 60 * 24)
      : 365;
    
    const recencyBoost = Math.max(0, 1 - (daysSinceCreation / 30)); // Decay over 30 days
    const recommendationWeight = normalizedScore * 0.8 + recencyBoost * 0.2;

    // Cache similarity score
    await supabase
      .from('user_mix_similarity')
      .upsert({
        user_id: userId,
        mix_id: mixId,
        similarity_score: normalizedScore,
        recommendation_weight: recommendationWeight,
        last_calculated: new Date().toISOString(),
      }, { onConflict: 'user_id,mix_id' });

    return recommendationWeight;
  } catch (error) {
    console.error('Error calculating similarity:', error);
    return 0;
  }
}

/**
 * Batch calculate similarities for a user
 */
export async function batchCalculateSimilarities(userId, mixIds) {
  try {
    const similarities = await Promise.all(
      mixIds.map(mixId => calculateUserMixSimilarity(userId, mixId))
    );

    return mixIds.map((mixId, index) => ({
      mixId,
      similarity: similarities[index],
    }));
  } catch (error) {
    console.error('Error in batch similarity calculation:', error);
    return [];
  }
}

