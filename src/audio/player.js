// src/audio/player.js
// TrackPlayer setup and playback functions

let TrackPlayer = null;
let Capability = null;
let State = null;

try {
  // Use eval to prevent Metro from statically analyzing this require
  // eslint-disable-next-line no-eval
  const trackPlayerModule = eval('require')('react-native-track-player');
  TrackPlayer = trackPlayerModule.default || trackPlayerModule;
  Capability = trackPlayerModule.Capability;
  State = trackPlayerModule.State;
} catch (error) {
  console.warn('react-native-track-player not available:', error.message);
}

let isInitialized = false;
let optionsUpdated = false;

/**
 * Initialize TrackPlayer with capabilities
 */
export async function setupPlayer() {
  if (!TrackPlayer) {
    throw new Error('react-native-track-player is not available');
  }

  if (!isInitialized) {
    await TrackPlayer.setupPlayer();
    isInitialized = true;
    console.log('✅ TrackPlayer initialized');
  }

  if (!optionsUpdated) {
    // Configure all available capabilities for full lock screen control
    const capabilities = [
      Capability.Play,
      Capability.Pause,
      Capability.Stop,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
      Capability.JumpForward,
      Capability.JumpBackward,
    ];

    // Compact capabilities for Android notification (limited space)
    const compactCapabilities = [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
    ];

    await TrackPlayer.updateOptions({
      // Full capabilities for lock screen and Control Center
      capabilities,
      // Compact capabilities for Android notification
      compactCapabilities,
      // iOS specific options - CRITICAL for lock screen controls
      iosCategory: 'playback', // Allows background audio and remote controls
      // Jump intervals in seconds (for skip forward/backward)
      forwardJumpInterval: 15,
      backwardJumpInterval: 15,
      // Android notification options
      android: {
        // Show notification on lock screen
        alwaysShowNotification: true,
        // Notification icon (uses app icon if not specified)
      },
    });
    optionsUpdated = true;
    console.log('✅ TrackPlayer options updated with full lock screen capabilities');
    if (Array.isArray(capabilities)) {
      console.log('📱 Capabilities:', capabilities.map(c => c).join(', '));
    }
  }
}

/**
 * Add a track to the queue
 */
export async function addTrack(track) {
  if (!TrackPlayer) {
    throw new Error('react-native-track-player is not available');
  }

  await setupPlayer();

  // Ensure artwork URL is valid (must be HTTPS for iOS lock screen)
  let artworkUrl = track.artwork;
  if (artworkUrl && typeof artworkUrl === 'string') {
    // Convert HTTP to HTTPS if needed (iOS requires HTTPS for artwork)
    if (artworkUrl.startsWith('http://')) {
      artworkUrl = artworkUrl.replace('http://', 'https://');
    }
    // Remove undefined if empty string
    if (!artworkUrl.trim()) {
      artworkUrl = undefined;
    }
  } else {
    artworkUrl = undefined;
  }

  const trackObject = {
    id: track.id || String(Date.now()),
    url: track.url,
    title: track.title || 'R/HOOD Mix',
    artist: track.artist || 'Unknown Artist',
    artwork: artworkUrl,
    duration: track.duration || undefined,
    album: track.album || track.genre || 'R/HOOD',
    genre: track.genre || 'Electronic',
  };

  console.log('📱 Adding track to TrackPlayer:', {
    id: trackObject.id,
    title: trackObject.title,
    artist: trackObject.artist,
    hasArtwork: !!trackObject.artwork,
    artwork: trackObject.artwork,
    duration: trackObject.duration,
  });

  await TrackPlayer.add(trackObject);
  console.log('✅ Track added to queue:', trackObject.title);
}

/**
 * Replace queue with a track and start playing
 */
export async function playTrack(track) {
  if (!TrackPlayer) {
    throw new Error('react-native-track-player is not available');
  }

  await setupPlayer();
  
  // Reset the queue
  await TrackPlayer.reset();
  
  // Add the track
  await addTrack(track);
  
  // Start playing
  await TrackPlayer.play();
  console.log('✅ Track started playing:', track.title);
}

/**
 * Add multiple tracks to the queue
 */
export async function addTracks(tracks) {
  if (!TrackPlayer) {
    throw new Error('react-native-track-player is not available');
  }
  if (!Array.isArray(tracks)) {
    throw new Error('addTracks requires an array of tracks');
  }

  await setupPlayer();

  const trackObjects = tracks.map((track, index) => {
    // Ensure artwork URL is valid (must be HTTPS for iOS lock screen)
    let artworkUrl = track.artwork;
    if (artworkUrl && typeof artworkUrl === 'string') {
      // Convert HTTP to HTTPS if needed (iOS requires HTTPS for artwork)
      if (artworkUrl.startsWith('http://')) {
        artworkUrl = artworkUrl.replace('http://', 'https://');
      }
      // Remove undefined if empty string
      if (!artworkUrl.trim()) {
        artworkUrl = undefined;
      }
    } else {
      artworkUrl = undefined;
    }

    return {
      id: track.id || String(Date.now() + index),
      url: track.url,
      title: track.title || 'R/HOOD Mix',
      artist: track.artist || 'Unknown Artist',
      artwork: artworkUrl,
      duration: track.duration || undefined,
      album: track.album || track.genre || 'R/HOOD',
      genre: track.genre || 'Electronic',
    };
  });

  console.log(`📱 Adding ${trackObjects.length} tracks to TrackPlayer queue`);
  trackObjects.forEach((track, index) => {
    console.log(`  Track ${index + 1}:`, {
      title: track.title,
      artist: track.artist,
      hasArtwork: !!track.artwork,
    });
  });

  await TrackPlayer.add(trackObjects);
  console.log(`✅ Added ${trackObjects.length} tracks to queue`);
}

/**
 * Replace queue with multiple tracks and start playing the first one
 */
export async function playTracks(tracks, startIndex = 0) {
  if (!TrackPlayer) {
    throw new Error('react-native-track-player is not available');
  }

  if (!tracks || tracks.length === 0) {
    throw new Error('No tracks provided');
  }

  await setupPlayer();
  
  // Reset the queue
  await TrackPlayer.reset();
  
  // Add all tracks
  await addTracks(tracks);
  
  // Skip to the starting track if not the first one
  if (startIndex > 0 && startIndex < tracks.length) {
    await TrackPlayer.skip(startIndex);
  }
  
  // Start playing
  await TrackPlayer.play();
  
  // Verify the current track metadata
  try {
    const currentTrackIndex = await TrackPlayer.getCurrentTrack();
    if (currentTrackIndex !== null) {
      const currentTrack = await TrackPlayer.getTrack(currentTrackIndex);
      console.log('📱 Current track metadata on lock screen:', {
        title: currentTrack?.title,
        artist: currentTrack?.artist,
        hasArtwork: !!currentTrack?.artwork,
        artwork: currentTrack?.artwork,
        duration: currentTrack?.duration,
      });
    }
  } catch (error) {
    console.warn('⚠️ Could not verify current track metadata:', error);
  }
  
  console.log(`✅ Started playing track ${startIndex + 1} of ${tracks.length}: ${tracks[startIndex].title}`);
}

/**
 * Pause playback
 */
export async function pause() {
  if (!TrackPlayer) {
    throw new Error('react-native-track-player is not available');
  }
  await TrackPlayer.pause();
  console.log('⏸️ Playback paused');
}

/**
 * Resume playback
 */
export async function resume() {
  if (!TrackPlayer) {
    throw new Error('react-native-track-player is not available');
  }
  await TrackPlayer.play();
  console.log('▶️ Playback resumed');
}

/**
 * Stop playback and clear queue
 */
export async function stop() {
  if (!TrackPlayer) {
    throw new Error('react-native-track-player is not available');
  }
  await TrackPlayer.stop();
  await TrackPlayer.reset();
  console.log('⏹️ Playback stopped');
}

/**
 * Seek to position (in seconds)
 */
export async function seekTo(position) {
  if (!TrackPlayer) {
    throw new Error('react-native-track-player is not available');
  }
  await TrackPlayer.seekTo(position);
  console.log(`⏩ Seeked to ${position}s`);
}

/**
 * Get playback state
 */
export async function getPlaybackState() {
  if (!TrackPlayer) {
    return {
      isPlaying: false,
      position: 0,
      duration: 0,
      track: null,
      state: State?.None || 'none',
    };
  }

  try {
    const state = await TrackPlayer.getState();
    const position = await TrackPlayer.getPosition();
    const duration = await TrackPlayer.getDuration();
    const trackIndex = await TrackPlayer.getCurrentTrack();
    const track = trackIndex !== null ? await TrackPlayer.getTrack(trackIndex) : null;

    return {
      isPlaying: state === State.Playing,
      position,
      duration,
      track,
      state,
    };
  } catch (error) {
    console.error('Error getting playback state:', error);
    return {
      isPlaying: false,
      position: 0,
      duration: 0,
      track: null,
      state: State.None,
    };
  }
}

/**
 * Skip to next track
 */
export async function skipToNext() {
  if (!TrackPlayer) {
    throw new Error('react-native-track-player is not available');
  }
  await TrackPlayer.skipToNext();
  console.log('⏭️ Skipped to next track');
}

/**
 * Skip to previous track
 */
export async function skipToPrevious() {
  if (!TrackPlayer) {
    throw new Error('react-native-track-player is not available');
  }
  await TrackPlayer.skipToPrevious();
  console.log('⏮️ Skipped to previous track');
}

/**
 * Get the current track
 */
export async function getCurrentTrack() {
  if (!TrackPlayer) {
    return null;
  }
  try {
    const trackIndex = await TrackPlayer.getCurrentTrack();
    if (trackIndex !== null) {
      return await TrackPlayer.getTrack(trackIndex);
    }
    return null;
  } catch (error) {
    console.error('Error getting current track:', error);
    return null;
  }
}

/**
 * Get the queue
 */
export async function getQueue() {
  if (!TrackPlayer) {
    return [];
  }
  try {
    return await TrackPlayer.getQueue();
  } catch (error) {
    console.error('Error getting queue:', error);
    return [];
  }
}

// Export TrackPlayer and State for use in other files (if available)
export function getTrackPlayer() {
  return TrackPlayer;
}

export function getState() {
  return State;
}

export function getCapability() {
  return Capability;
}
