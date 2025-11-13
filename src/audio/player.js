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
    console.log("🎵🎵🎵 [PLAYER] Initializing react-native-track-player...");

    // Define capabilities BEFORE setupPlayer() so they're ready immediately
    // This ensures we can call updateOptions() right after setupPlayer() completes
    const capabilities = [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
      Capability.JumpForward,
      Capability.JumpBackward,
      Capability.Stop,
    ];
    const compactCapabilities = [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
    ];

    console.log("🎵 [PLAYER] Capabilities defined:", {
      full: capabilities.length,
      compact: compactCapabilities.length,
    });

    // Step 1: Setup the player (this triggers the playback service to start)
    // The service function (from playbackService.js) will be called automatically
    // and will register all remote control event listeners SYNCHRONOUSLY
    // CRITICAL: The service function completes BEFORE setupPlayer() resolves
    console.log("🎵 [PLAYER] Step 1: Calling TrackPlayer.setupPlayer()...");
    console.log(
      "🎵 [PLAYER] This will trigger the service function to register event listeners"
    );
    await TrackPlayer.setupPlayer();
    console.log("✅✅✅ [PLAYER] TrackPlayer.setupPlayer() completed");
    console.log(
      "✅✅✅ [PLAYER] Service function should have completed - check for [SERVICE] logs"
    );

    // CRITICAL: Delay to ensure native bridge has processed service registration
    // The service function runs synchronously in JavaScript, but the native bridge
    // needs time to process the event listener registrations before we call updateOptions()
    // This ensures iOS MediaRemote can properly wire up the native handlers
    // Increased delay to 250ms to ensure native bridge has fully processed everything
    console.log(
      "🎵 [PLAYER] Waiting 250ms for native bridge to process service registration..."
    );
    console.log(
      "🎵 [PLAYER] This ensures event listeners are registered before updateOptions()"
    );
    await new Promise((resolve) => setTimeout(resolve, 250));
    console.log("✅✅✅ [PLAYER] Native bridge should have processed service registration");

    // Step 2: Configure capabilities AFTER ensuring service registration is processed
    // CRITICAL: updateOptions() registers native handlers with iOS MediaRemote framework
    // The service's JavaScript listeners must already be registered for this to work
    // React-native-track-player will wire up native handlers when updateOptions() is called
    console.log(
      "🎵 [PLAYER] Step 2: Configuring capabilities to register native handlers..."
    );
    console.log(
      "🎵 [PLAYER] This will register native handlers with iOS MediaRemote framework"
    );

    // CRITICAL: Call updateOptions ONCE with ALL options
    // This registers native handlers with iOS MediaRemote framework
    // The service's JavaScript listeners must already be registered (from setupPlayer above)
    try {
      const options = {
        capabilities,
        compactCapabilities,
        // Jump intervals for fast forward/rewind (in seconds)
        jumpInterval: 15, // 15 seconds for jump forward/backward
        // Progress update interval (how often lock screen progress bar updates)
        progressUpdateEventInterval: 1, // 1 second
        // iOS specific options - CRITICAL for remote control events
        iosCategory: "playback", // Enables background audio and remote controls
        // Android specific options
        android: {
          alwaysShowNotification: Platform.OS === "android",
        },
      };

      console.log("🎵 [PLAYER] Calling updateOptions() with:", {
        capabilitiesCount: capabilities.length,
        compactCapabilitiesCount: compactCapabilities.length,
        jumpInterval: options.jumpInterval,
        iosCategory: options.iosCategory,
      });

      await TrackPlayer.updateOptions(options);

      console.log(
        "✅✅✅ [PLAYER] Capabilities configured - native handlers should now be registered with iOS"
      );
      console.log(
        "✅✅✅ [PLAYER] Lock screen and Control Center will show: Play, Pause, Next, Previous, Seek"
      );
      console.log(
        "✅✅✅ [PLAYER] All options set in single updateOptions() call to ensure proper registration"
      );
    } catch (updateError) {
      console.error("❌❌❌ [PLAYER] Failed to update options:", updateError);
      console.error("❌❌❌ [PLAYER] Error details:", {
        message: updateError.message,
        stack: updateError.stack,
        error: updateError,
      });
      // Don't throw - allow playback to continue, but remote controls won't work
      console.warn(
        "⚠️ [PLAYER] Continuing without remote controls - playback will still work"
      );
    }

    isInitialized = true;
    console.log(
      "✅✅✅ [PLAYER] Track player fully initialized and ready for remote controls"
    );
    console.log(
      "✅✅✅ [PLAYER] Remote control commands should now be deliverable to handlers"
    );
  } catch (error) {
    console.error("❌❌❌ [PLAYER] Failed to initialize track player:", error);
    console.error("❌❌❌ [PLAYER] Error details:", {
      message: error.message,
      stack: error.stack,
    });
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

    // Clear existing queue and add track
    await TrackPlayer.reset();
    await addTrack(track);

    // Start playing
    await TrackPlayer.play();
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
