// Audio waveform generation utilities
// Generates visual waveform representations from audio data

/**
 * Generate a simple waveform array based on duration
 * For demo purposes - in production, you'd analyze actual audio
 * @param {number} duration - Duration in seconds
 * @param {number} points - Number of waveform points
 * @returns {number[]} - Array of waveform heights (0-100)
 */
export function generateSimpleWaveform(duration, points = 16) {
  const waveform = [];
  const seed = duration; // Use duration as seed for consistency
  
  for (let i = 0; i < points; i++) {
    // Generate pseudo-random heights based on position and seed
    const phase = (i / points) * Math.PI * 2;
    const variation = Math.sin(phase + seed) * 20;
    const base = 30 + Math.sin(phase * 3) * 15;
    const height = Math.max(15, Math.min(100, base + variation));
    waveform.push(Math.round(height));
  }
  
  return waveform;
}

/**
 * Generate a waveform with realistic music characteristics
 * @param {number} duration - Duration in seconds
 * @param {string} genre - Music genre for characteristic patterns
 * @param {number} points - Number of waveform points
 * @returns {number[]} - Array of waveform heights (0-100)
 */
export function generateGenreWaveform(duration, genre = 'electronic', points = 16) {
  const waveform = [];
  
  // Genre-specific characteristics
  const genreProfiles = {
    'house': { intensity: 0.7, variability: 0.3, buildups: true },
    'techno': { intensity: 0.8, variability: 0.4, buildups: true },
    'rnb': { intensity: 0.5, variability: 0.5, buildups: false },
    'soul': { intensity: 0.4, variability: 0.6, buildups: false },
    'hiphop': { intensity: 0.6, variability: 0.7, buildups: false },
    'electronic': { intensity: 0.7, variability: 0.5, buildups: true },
    'drum & bass': { intensity: 0.9, variability: 0.8, buildups: true },
    'dubstep': { intensity: 0.9, variability: 0.9, buildups: true },
  };
  
  const profile = genreProfiles[genre.toLowerCase()] || genreProfiles['electronic'];
  const { intensity, variability, buildups } = profile;
  
  for (let i = 0; i < points; i++) {
    const position = i / points;
    let height;
    
    if (buildups && position > 0.6 && position < 0.75) {
      // Build-up section
      const buildupProgress = (position - 0.6) / 0.15;
      height = 40 + (buildupProgress * 50);
    } else if (buildups && position >= 0.75 && position < 0.85) {
      // Drop section
      height = 80 + (Math.random() * 20);
    } else {
      // Normal variation
      const baseHeight = 30 + (intensity * 40);
      const variation = (Math.random() - 0.5) * variability * 40;
      height = baseHeight + variation;
    }
    
    // Ensure within bounds
    height = Math.max(15, Math.min(100, height));
    waveform.push(Math.round(height));
  }
  
  return waveform;
}

/**
 * Generate waveform from actual audio file (Web Audio API)
 * NOTE: This requires the audio file to be accessible and CORS-enabled
 * @param {string} audioUrl - URL to audio file
 * @param {number} points - Number of waveform points
 * @returns {Promise<number[]>} - Array of waveform heights (0-100)
 */
export async function generateWaveformFromAudio(audioUrl, points = 16) {
  try {
    // Check if Web Audio API is available
    if (typeof AudioContext === 'undefined' && typeof webkitAudioContext === 'undefined') {
      console.warn('Web Audio API not available, using simple waveform');
      return generateSimpleWaveform(300, points);
    }
    
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    const audioContext = new AudioContextClass();
    
    // Fetch audio file
    const response = await fetch(audioUrl);
    const arrayBuffer = await response.arrayBuffer();
    
    // Decode audio data
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    // Get audio data from first channel
    const rawData = audioBuffer.getChannelData(0);
    const samples = audioBuffer.length;
    const blockSize = Math.floor(samples / points);
    const waveform = [];
    
    // Calculate average amplitude for each block
    for (let i = 0; i < points; i++) {
      const start = blockSize * i;
      let sum = 0;
      
      for (let j = 0; j < blockSize; j++) {
        sum += Math.abs(rawData[start + j]);
      }
      
      const average = sum / blockSize;
      // Normalize to 0-100 range with some amplification
      const height = Math.min(100, Math.round(average * 200));
      waveform.push(Math.max(15, height)); // Minimum height for visibility
    }
    
    return waveform;
  } catch (error) {
    console.error('Error generating waveform from audio:', error);
    // Fallback to simple waveform
    return generateSimpleWaveform(300, points);
  }
}

/**
 * Get waveform for a mix (tries audio analysis, falls back to genre-based)
 * @param {Object} mix - Mix object with audioUrl, duration, and genre
 * @param {number} points - Number of waveform points
 * @returns {Promise<number[]>} - Array of waveform heights (0-100)
 */
export async function getMixWaveform(mix, points = 16) {
  // If mix already has waveform, return it
  if (mix.waveform && Array.isArray(mix.waveform) && mix.waveform.length > 0) {
    return mix.waveform;
  }
  
  // Try to generate from audio file (may fail due to CORS or browser limitations)
  if (mix.audioUrl && mix.audioUrl.startsWith('http')) {
    try {
      const waveform = await generateWaveformFromAudio(mix.audioUrl, points);
      if (waveform && waveform.length > 0) {
        return waveform;
      }
    } catch (error) {
      console.log('Could not generate waveform from audio, using genre-based fallback');
    }
  }
  
  // Fallback to genre-based waveform
  if (mix.genre) {
    return generateGenreWaveform(mix.duration || 300, mix.genre, points);
  }
  
  // Final fallback to simple waveform
  return generateSimpleWaveform(mix.duration || 300, points);
}

/**
 * Convert waveform heights to SVG path
 * @param {number[]} waveform - Array of heights (0-100)
 * @param {number} width - SVG width
 * @param {number} height - SVG height
 * @returns {string} - SVG path string
 */
export function waveformToSVGPath(waveform, width = 100, height = 50) {
  if (!waveform || waveform.length === 0) {
    return '';
  }
  
  const step = width / (waveform.length - 1);
  const points = waveform.map((value, index) => {
    const x = index * step;
    const y = height - (value / 100) * height;
    return `${x},${y}`;
  });
  
  return `M ${points.join(' L ')}`;
}

