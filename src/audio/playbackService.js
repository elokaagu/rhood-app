// src/audio/playbackService.js
// Background playback service for react-native-track-player
// Handles remote commands from lock screen, Control Center, AirPods, etc.
// CRITICAL: This service MUST be registered at app startup in index.js
// iOS sends remote control events directly to this service function

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

// The playback service function - called by TrackPlayer when setupPlayer() is called
// CRITICAL: This function runs in a background context, not in the React Native JS thread
// All event listeners must be registered here for iOS to route remote control events
// The service function should NOT be async - event listeners must be registered synchronously
module.exports = function playbackService() {
  // Import TrackPlayer INSIDE the service function to ensure we get the correct instance
  // This is the global TrackPlayer instance that iOS will use
  let TrackPlayer, Event, State;

  try {
    const trackPlayerModule = require("react-native-track-player");
    TrackPlayer = trackPlayerModule.default || trackPlayerModule;
    Event = trackPlayerModule.Event;
    State = trackPlayerModule.State;

    console.log("🎵 [SERVICE] Playback service function called by TrackPlayer");
    console.log("🎵 [SERVICE] TrackPlayer instance:", !!TrackPlayer);
    console.log("🎵 [SERVICE] Event module:", !!Event);
    console.log("🎵 [SERVICE] State module:", !!State);
  } catch (error) {
    console.error(
      "❌ [SERVICE] Failed to import react-native-track-player:",
      error
    );
    return; // Service cannot function without TrackPlayer
  }

  // Verify TrackPlayer has addEventListener method
  if (!TrackPlayer || typeof TrackPlayer.addEventListener !== "function") {
    console.error("❌ [SERVICE] TrackPlayer.addEventListener is not available");
    return;
  }

  // Verify Event constants are available
  if (!Event || !Event.RemotePlay) {
    console.error("❌ [SERVICE] Event constants are not available");
    console.error("❌ [SERVICE] Event object:", Event);
    return;
  }

  console.log(
    "✅ [SERVICE] TrackPlayer is ready - registering remote control handlers"
  );
  console.log("✅ [SERVICE] Available Event types:", {
    RemotePlay: !!Event.RemotePlay,
    RemotePause: !!Event.RemotePause,
    RemoteNext: !!Event.RemoteNext,
    RemotePrevious: !!Event.RemotePrevious,
    RemoteSeek: !!Event.RemoteSeek,
    RemoteJumpForward: !!Event.RemoteJumpForward,
    RemoteJumpBackward: !!Event.RemoteJumpBackward,
    RemoteStop: !!Event.RemoteStop,
  });

  // ============================================================================
  // CRITICAL: Register all remote control event listeners here
  // iOS sends remote control events (from lock screen, Control Center, AirPods)
  // directly to these handlers. If these aren't registered, buttons won't work.
  // ============================================================================

  // REMOTE PLAY - Lock screen/Control Center play button
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    console.log(
      "🔵🔵🔵 [REMOTE] PLAY button pressed on lock screen/Control Center"
    );
    console.log("🔵 [REMOTE] TrackPlayer instance available:", !!TrackPlayer);
    try {
      // Verify TrackPlayer is ready
      if (!TrackPlayer || typeof TrackPlayer.getState !== "function") {
        console.error("❌ [REMOTE] TrackPlayer not ready for play");
        return;
      }

      const state = await TrackPlayer.getState();
      console.log("🔵 [REMOTE] Current player state before play:", state);

      if (state !== State.Playing) {
        await TrackPlayer.play();
        const newState = await TrackPlayer.getState();
        console.log("✅✅✅ [REMOTE] Play executed successfully, new state:", newState);
      } else {
        console.log("ℹ️ [REMOTE] Already playing, no action needed");
      }
    } catch (error) {
      console.error("❌❌❌ [REMOTE] Play error:", error.message, error);
      console.error("❌❌❌ [REMOTE] Error stack:", error.stack);
    }
  });

  // REMOTE PAUSE - Lock screen/Control Center pause button
  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    console.log(
      "⏸️⏸️⏸️ [REMOTE] PAUSE button pressed on lock screen/Control Center"
    );
    console.log("⏸️ [REMOTE] TrackPlayer instance available:", !!TrackPlayer);
    try {
      // Verify TrackPlayer is ready
      if (!TrackPlayer || typeof TrackPlayer.getState !== "function") {
        console.error("❌ [REMOTE] TrackPlayer not ready for pause");
        return;
      }

      const state = await TrackPlayer.getState();
      console.log("⏸️ [REMOTE] Current player state before pause:", state);

      if (state === State.Playing) {
        await TrackPlayer.pause();
        const newState = await TrackPlayer.getState();
        console.log("✅✅✅ [REMOTE] Pause executed successfully, new state:", newState);
      } else {
        console.log("ℹ️ [REMOTE] Already paused, no action needed");
      }
    } catch (error) {
      console.error("❌❌❌ [REMOTE] Pause error:", error.message, error);
      console.error("❌❌❌ [REMOTE] Error stack:", error.stack);
    }
  });

  // REMOTE NEXT - Lock screen/Control Center next button
  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    console.log(
      "⏭️⏭️⏭️ [REMOTE] NEXT button pressed on lock screen/Control Center"
    );
    try {
      // Try App.js callback first (handles custom queue logic)
      if (playNextTrack && typeof playNextTrack === "function") {
        console.log("⏭️ [REMOTE] Using App.js playNextTrack callback");
        await playNextTrack();
        console.log("✅✅✅ [REMOTE] Next executed via App.js callback");
        return;
      }

      // Fallback to TrackPlayer's internal queue
      console.log("⏭️ [REMOTE] Using TrackPlayer.skipToNext()");
      await TrackPlayer.skipToNext();
      console.log("✅✅✅ [REMOTE] Next executed via TrackPlayer queue");
    } catch (error) {
      // No next track is fine - just log it
      console.log("ℹ️ [REMOTE] Next track not available:", error.message);
    }
  });

  // REMOTE PREVIOUS - Lock screen/Control Center previous button
  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    console.log(
      "⏮️⏮️⏮️ [REMOTE] PREVIOUS button pressed on lock screen/Control Center"
    );
    try {
      // Try App.js callback first (handles custom queue logic)
      if (playPreviousTrack && typeof playPreviousTrack === "function") {
        console.log("⏮️ [REMOTE] Using App.js playPreviousTrack callback");
        await playPreviousTrack();
        console.log("✅✅✅ [REMOTE] Previous executed via App.js callback");
        return;
      }

      // Fallback to TrackPlayer's internal queue
      console.log("⏮️ [REMOTE] Using TrackPlayer.skipToPrevious()");
      await TrackPlayer.skipToPrevious();
      console.log("✅✅✅ [REMOTE] Previous executed via TrackPlayer queue");
    } catch (error) {
      // No previous track is fine - just log it
      console.log("ℹ️ [REMOTE] Previous track not available:", error.message);
    }
  });

  // REMOTE SEEK - Scrubbing on lock screen progress bar
  TrackPlayer.addEventListener(Event.RemoteSeek, async (event) => {
    console.log("🎯🎯🎯 [REMOTE] SEEK to position:", event.position, "seconds");
    console.log("🎯 [REMOTE] Event object:", JSON.stringify(event));
    console.log("🎯 [REMOTE] TrackPlayer instance available:", !!TrackPlayer);
    try {
      // Verify TrackPlayer is ready
      if (!TrackPlayer || typeof TrackPlayer.seekTo !== "function") {
        console.error("❌ [REMOTE] TrackPlayer not ready for seek");
        return;
      }

      const position = event.position || event.seekTo || 0;
      console.log("🎯 [REMOTE] Seeking to position:", position, "seconds");
      
      await TrackPlayer.seekTo(position);
      
      const newPosition = await TrackPlayer.getPosition();
      console.log("✅✅✅ [REMOTE] Seek executed successfully, new position:", newPosition, "seconds");
    } catch (error) {
      console.error("❌❌❌ [REMOTE] Seek error:", error.message, error);
      console.error("❌❌❌ [REMOTE] Error stack:", error.stack);
    }
  });

  // REMOTE JUMP FORWARD - AirPods double-tap forward / Fast forward button
  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
    console.log("⏩⏩⏩ [REMOTE] JUMP FORWARD by", event.interval, "seconds");
    console.log("⏩ [REMOTE] Event object:", JSON.stringify(event));
    console.log("⏩ [REMOTE] TrackPlayer instance available:", !!TrackPlayer);
    try {
      // Verify TrackPlayer is ready
      if (!TrackPlayer || typeof TrackPlayer.getPosition !== "function") {
        console.error("❌ [REMOTE] TrackPlayer not ready for jump forward");
        return;
      }

      const position = await TrackPlayer.getPosition();
      const interval = event.interval || 15; // Default 15 seconds if not provided
      const newPosition = position + interval;
      console.log("⏩ [REMOTE] Current position:", position, "seconds, jumping forward", interval, "seconds");
      
      await TrackPlayer.seekTo(newPosition);
      
      const verifiedPosition = await TrackPlayer.getPosition();
      console.log(
        "✅✅✅ [REMOTE] Jump forward executed:",
        verifiedPosition,
        "seconds"
      );
    } catch (error) {
      console.error(
        "❌❌❌ [REMOTE] Jump forward error:",
        error.message,
        error
      );
      console.error("❌❌❌ [REMOTE] Error stack:", error.stack);
    }
  });

  // REMOTE JUMP BACKWARD - AirPods double-tap backward / Rewind button
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
    console.log("⏪⏪⏪ [REMOTE] JUMP BACKWARD by", event.interval, "seconds");
    console.log("⏪ [REMOTE] Event object:", JSON.stringify(event));
    console.log("⏪ [REMOTE] TrackPlayer instance available:", !!TrackPlayer);
    try {
      // Verify TrackPlayer is ready
      if (!TrackPlayer || typeof TrackPlayer.getPosition !== "function") {
        console.error("❌ [REMOTE] TrackPlayer not ready for jump backward");
        return;
      }

      const position = await TrackPlayer.getPosition();
      const interval = event.interval || 15; // Default 15 seconds if not provided
      const newPosition = Math.max(0, position - interval);
      console.log("⏪ [REMOTE] Current position:", position, "seconds, jumping backward", interval, "seconds");
      
      await TrackPlayer.seekTo(newPosition);
      
      const verifiedPosition = await TrackPlayer.getPosition();
      console.log(
        "✅✅✅ [REMOTE] Jump backward executed:",
        verifiedPosition,
        "seconds"
      );
    } catch (error) {
      console.error(
        "❌❌❌ [REMOTE] Jump backward error:",
        error.message,
        error
      );
      console.error("❌❌❌ [REMOTE] Error stack:", error.stack);
    }
  });

  // REMOTE STOP - Stop playback
  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    console.log("⏹️⏹️⏹️ [REMOTE] STOP button pressed");
    try {
      await TrackPlayer.stop();
      console.log("✅✅✅ [REMOTE] Stop executed successfully");
    } catch (error) {
      console.error("❌❌❌ [REMOTE] Stop error:", error.message, error);
    }
  });

  // Playback state changes (for debugging/monitoring)
  TrackPlayer.addEventListener(Event.PlaybackState, async (data) => {
    const stateName =
      Object.keys(State).find((key) => State[key] === data.state) || data.state;
    console.log("📊 [SERVICE] Playback State changed:", stateName);
  });

  // Track changed (for debugging/monitoring)
  TrackPlayer.addEventListener(Event.PlaybackTrackChanged, async (data) => {
    console.log("🎵 [SERVICE] Track Changed:", data.track?.title || "Unknown");
  });

  // Progress updates (registered to prevent warnings, but we don't need to handle it here)
  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async () => {
    // Silent - progress is handled in App.js for UI updates
  });

  // ============================================================================
  // CRITICAL: All event listeners are now registered
  // The service function must complete SYNCHRONOUSLY before setupPlayer() resolves
  // This ensures that when updateOptions() is called, all JavaScript listeners are ready
  // React-native-track-player will then register native handlers with iOS MediaRemote
  // ============================================================================
  console.log(
    "✅✅✅ [SERVICE] ALL remote control handlers registered successfully"
  );
  console.log(
    "✅✅✅ [SERVICE] Total handlers registered: 8 (Play, Pause, Next, Previous, Seek, JumpForward, JumpBackward, Stop)"
  );
  console.log(
    "✅✅✅ [SERVICE] Service function completing - setupPlayer() can now resolve"
  );
  console.log(
    "✅✅✅ [SERVICE] CRITICAL: Service function completed synchronously"
  );
  console.log(
    "✅✅✅ [SERVICE] All TrackPlayer.addEventListener() calls have been executed"
  );
  console.log(
    "✅✅✅ [SERVICE] JavaScript event listeners are now registered and ready"
  );
  console.log(
    "✅✅✅ [SERVICE] updateOptions() should be called after a brief delay to allow native bridge processing"
  );
  console.log(
    "✅✅✅ [SERVICE] This will register native handlers with iOS MediaRemote framework"
  );
  console.log(
    "✅✅✅ [SERVICE] iOS lock screen and Control Center buttons should work after updateOptions()"
  );
  
  // Service function completes here - all listeners are registered synchronously
  // setupPlayer() will now resolve, and updateOptions() should be called after a delay
  // The service stays alive and listens for remote control events
  // IMPORTANT: This function must NOT be async and must complete synchronously
};
