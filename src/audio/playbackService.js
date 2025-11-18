// src/audio/playbackService.js
// Background service for react-native-track-player
// Handles remote control events from iOS lock screen, Control Center, and AirPods

// CRITICAL: Use require() for CommonJS compatibility with registerPlaybackService
const trackPlayerModule = require("react-native-track-player");
const TrackPlayer = trackPlayerModule.default || trackPlayerModule;
const Event = trackPlayerModule.Event || trackPlayerModule.Event;
const State = trackPlayerModule.State || trackPlayerModule.State;

module.exports = async function () {
  console.log("🎧 [Service] ========================================");
  console.log("🎧 [Service] ⚠️⚠️⚠️ SERVICE FUNCTION CALLED ⚠️⚠️⚠️");
  console.log("🎧 [Service] Playback service STARTING");
  console.log("🎧 [Service] TrackPlayer available:", !!TrackPlayer);
  console.log("🎧 [Service] Event available:", !!Event);
  console.log("🎧 [Service] State available:", !!State);
  console.log("🎧 [Service] ========================================");

  // Verify TrackPlayer is available
  if (!TrackPlayer) {
    console.error("❌ [Service] TrackPlayer is not available!");
    return;
  }

  if (!Event) {
    console.error("❌ [Service] Event is not available!");
    return;
  }

  // Register all remote control event listeners
  // These MUST call TrackPlayer methods to actually control playback
  try {
    // Remote Play - CRITICAL: Must call TrackPlayer.play()
    TrackPlayer.addEventListener(Event.RemotePlay, async () => {
      console.log("[REMOTE] Play pressed");
      try {
        const currentState = await TrackPlayer.getState();
        console.log("[REMOTE] Current state before play:", currentState);
        
        // Only play if paused or ready
        if (currentState === State.Paused || currentState === State.Ready) {
          await TrackPlayer.play();
          console.log("[REMOTE] TrackPlayer.play() called successfully");
          
          // Verify it actually started
          const newState = await TrackPlayer.getState();
          console.log("[REMOTE] State after play:", newState);
        } else {
          console.log("[REMOTE] Already playing, state:", currentState);
        }
      } catch (error) {
        console.error("[REMOTE] Play error:", error?.message || error);
      }
    });

    // Remote Pause - CRITICAL: Must call TrackPlayer.pause()
    TrackPlayer.addEventListener(Event.RemotePause, async () => {
      console.log("[REMOTE] Pause pressed");
      try {
        const currentState = await TrackPlayer.getState();
        console.log("[REMOTE] Current state before pause:", currentState);
        
        await TrackPlayer.pause();
        console.log("[REMOTE] TrackPlayer.pause() called successfully");
        
        // Verify it actually paused
        const newState = await TrackPlayer.getState();
        console.log("[REMOTE] State after pause:", newState);
      } catch (error) {
        console.error("[REMOTE] Pause error:", error?.message || error);
      }
    });

    // Remote Seek
    TrackPlayer.addEventListener(Event.RemoteSeek, async ({ position }) => {
      console.log("[REMOTE] Seek to", position);
      try {
        await TrackPlayer.seekTo(position);
        console.log("[REMOTE] TrackPlayer.seekTo() called successfully");
      } catch (error) {
        console.error("[REMOTE] Seek error:", error?.message || error);
      }
    });

    // Remote Next
    TrackPlayer.addEventListener(Event.RemoteNext, async () => {
      console.log("[REMOTE] Next pressed");
      try {
        await TrackPlayer.skipToNext();
        console.log("[REMOTE] TrackPlayer.skipToNext() called successfully");
      } catch (e) {
        console.warn("[REMOTE] Next error:", e.message);
      }
    });

    // Remote Previous
    TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
      console.log("[REMOTE] Previous pressed");
      try {
        await TrackPlayer.skipToPrevious();
        console.log("[REMOTE] TrackPlayer.skipToPrevious() called successfully");
      } catch (e) {
        console.warn("[REMOTE] Previous error:", e.message);
      }
    });

    // Remote Jump Forward
    TrackPlayer.addEventListener(Event.RemoteJumpForward, async () => {
      console.log("[REMOTE] Jump Forward pressed");
      try {
        await TrackPlayer.seekBy(15);
        console.log("[REMOTE] TrackPlayer.seekBy(15) called successfully");
      } catch (error) {
        console.error("[REMOTE] Jump forward error:", error?.message || error);
      }
    });

    // Remote Jump Backward
    TrackPlayer.addEventListener(Event.RemoteJumpBackward, async () => {
      console.log("[REMOTE] Jump Backward pressed");
      try {
        await TrackPlayer.seekBy(-15);
        console.log("[REMOTE] TrackPlayer.seekBy(-15) called successfully");
      } catch (error) {
        console.error("[REMOTE] Jump backward error:", error?.message || error);
      }
    });

    // Remote Stop
    TrackPlayer.addEventListener(Event.RemoteStop, async () => {
      console.log("[REMOTE] Stop pressed");
      try {
        await TrackPlayer.stop();
        console.log("[REMOTE] TrackPlayer.stop() called successfully");
      } catch (error) {
        console.error("[REMOTE] Stop error:", error?.message || error);
      }
    });

    console.log("✅✅✅ [Service] ALL remote control handlers registered successfully");
    console.log("🎧 [Service] Service is now listening for lock screen button presses");
    console.log("🎧 [Service] ========================================");
  } catch (error) {
    console.error("❌❌❌ [Service] Error registering event listeners:", error?.message || error);
    console.error("❌❌❌ [Service] Full error:", error);
  }
};
