// src/audio/player.js
// TrackPlayer setup and playback functions

let TrackPlayer = null;
let Capability = null;
let State = null;

try {
  const trackPlayerModule = require('react-native-track-player');
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
    await TrackPlayer.updateOptions({
      // Media controls capabilities
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.JumpForward,
        Capability.JumpBackward,
      ],
      // Capabilities that will show up when the notification is in the compact form on Android
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],
      // iOS specific options
      iosCategory: 'playback',
      // Jump intervals in seconds
      forwardJumpInterval: 15,
      backwardJumpInterval: 15,
      // Android specific options
      android: {
        // Continue playback when app is killed
        appKilledPlaybackBehavior: 'continue-playback',
      },
    });
    optionsUpdated = true;
    console.log('✅ TrackPlayer options updated');
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

  const trackObject = {
    id: track.id || String(Date.now()),
    url: track.url,
    title: track.title || 'Unknown Title',
    artist: track.artist || 'Unknown Artist',
    artwork: track.artwork || undefined,
    duration: track.duration || undefined,
    album: track.album || undefined,
    genre: track.genre || undefined,
  };

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
