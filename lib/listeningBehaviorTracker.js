// lib/listeningBehaviorTracker.js
// Track user listening behavior for ML recommendations

import { supabase } from './supabase';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

/**
 * Record a listening session
 */
export async function recordListeningSession({
  userId,
  mixId,
  listenDurationSeconds,
  completionPercentage,
  wasSkipped = false,
  skipTimeSeconds = null,
  wasLiked = false,
  wasSaved = false,
}) {
  try {
    if (!userId || !mixId) {
      console.warn('Missing required parameters for listening session');
      return null;
    }

    // Get device and location info
    const deviceType = Platform.OS; // 'ios' or 'android'
    let city = null;
    let country = null;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        const [place] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        city = place?.city || null;
        country = place?.country || null;
      }
    } catch (locationError) {
      // Location is optional, continue without it
      console.log('Location not available:', locationError);
    }

    // Record session in database
    const { data, error } = await supabase.rpc('record_listening_session', {
      p_user_id: userId,
      p_mix_id: mixId,
      p_listen_duration_seconds: listenDurationSeconds,
      p_completion_percentage: completionPercentage,
      p_was_skipped: wasSkipped,
      p_skip_time_seconds: skipTimeSeconds,
      p_was_liked: wasLiked,
      p_was_saved: wasSaved,
      p_device_type: deviceType,
      p_city: city,
      p_country: country,
    });

    if (error) throw error;

    // Trigger user embedding recalculation (can be done async via cron)
    // For now, we'll just mark that it needs recalculation
    // You can set up a Supabase Edge Function or cron job to recalculate embeddings

    return data;
  } catch (error) {
    console.error('Error recording listening session:', error);
    // Don't throw - we don't want to break playback if tracking fails
    return null;
  }
}

/**
 * Track when user starts listening
 */
export function startListeningSession(userId, mixId) {
  const startTime = Date.now();
  
  return {
    userId,
    mixId,
    startTime,
    end: async (options = {}) => {
      const endTime = Date.now();
      const durationSeconds = Math.floor((endTime - startTime) / 1000);
      
      // Get mix duration to calculate completion percentage
      let mixDuration = options.mixDurationSeconds || null;
      if (!mixDuration) {
        try {
          const { data } = await supabase
            .from('mixes')
            .select('duration')
            .eq('id', mixId)
            .single();
          
          mixDuration = data?.duration || null;
        } catch (error) {
          console.warn('Could not get mix duration:', error);
        }
      }

      const completionPercentage = mixDuration
        ? Math.min(100, (durationSeconds / mixDuration) * 100)
        : null;

      return recordListeningSession({
        userId,
        mixId,
        listenDurationSeconds: durationSeconds,
        completionPercentage: completionPercentage || 0,
        wasSkipped: options.wasSkipped || false,
        skipTimeSeconds: options.skipTimeSeconds || null,
        wasLiked: options.wasLiked || false,
        wasSaved: options.wasSaved || false,
      });
    },
  };
}

/**
 * Track skip (if skipped within first 10 seconds, strong negative signal)
 */
export async function trackSkip(userId, mixId, skipTimeSeconds) {
  const wasEarlySkip = skipTimeSeconds < 10;
  
  return recordListeningSession({
    userId,
    mixId,
    listenDurationSeconds: skipTimeSeconds,
    completionPercentage: 0,
    wasSkipped: true,
    skipTimeSeconds,
  });
}

/**
 * Track like action
 */
export async function trackLike(userId, mixId, wasLiked) {
  // Get last listening session for this mix
  const { data: sessions } = await supabase
    .from('mix_listening_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('mix_id', mixId)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (sessions) {
    // Update existing session
    await supabase
      .from('mix_listening_sessions')
      .update({ was_liked: wasLiked })
      .eq('id', sessions.id);
  } else {
    // Create new session record for like
    await recordListeningSession({
      userId,
      mixId,
      listenDurationSeconds: 0,
      completionPercentage: 0,
      wasLiked,
    });
  }
}

/**
 * Track save action
 */
export async function trackSave(userId, mixId, wasSaved) {
  // Get last listening session for this mix
  const { data: sessions } = await supabase
    .from('mix_listening_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('mix_id', mixId)
    .order('started_at', { ascending: false })
    .limit(1)
    .single();

  if (sessions) {
    // Update existing session
    await supabase
      .from('mix_listening_sessions')
      .update({ was_saved: wasSaved })
      .eq('id', sessions.id);
  } else {
    // Create new session record for save
    await recordListeningSession({
      userId,
      mixId,
      listenDurationSeconds: 0,
      completionPercentage: 0,
      wasSaved,
    });
  }
}

/**
 * Get user's listening statistics
 */
export async function getUserListeningStats(userId) {
  try {
    const { data, error } = await supabase
      .from('mix_listening_sessions')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    const stats = {
      totalListens: data?.length || 0,
      avgCompletionRate: 0,
      avgListenDuration: 0,
      skipRate: 0,
      earlySkipRate: 0, // Skips within 10 seconds
      totalLikes: 0,
      totalSaves: 0,
      genresListened: {},
    };

    if (!data || data.length === 0) return stats;

    let totalCompletion = 0;
    let totalDuration = 0;
    let skips = 0;
    let earlySkips = 0;
    let likes = 0;
    let saves = 0;

    data.forEach(session => {
      if (session.completion_percentage) {
        totalCompletion += session.completion_percentage;
      }
      if (session.listen_duration_seconds) {
        totalDuration += session.listen_duration_seconds;
      }
      if (session.was_skipped) {
        skips++;
        if (session.skip_time_seconds && session.skip_time_seconds < 10) {
          earlySkips++;
        }
      }
      if (session.was_liked) likes++;
      if (session.was_saved) saves++;
    });

    stats.avgCompletionRate = totalCompletion / data.length;
    stats.avgListenDuration = totalDuration / data.length;
    stats.skipRate = skips / data.length;
    stats.earlySkipRate = earlySkips / data.length;
    stats.totalLikes = likes;
    stats.totalSaves = saves;

    // Get genre distribution from mixes
    const mixIds = [...new Set(data.map(s => s.mix_id))];
    if (mixIds.length > 0) {
      const { data: mixes } = await supabase
        .from('mixes')
        .select('genre')
        .in('id', mixIds);

      mixes?.forEach(mix => {
        if (mix.genre) {
          stats.genresListened[mix.genre] = (stats.genresListened[mix.genre] || 0) + 1;
        }
      });
    }

    return stats;
  } catch (error) {
    console.error('Error getting listening stats:', error);
    return null;
  }
}

