// src/audio/player.js
// TrackPlayer setup and playback functions

import { Platform } from "react-native";

let TrackPlayer = null;
let Capability = null;
let State = null;

try {
  const trackPlayerModule = require("react-native-track-player");
  TrackPlayer = trackPlayerModule.default || trackPlayerModule;
  Capability = trackPlayerModule.Capability;
  State = trackPlayerModule.State;
} catch (error) {
  console.warn("react-native-track-player not available:", error.message);
}

let isInitialized = false;

/**
 * Initialize TrackPlayer with capabilities
 */
export async function setupPlayer() {
  if (!TrackPlayer) {
    throw new Error("react-native-track-player is not available");
  }

  if (isInitialized) {
    return;
  }

  try {
    console.log("🎵 [PLAYER] Calling TrackPlayer.setupPlayer()...");
    await TrackPlayer.setupPlayer();
    console.log(
      "✅ [PLAYER] TrackPlayer.setupPlayer() completed - service should be called now"
    );

    console.log("🎵 [PLAYER] Updating options with capabilities...");
    await TrackPlayer.updateOptions({
      stopWithApp: false,
      alwaysPauseOnInterruption: true,
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
      // iOS / Android extras
      iosCategory: "playback",
      android: {
        alwaysShowNotification: Platform.OS === "android",
      },
      // Jump controls intervals
      forwardJumpInterval: 15,
      backwardJumpInterval: 15,
      progressUpdateEventInterval: 1,
    });
    console.log("✅ [PLAYER] TrackPlayer.updateOptions() completed");

    isInitialized = true;
    console.log("✅ [PLAYER] TrackPlayer fully initialized");
  } catch (error) {
    console.error("Failed to initialize TrackPlayer:", error);
    throw error;
  }
}

/**
 * Add a track to the queue
 */
export async function addTrack(track) {
  if (!TrackPlayer) {
    throw new Error("react-native-track-player is not available");
  }

  await setupPlayer();

  await TrackPlayer.add({
    id: track.id,
    url: track.url,
    title: track.title,
    artist: track.artist,
    artwork: track.artwork || undefined,
    duration: track.duration || undefined,
    genre: track.genre || "Electronic",
  });
}

/**
 * Replace queue with a track and start playing
 */
export async function playTrack(track) {
  if (!TrackPlayer) {
    throw new Error("react-native-track-player is not available");
  }

  await setupPlayer();
  await TrackPlayer.reset();
  await addTrack(track);
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
 * Seek to position
 */
export async function seekTo(position) {
  if (!TrackPlayer) {
    throw new Error("react-native-track-player is not available");
  }
  await TrackPlayer.seekTo(position);
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
    console.error("Failed to get playback state:", error);
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
