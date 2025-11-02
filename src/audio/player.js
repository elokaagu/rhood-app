// src/audio/player.js
// Player bootstrap and management for react-native-track-player
// Centralized setup for iOS native media controls

import { Platform } from "react-native";

// Conditionally import track-player to avoid crashes if native module isn't available
let TrackPlayer = null;
let Capability = null;
let State = null;

try {
  const trackPlayerModule = require("react-native-track-player");
  TrackPlayer = trackPlayerModule.default || trackPlayerModule;
  Capability = trackPlayerModule.Capability;
  State = trackPlayerModule.State;
} catch (error) {
  console.warn("⚠️ react-native-track-player not available:", error.message);
  // TrackPlayer will be null, functions will check for this
}

let isInitialized = false;

/**
 * Initialize the track player with capabilities
 * Should be called once at app startup
 */
export async function setupPlayer() {
  if (!TrackPlayer) {
    throw new Error("react-native-track-player is not available");
  }

  if (isInitialized) {
    console.log("⚠️ Track player already initialized");
    return;
  }

  try {
    console.log("🎵 Initializing react-native-track-player...");

    // CRITICAL: setupPlayer() must be called first
    // This initializes the native player and triggers the playback service to start
    // The service function will register remote control event listeners
    await TrackPlayer.setupPlayer();
    console.log("✅ TrackPlayer.setupPlayer() completed");

    // CRITICAL: Wait for the playback service to finish registering listeners
    // The service function runs asynchronously when TrackPlayer.setupPlayer() is called
    // iOS requires listeners to be registered BEFORE updateOptions() sets capabilities
    // This ensures the service is ready to receive remote control events
    console.log("⏳ Waiting for playback service to register listeners...");
    await new Promise((resolve) => setTimeout(resolve, 500));
    console.log("✅ Service listeners should now be registered");

    // Configure capabilities for iOS lock screen and Control Center
    // CRITICAL: These must be set AFTER the service has registered listeners
    // and BEFORE any audio plays for remote controls to work
    console.log("⚙️ Configuring TrackPlayer capabilities...");
    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.JumpForward,
        Capability.JumpBackward,
        Capability.Stop,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
      // iOS specific options - CRITICAL for remote control events
      iosCategory: "playback",
      // The library handles category options internally when iosCategory is set
      // Android specific options
      android: {
        // Keep existing Android notification behavior
        alwaysShowNotification: Platform.OS === "android",
      },
    });

    console.log(
      "✅ Track player capabilities configured for remote control events"
    );

    // Configure progress update interval (default is 1 second)
    // This controls how often we get progress updates for the lock screen
    await TrackPlayer.updateOptions({
      progressUpdateEventInterval: 1, // 1 second
    });

    isInitialized = true;
    console.log("✅ Track player initialized with capabilities");
  } catch (error) {
    console.error("❌ Failed to initialize track player:", error);
    throw error;
  }
}

/**
 * Add a track to the queue with metadata
 * @param track - Track object with url, title, artist, artwork, etc.
 */
export async function addTrack(track) {
  if (!TrackPlayer) {
    throw new Error("react-native-track-player is not available");
  }

  try {
    console.log("🎵 Adding track to queue:", {
      id: track.id,
      title: track.title,
      artist: track.artist,
      hasArtwork: !!track.artwork,
      duration: track.duration,
    });

    // Ensure player is initialized
    await setupPlayer();

    // Add track with metadata
    await TrackPlayer.add({
      id: track.id,
      url: track.url,
      title: track.title,
      artist: track.artist,
      artwork: track.artwork || undefined, // Must be https URL, square, ≥1024px recommended
      duration: track.duration || undefined, // Duration in seconds
      genre: track.genre || "Electronic",
    });

    console.log("✅ Track added to queue");
  } catch (error) {
    console.error("❌ Failed to add track:", error);
    throw error;
  }
}

/**
 * Replace the current queue with a single track and start playing
 * @param track - Track to play
 */
export async function playTrack(track) {
  if (!TrackPlayer) {
    throw new Error("react-native-track-player is not available");
  }

  try {
    console.log("🎵 Playing track:", track.title);

    // Ensure player is initialized (this sets up capabilities)
    await setupPlayer();

    // CRITICAL: Small delay to ensure service is fully registered
    // iOS requires the service to be active before playback starts
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Clear existing queue
    await TrackPlayer.reset();

    // Add the track
    await addTrack(track);

    // Verify service is active before playing
    const state = await TrackPlayer.getState();
    console.log("📱 TrackPlayer state before play:", state);

    // Start playing
    await TrackPlayer.play();

    // Verify playback started
    const playState = await TrackPlayer.getState();
    const State = require("react-native-track-player").State;
    console.log(
      "📱 TrackPlayer state after play:",
      playState,
      "Expected:",
      State.Playing
    );
    console.log("📱 Is playing:", playState === State.Playing);

    console.log("✅ Track playing");
  } catch (error) {
    console.error("❌ Failed to play track:", error);
    throw error;
  }
}

/**
 * Pause playback
 */
export async function pause() {
  if (!TrackPlayer || !State) {
    throw new Error("react-native-track-player is not available");
  }
  try {
    // Check current state first
    const currentState = await TrackPlayer.getState();
    console.log("📊 Current player state before pause:", currentState);

    await TrackPlayer.pause();

    // Verify it actually paused
    await new Promise((resolve) => setTimeout(resolve, 100));
    const newState = await TrackPlayer.getState();
    console.log("📊 Player state after pause:", newState);

    console.log("⏸️ Playback paused");
  } catch (error) {
    console.error("❌ Failed to pause:", error);
    throw error;
  }
}

/**
 * Resume playback
 */
export async function resume() {
  if (!TrackPlayer || !State) {
    throw new Error("react-native-track-player is not available");
  }
  try {
    // Check current state first
    const currentState = await TrackPlayer.getState();
    console.log("📊 Current player state before resume:", currentState);

    // Use play() which works for both starting and resuming
    await TrackPlayer.play();

    // Verify it actually started
    await new Promise((resolve) => setTimeout(resolve, 100));
    const newState = await TrackPlayer.getState();
    console.log("📊 Player state after resume:", newState);

    console.log("▶️ Playback resumed");
  } catch (error) {
    console.error("❌ Failed to resume:", error);
    throw error;
  }
}

/**
 * Stop playback and clear queue
 */
export async function stop() {
  if (!TrackPlayer) {
    throw new Error("react-native-track-player is not available");
  }
  try {
    await TrackPlayer.stop();
    await TrackPlayer.reset();
    console.log("⏹️ Playback stopped");
  } catch (error) {
    console.error("❌ Failed to stop:", error);
    throw error;
  }
}

/**
 * Seek to a specific position
 * @param position - Position in seconds
 */
export async function seekTo(position) {
  if (!TrackPlayer) {
    throw new Error("react-native-track-player is not available");
  }
  try {
    await TrackPlayer.seekTo(position);
    console.log("⏩ Seeked to:", position);
  } catch (error) {
    console.error("❌ Failed to seek:", error);
    throw error;
  }
}

/**
 * Get current playback state
 */
export async function getPlaybackState() {
  if (!TrackPlayer || !State) {
    return {
      isPlaying: false,
      position: 0,
      duration: 0,
      track: null,
    };
  }
  try {
    const state = await TrackPlayer.getPlaybackState();
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
    console.error("❌ Failed to get playback state:", error);
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
  try {
    await TrackPlayer.skipToNext();
    console.log("⏭️ Skipped to next");
  } catch (error) {
    console.error("❌ Failed to skip to next:", error);
    throw error;
  }
}

/**
 * Skip to previous track
 */
export async function skipToPrevious() {
  if (!TrackPlayer) {
    throw new Error("react-native-track-player is not available");
  }
  try {
    await TrackPlayer.skipToPrevious();
    console.log("⏮️ Skipped to previous");
  } catch (error) {
    console.error("❌ Failed to skip to previous:", error);
    throw error;
  }
}
