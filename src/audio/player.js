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

  // Ensure URL is a string (not an object with uri property)
  let trackUrl = track.url;
  if (typeof trackUrl === "object" && trackUrl.uri) {
    trackUrl = trackUrl.uri;
  }
  if (typeof trackUrl !== "string") {
    throw new Error(`Invalid track URL: ${JSON.stringify(trackUrl)}`);
  }

  console.log(
    "🎵 [PLAYER] Adding track with URL:",
    trackUrl.substring(0, 50) + "..."
  );

  await TrackPlayer.add({
    id: track.id,
    url: trackUrl,
    title: track.title,
    artist: track.artist,
    artwork: track.artwork || undefined,
    duration: track.duration || undefined,
    genre: track.genre || "Electronic",
  });

  console.log("✅ [PLAYER] Track added successfully");
}

/**
 * Replace queue with a track and start playing
 */
export async function playTrack(track) {
  if (!TrackPlayer) {
    throw new Error("react-native-track-player is not available");
  }

  console.log("🎵 [PLAYER] playTrack called with:", {
    id: track.id,
    title: track.title,
    url: track.url,
  });

  await setupPlayer();

  console.log("🎵 [PLAYER] Resetting queue...");
  await TrackPlayer.reset();

  console.log("🎵 [PLAYER] Adding track to queue...");
  await addTrack(track);

  // Verify track was added
  const queue = await TrackPlayer.getQueue();
  console.log("✅ [PLAYER] Track added, queue length:", queue.length);

  console.log("🎵 [PLAYER] Starting playback...");

  // Wait a moment for track to be ready
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Get active track to verify it's loaded
  const activeTrack = await TrackPlayer.getActiveTrack();
  console.log(
    "🎵 [PLAYER] Active track:",
    activeTrack ? activeTrack.id : "none"
  );

  // TrackPlayer should automatically make the first track active when we add it
  // But let's verify and wait a bit for it to be ready
  if (!activeTrack) {
    console.warn(
      "⚠️ [PLAYER] No active track after adding, waiting for track to load..."
    );
    // Wait a bit longer for track to load
    await new Promise((resolve) => setTimeout(resolve, 500));

    const queue = await TrackPlayer.getQueue();
    console.log("🎵 [PLAYER] Queue after wait:", queue.length, "tracks");

    if (queue.length === 0) {
      throw new Error("Cannot play: Track was not added to queue");
    }

    // Check active track again
    const retryActiveTrack = await TrackPlayer.getActiveTrack();
    if (!retryActiveTrack) {
      console.warn(
        "⚠️ [PLAYER] Still no active track, TrackPlayer should set it automatically when play() is called"
      );
    }
  }

  console.log("🎵 [PLAYER] Calling TrackPlayer.play()...");
  await TrackPlayer.play();

  // Verify playback started - wait a bit for state to update
  await new Promise((resolve) => setTimeout(resolve, 200));
  const state = await TrackPlayer.getState();
  const position = await TrackPlayer.getPosition();
  console.log(
    "✅ [PLAYER] Playback started, state:",
    state,
    "position:",
    position
  );

  if (state !== State.Playing) {
    console.error(
      "❌ [PLAYER] TrackPlayer.play() was called but state is not Playing:",
      state
    );
  }
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
