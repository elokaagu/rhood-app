// src/audio/playbackService.js
// Background playback service for react-native-track-player
// Handles remote commands from lock screen, Control Center, AirPods, etc.
// SIMPLIFIED: Direct TrackPlayer calls only - no complex callbacks

// Conditionally import track-player to avoid crashes if native module isn't available
let TrackPlayer = null;
let Event = null;
let State = null;

try {
  const trackPlayerModule = require("react-native-track-player");
  TrackPlayer = trackPlayerModule.default || trackPlayerModule;
  Event = trackPlayerModule.Event;
  State = trackPlayerModule.State;
} catch (error) {
  console.warn(
    "⚠️ react-native-track-player not available in playback service:",
    error.message
  );
}

// Store App.js functions for queue navigation
let playNextTrack = null;
let playPreviousTrack = null;

export function setQueueNavigationCallbacks(callbacks) {
  playNextTrack = callbacks?.playNextTrack || null;
  playPreviousTrack = callbacks?.playPreviousTrack || null;
  console.log("✅ Queue navigation callbacks set:", {
    hasNext: !!playNextTrack,
    hasPrevious: !!playPreviousTrack,
  });
}

// The playback service function - called by TrackPlayer when it initializes
module.exports = async function playbackService() {
  // Early return if track-player isn't available
  if (!TrackPlayer || !Event || !State) {
    console.warn("⚠️ Playback service: TrackPlayer not available");
    return;
  }

  console.log("🎵 Playback service starting...");

  // Register all remote control event listeners
  // These must be registered INSIDE the service function

  // Play button pressed
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    console.log("🔵 REMOTE: Play");
    try {
      await TrackPlayer.play();
      console.log("✅ Remote Play executed");
    } catch (error) {
      console.error("❌ Remote Play error:", error.message);
    }
  });

  // Pause button pressed
  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    console.log("⏸️ REMOTE: Pause");
    try {
      await TrackPlayer.pause();
      console.log("✅ Remote Pause executed");
    } catch (error) {
      console.error("❌ Remote Pause error:", error.message);
    }
  });

  // Next button pressed
  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    console.log("⏭️ REMOTE: Next");
    try {
      // Try App.js callback first (if available)
      if (playNextTrack && typeof playNextTrack === "function") {
        await playNextTrack();
        console.log("✅ Remote Next: Used App.js callback");
        return;
      }

      // Fallback to TrackPlayer's queue
      await TrackPlayer.skipToNext();
      console.log("✅ Remote Next: Used TrackPlayer queue");
    } catch (error) {
      // No next track - that's okay
      console.log("ℹ️ Remote Next: No next track available");
    }
  });

  // Previous button pressed
  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    console.log("⏮️ REMOTE: Previous");
    try {
      // Try App.js callback first (if available)
      if (playPreviousTrack && typeof playPreviousTrack === "function") {
        await playPreviousTrack();
        console.log("✅ Remote Previous: Used App.js callback");
        return;
      }

      // Fallback to TrackPlayer's queue
      await TrackPlayer.skipToPrevious();
      console.log("✅ Remote Previous: Used TrackPlayer queue");
    } catch (error) {
      // No previous track - that's okay
      console.log("ℹ️ Remote Previous: No previous track available");
    }
  });

  // Seek command
  TrackPlayer.addEventListener(Event.RemoteSeek, async (event) => {
    console.log("🎯 REMOTE: Seek to", event.position);
    try {
      await TrackPlayer.seekTo(event.position);
      console.log("✅ Remote Seek executed");
    } catch (error) {
      console.error("❌ Remote Seek error:", error.message);
    }
  });

  // Jump forward
  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
    console.log("⏩ REMOTE: Jump Forward", event.interval);
    try {
      const position = await TrackPlayer.getPosition();
      await TrackPlayer.seekTo(position + event.interval);
      console.log("✅ Remote Jump Forward executed");
    } catch (error) {
      console.error("❌ Remote Jump Forward error:", error.message);
    }
  });

  // Jump backward
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
    console.log("⏪ REMOTE: Jump Backward", event.interval);
    try {
      const position = await TrackPlayer.getPosition();
      await TrackPlayer.seekTo(Math.max(0, position - event.interval));
      console.log("✅ Remote Jump Backward executed");
    } catch (error) {
      console.error("❌ Remote Jump Backward error:", error.message);
    }
  });

  // Stop command
  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    console.log("⏹️ REMOTE: Stop");
    try {
      await TrackPlayer.stop();
      console.log("✅ Remote Stop executed");
    } catch (error) {
      console.error("❌ Remote Stop error:", error.message);
    }
  });

  // Playback state change - for UI sync
  TrackPlayer.addEventListener(Event.PlaybackState, async (data) => {
    const stateName =
      Object.keys(State).find((key) => State[key] === data.state) || data.state;
    console.log("📊 Playback State:", stateName);
  });

  // Track changed
  TrackPlayer.addEventListener(Event.PlaybackTrackChanged, async (data) => {
    console.log("🎵 Track Changed:", data.track?.title || "Unknown");
  });

  // Progress updated - registered to prevent warnings
  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async () => {
    // Silent - progress is handled elsewhere
  });

  console.log("✅ Playback service initialized - remote controls ready");
};
