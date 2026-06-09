// lib/mixMetadataExtractor.js
// Extract metadata from audio files (BPM, genre, mood, etc.)

// getInfoAsync lives in the "/legacy" entry on expo-file-system v19 (SDK 54).
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';

/**
 * Extract metadata from an audio file
 * This is a placeholder - in production, you'd use actual audio analysis libraries
 */
export async function extractMixMetadata(audioUri, existingMetadata = {}) {
  const safeExistingMetadata =
    existingMetadata && typeof existingMetadata === "object"
      ? existingMetadata
      : {};
  try {
    const metadata = {
      bpm: null,
      duration: safeExistingMetadata.duration || null,
      genre: safeExistingMetadata.genre || null,
      sub_genre: safeExistingMetadata.sub_genre || null,
      mood_tags: Array.isArray(safeExistingMetadata.mood_tags)
        ? safeExistingMetadata.mood_tags
        : [],
      audio_features:
        safeExistingMetadata.audio_features &&
        typeof safeExistingMetadata.audio_features === "object"
          ? safeExistingMetadata.audio_features
          : {},
      metadata_extracted: false,
    };

    if (!audioUri) {
      return metadata;
    }

    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(audioUri);
    if (!fileInfo.exists) {
      console.warn('Audio file not found:', audioUri);
      return metadata;
    }

    // Extract duration (if available from file system)
    // Note: For actual duration, you'd need an audio library
    // For now, we'll rely on the audio player to provide duration

    // BPM Detection (placeholder - would use actual BPM detection library)
    // In production, use libraries like:
    // - Web Audio API with BPM detection algorithms
    // - Native libraries (react-native-audio-analysis, etc.)
    metadata.bpm = await detectBPM(audioUri);

    // Genre detection (placeholder)
    // In production, use ML models or audio analysis
    if (!metadata.genre) {
      metadata.genre = await detectGenre(audioUri, safeExistingMetadata);
    }

    // Sub-genre detection
    metadata.sub_genre = await detectSubGenre(metadata.genre, safeExistingMetadata);

    // Mood tags extraction
    metadata.mood_tags = await extractMoodTags(audioUri, safeExistingMetadata);

    // Audio features (waveform, energy, etc.)
    metadata.audio_features = await extractAudioFeatures(audioUri);

    metadata.metadata_extracted = true;

    return metadata;
  } catch (error) {
    console.error('Error extracting metadata:', error);
    return {
      bpm: null,
      duration: safeExistingMetadata.duration || null,
      genre: safeExistingMetadata.genre || null,
      sub_genre: safeExistingMetadata.sub_genre || null,
      mood_tags: Array.isArray(safeExistingMetadata.mood_tags)
        ? safeExistingMetadata.mood_tags
        : [],
      audio_features:
        safeExistingMetadata.audio_features &&
        typeof safeExistingMetadata.audio_features === "object"
          ? safeExistingMetadata.audio_features
          : {},
      metadata_extracted: false,
    };
  }
}

/**
 * Detect BPM from audio file
 * Placeholder - would use actual BPM detection
 */
async function detectBPM(audioUri) {
  // TODO: Implement actual BPM detection
  // Options:
  // 1. Use Web Audio API with autocorrelation
  // 2. Use native libraries (react-native-audio-analysis)
  // 3. Use cloud services (AWS Transcribe, Google Cloud Speech)
  
  // For now, return null (will be set manually or via ML)
  return null;
}

/**
 * Detect genre from audio
 * Placeholder - would use ML model or audio analysis
 */
async function detectGenre(audioUri, existingMetadata) {
  // TODO: Implement genre detection
  // Options:
  // 1. Use audio fingerprinting + ML model
  // 2. Use cloud ML services
  // 3. Analyze waveform characteristics
  
  // For now, return null (user must specify)
  return existingMetadata.genre || null;
}

/**
 * Detect sub-genre based on genre and audio characteristics
 */
async function detectSubGenre(genre, existingMetadata) {
  // Simple rule-based sub-genre detection
  // In production, use ML model
  
  if (!genre) return null;

  const subGenreMap = {
    'House': ['Deep House', 'Tech House', 'Progressive House', 'Afro House'],
    'Techno': ['Melodic Techno', 'Industrial Techno', 'Minimal Techno'],
    'Trance': ['Progressive Trance', 'Uplifting Trance', 'Psy Trance'],
    'Drum & Bass': ['Liquid D&B', 'Neurofunk', 'Jungle'],
    'Afro House': ['Amapiano', 'Afro Tech', 'Tribal House'],
  };

  // Do not auto-assign the first sub-genre; keep unknown values explicit.
  return existingMetadata.sub_genre || null;
}

/**
 * Extract mood tags from audio or description
 */
async function extractMoodTags(audioUri, existingMetadata) {
  // Extract from description if available
  if (existingMetadata.description) {
    const moodKeywords = {
      'upbeat': ['upbeat', 'energetic', 'happy', 'uplifting', 'positive'],
      'hypnotic': ['hypnotic', 'trance', 'repetitive', 'mesmerizing'],
      'energetic': ['energetic', 'high energy', 'intense', 'powerful'],
      'dark': ['dark', 'deep', 'moody', 'atmospheric', 'ominous'],
      'sunny': ['sunny', 'bright', 'warm', 'tropical', 'beach'],
      'lounge': ['lounge', 'chill', 'relaxed', 'smooth', 'ambient'],
    };

    const description = existingMetadata.description.toLowerCase();
    const detectedMoods = [];

    for (const [mood, keywords] of Object.entries(moodKeywords)) {
      if (keywords.some(keyword => description.includes(keyword))) {
        detectedMoods.push(mood);
      }
    }

    if (detectedMoods.length > 0) {
      return detectedMoods;
    }
  }

  // TODO: Use audio analysis to detect mood
  // Analyze tempo, energy, key, etc.

  return existingMetadata.mood_tags || [];
}

/**
 * Extract audio features (waveform, energy, etc.)
 */
async function extractAudioFeatures(audioUri) {
  // TODO: Implement audio feature extraction
  // Features to extract:
  // - Energy level
  // - Key/mode
  // - Tempo variation
  // - Spectral characteristics
  
  return {
    energy: null,
    key: null,
    mode: null,
    tempo_stability: null,
  };
}

/**
 * Update mix metadata in database
 */
export async function updateMixMetadata(mixId, metadata) {
  try {
    const safeMetadata = metadata && typeof metadata === "object" ? metadata : {};
    const { error } = await supabase
      .from('mixes')
      .update({
        bpm: safeMetadata.bpm,
        duration: safeMetadata.duration ?? null,
        genre: safeMetadata.genre ?? null,
        sub_genre: safeMetadata.sub_genre,
        mood_tags: Array.isArray(safeMetadata.mood_tags)
          ? safeMetadata.mood_tags
          : [],
        audio_features:
          safeMetadata.audio_features &&
          typeof safeMetadata.audio_features === "object"
            ? safeMetadata.audio_features
            : {},
        metadata_extracted: !!safeMetadata.metadata_extracted,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mixId);

    if (error) throw error;

    // Trigger mix embedding recalculation in background (non-blocking)
    supabase.rpc('calculate_mix_embedding', {
      p_mix_id: mixId,
    }).catch((embeddingError) => {
      if (__DEV__) {
        console.warn('Failed to recalculate mix embedding:', embeddingError);
      }
    });

    return true;
  } catch (error) {
    console.error('Error updating mix metadata:', error);
    throw error;
  }
}

/**
 * Suggest metadata based on existing data
 */
export function suggestMetadata(existingMetadata) {
  const suggestions = {
    genre: existingMetadata.genre || null,
    sub_genre: null,
    mood_tags: [],
    bpm: null,
  };

  // Suggest sub-genre based on genre
  if (existingMetadata.genre) {
    const subGenreMap = {
      'House': ['Deep House', 'Tech House', 'Progressive House'],
      'Techno': ['Melodic Techno', 'Industrial Techno'],
      'Trance': ['Progressive Trance', 'Uplifting Trance'],
    };

    suggestions.sub_genre = subGenreMap[existingMetadata.genre]?.[0] || null;
  }

  // Suggest mood tags based on description
  if (existingMetadata.description) {
    const desc = existingMetadata.description.toLowerCase();
    if (desc.includes('upbeat') || desc.includes('energetic')) {
      suggestions.mood_tags.push('energetic');
    }
    if (desc.includes('dark') || desc.includes('deep')) {
      suggestions.mood_tags.push('dark');
    }
    if (desc.includes('chill') || desc.includes('relaxed')) {
      suggestions.mood_tags.push('lounge');
    }
  }

  return suggestions;
}

