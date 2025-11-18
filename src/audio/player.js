// src/audio/player.js
// React Native TrackPlayer integration for iOS lock screen controls
// This is the ONLY audio player for iOS - fully integrated with lock screen controls

let TrackPlayer = null;
let Capability = null;
let State = null;
let Event = null;

try {
  const trackPlayerModule = require("react-native-track-player");
  TrackPlayer = trackPlayerModule.default || trackPlayerModule;
  Capability = trackPlayerModule.Capability;
  State = trackPlayerModule.State;
  Event = trackPlayerModule.Event;
} catch (error) {
  console.warn("react-native-track-player not available:", error.message);
}

let isInitialized = false;
let optionsUpdated = false;

/**
 * Initialize TrackPlayer with capabilities for lock screen controls
 */
export async function setupPlayer() {
  if (!TrackPlayer) {
    throw new Error("react-native-track-player is not available");
  }

  if (!isInitialized) {
    await TrackPlayer.setupPlayer();
    isInitialized = true;
  }

  if (!optionsUpdated) {
    await TrackPlayer.updateOptions({
      stopWithApp: false,
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.Stop,
        Capability.SeekTo,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.JumpForward,
        Capability.JumpBackward,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],
      iosCategory: "playback",
      forwardJumpInterval: 15,
      backwardJumpInterval: 15,
    });
    optionsUpdated = true;
  }
}

/**
 * Play a track - accepts the app's track format and converts to TrackPlayer format
 * Track format: { id, audioUrl, title, artist, image, durationMillis, genre, ... }
 */
export async function playTrack(track) {
  if (!TrackPlayer) {
    throw new Error("react-native-track-player is not available");
  }

  await setupPlayer();

  // Convert app track format to TrackPlayer format
  const audioUrl =
    typeof track.audioUrl === "string"
      ? track.audioUrl
      : track.audioUrl?.uri || track.audioUrl;

  if (!audioUrl) {
    throw new Error("Audio URL is missing");
  }

  // Reset queue and add track
  await TrackPlayer.reset();

  await TrackPlayer.add({
    id: track.id || `track-${Date.now()}`,
    url: audioUrl,
    title: track.title || "R/HOOD Mix",
    artist: track.artist || "Unknown Artist",
    artwork: track.image || null, // TrackPlayer expects 'artwork' not 'image'
    duration: track.durationMillis ? track.durationMillis / 1000 : undefined,
    genre: track.genre || "Electronic",
  });

  // Start playing
  await TrackPlayer.play();
}

/**
 * Pause playback
 */
export async function pause() {
  if (!TrackPlayer) {
    throw new Error("react-native-track-player is not available");
  }
  await TrackPlayer.pause();
}

/**
 * Resume playback
 */
export async function resume() {
  if (!TrackPlayer) {
    throw new Error("react-native-track-player is not available");
  }
  await TrackPlayer.play();
}

/**
 * Stop playback and clear queue
 */
export async function stop() {
  if (!TrackPlayer) {
    throw new Error("react-native-track-player is not available");
  }
  await TrackPlayer.stop();
  await TrackPlayer.reset();
}

/**
 * Seek to position (in seconds)
 */
export async function seekTo(position) {
  if (!TrackPlayer) {
    throw new Error("react-native-track-player is not available");
  }
  await TrackPlayer.seekTo(position);
}

/**
 * Get current playback state from TrackPlayer
 */
export async function getPlaybackState() {
  if (!TrackPlayer) {
    return {
      isPlaying: false,
      position: 0,
      duration: 0,
      track: null,
    };
  }

  try {
    const state = await TrackPlayer.getState();
    const position = await TrackPlayer.getPosition();
    const duration = await TrackPlayer.getDuration();
    const track = await TrackPlayer.getActiveTrack();

    return {
      isPlaying: state === State.Playing,
      position,
      duration,
      track,
    };
  } catch (error) {
    console.warn("Error getting playback state:", error);
    return {
      isPlaying: false,
      position: 0,
      duration: 0,
      track: null,
    };
  }
}

/**
 * Skip to next track
 */
export async function skipToNext() {
  if (!TrackPlayer) {
    throw new Error("react-native-track-player is not available");
  }
  await TrackPlayer.skipToNext();
}

/**
 * Skip to previous track
 */
export async function skipToPrevious() {
  if (!TrackPlayer) {
    throw new Error("react-native-track-player is not available");
  }
  await TrackPlayer.skipToPrevious();
}
