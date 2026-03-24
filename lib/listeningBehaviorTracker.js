// lib/listeningBehaviorTracker.js
// Track user listening behavior for ML recommendations

import { supabase } from './supabase';
import * as Location from 'expo-location';
import { Platform, AppState } from 'react-native';

const EARLY_SKIP_THRESHOLD_SECONDS = 10;
const LOCATION_CACHE_TTL_MS = 10 * 60 * 1000;
const SESSION_MUTATION_FLUSH_MS = 2000;

let cachedLocation = null;
let cachedLocationAt = 0;
const activeSessions = new Map();
const pendingSessionMutations = new Map();
let sessionMutationFlushTimer = null;
let isFlushingSessionMutations = false;
let appStateFlushSubscribed = false;

async function getCachedLocationContext() {
  const now = Date.now();
  if (cachedLocation && now - cachedLocationAt < LOCATION_CACHE_TTL_MS) {
    return cachedLocation;
  }

  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const location = await Location.getCurrentPositionAsync({});
    const [place] = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });

    cachedLocation = {
      city: place?.city || null,
      country: place?.country || null,
    };
    cachedLocationAt = now;
    return cachedLocation;
  } catch {
    return null;
  }
}

async function getLatestSessionId(userId, mixId) {
  const { data: session, error } = await supabase
    .from('mix_listening_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('mix_id', mixId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (__DEV__) {
      console.warn('Could not resolve latest listening session:', error?.message || error);
    }
    return null;
  }
  return session?.id || null;
}

function mutationKey(userId, mixId) {
  return `${userId || 'unknown'}:${mixId || 'unknown'}`;
}

function scheduleSessionMutationFlush() {
  if (sessionMutationFlushTimer) return;
  sessionMutationFlushTimer = setTimeout(() => {
    sessionMutationFlushTimer = null;
    flushPendingSessionMutations().catch((error) => {
      if (__DEV__) {
        console.warn('Failed to flush listening session mutations:', error?.message || error);
      }
    });
  }, SESSION_MUTATION_FLUSH_MS);
}

function enqueueSessionMutation(userId, mixId, patch) {
  if (!userId || !mixId) return;
  const key = mutationKey(userId, mixId);
  const previous = pendingSessionMutations.get(key) || { userId, mixId };
  pendingSessionMutations.set(key, { ...previous, ...patch });
  scheduleSessionMutationFlush();
}

export async function flushPendingSessionMutations() {
  if (isFlushingSessionMutations || pendingSessionMutations.size === 0) return;
  isFlushingSessionMutations = true;

  const batch = Array.from(pendingSessionMutations.values());
  pendingSessionMutations.clear();

  try {
    for (const mutation of batch) {
      const { userId, mixId, wasLiked, wasSaved } = mutation;
      if (!userId || !mixId) continue;

      const sessionId = await getLatestSessionId(userId, mixId);
      if (sessionId) {
        const updatePatch = {};
        if (typeof wasLiked === 'boolean') updatePatch.was_liked = wasLiked;
        if (typeof wasSaved === 'boolean') updatePatch.was_saved = wasSaved;
        if (Object.keys(updatePatch).length > 0) {
          await supabase
            .from('mix_listening_sessions')
            .update(updatePatch)
            .eq('id', sessionId);
        }
        continue;
      }

      await recordListeningSession({
        userId,
        mixId,
        listenDurationSeconds: 0,
        completionPercentage: 0,
        wasLiked: typeof wasLiked === 'boolean' ? wasLiked : false,
        wasSaved: typeof wasSaved === 'boolean' ? wasSaved : false,
      });
    }
  } finally {
    isFlushingSessionMutations = false;
    if (pendingSessionMutations.size > 0) {
      scheduleSessionMutationFlush();
    }
  }
}

function ensureAppStateFlushSubscription() {
  if (appStateFlushSubscribed) return;
  appStateFlushSubscribed = true;

  AppState.addEventListener('change', (nextState) => {
    if (nextState === 'background' || nextState === 'inactive') {
      flushPendingSessionMutations().catch((error) => {
        if (__DEV__) {
          console.warn('Failed background flush for listening session mutations:', error?.message || error);
        }
      });
    }
  });
}

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
      const locationContext = await getCachedLocationContext();
      city = locationContext?.city || null;
      country = locationContext?.country || null;
    } catch (locationError) {
      // Location is optional, continue without it
      if (__DEV__) {
        console.log('Location not available:', locationError);
      }
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
  const sessionId = `${userId || 'anonymous'}-${mixId || 'unknown'}-${Date.now()}`;
  const startTime = Date.now();
  activeSessions.set(sessionId, { userId, mixId, startTime, ended: false });

  return {
    sessionId,
    userId,
    mixId,
    startTime,
    end: async (options = {}) => {
      const activeSession = activeSessions.get(sessionId);
      if (!activeSession || activeSession.ended) return null;
      activeSession.ended = true;
      activeSessions.delete(sessionId);

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
  ensureAppStateFlushSubscription();
  enqueueSessionMutation(userId, mixId, { wasLiked: !!wasLiked });
  return { queued: true };
}

/**
 * Track save action
 */
export async function trackSave(userId, mixId, wasSaved) {
  ensureAppStateFlushSubscription();
  enqueueSessionMutation(userId, mixId, { wasSaved: !!wasSaved });
  return { queued: true };
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
        if (session.skip_time_seconds && session.skip_time_seconds < EARLY_SKIP_THRESHOLD_SECONDS) {
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

