// src/audio/playbackService.js
// Background service for react-native-track-player
// Handles remote control events from iOS (lock screen, Control Center, AirPods)

const trackPlayerModule = require("react-native-track-player");

// Make sure we get the actual TrackPlayer instance (default export or module)
const TrackPlayer = trackPlayerModule.default || trackPlayerModule;
// Event enum – from module or from TrackPlayer
const Event = trackPlayerModule.Event || TrackPlayer.Event;
// State enum – from module or from TrackPlayer
const State = trackPlayerModule.State || TrackPlayer.State;

// ⚠️ NOTE: These won't work cross-runtime on iOS (app JS vs service JS)
// but we can keep them for Android / future tweaks if needed.
let playNextTrack = null;
let playPreviousTrack = null;
let stopGlobalAudio = null;

function setQueueNavigationCallbacks(callbacks) {
  playNextTrack = callbacks?.playNextTrack || null;
  playPreviousTrack = callbacks?.playPreviousTrack || null;
  stopGlobalAudio = callbacks?.stopGlobalAudio || null;
}

// Export this so your UI code can still import it
exports.setQueueNavigationCallbacks = setQueueNavigationCallbacks;

// Default export for TrackPlayer playback service
// CRITICAL: This function must be SYNCHRONOUS - event listeners must be registered immediately
module.exports = function playbackService() {
  console.log("🛰️ RHOOD playbackService started");

  // Validate TrackPlayer and Event are available
  if (!TrackPlayer) {
    console.error("❌ [SERVICE] TrackPlayer is null or undefined");
    return;
  }

  if (typeof TrackPlayer.addEventListener !== "function") {
    console.error(
      "❌ [SERVICE] TrackPlayer.addEventListener is not a function",
      {
        TrackPlayerType: typeof TrackPlayer,
        TrackPlayerKeys: Object.keys(TrackPlayer || {}),
      }
    );
    return;
  }

  if (!Event) {
    console.error("❌ [SERVICE] Event is null or undefined");
    return;
  }

  console.log("✅ [SERVICE] TrackPlayer and Event validated successfully");

  // Register remote control event listeners
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    console.log("🔊 RemotePlay event received");
    try {
      const state = await TrackPlayer.getState();
      const queue = await TrackPlayer.getQueue();
      console.log(
        "🔊 [SERVICE] Current state:",
        state,
        "Queue length:",
        queue.length
      );

      if (queue.length === 0) {
        console.warn("⚠️ [SERVICE] Queue is empty, cannot play");
        return;
      }

      // Get active track
      const activeTrack = await TrackPlayer.getActiveTrack();
      console.log("🔊 [SERVICE] Active track before play:", activeTrack ? activeTrack.id : "none");
      
      // If no active track but queue has tracks, TrackPlayer should handle it
      if (!activeTrack && queue.length > 0) {
        console.log("🔊 [SERVICE] No active track but queue has tracks - TrackPlayer should handle this");
      }

      try {
        await TrackPlayer.play();
        console.log("✅ [SERVICE] TrackPlayer.play() called successfully");
      } catch (playError) {
        console.error("❌ [SERVICE] TrackPlayer.play() threw an error:", playError);
        throw playError; // Re-throw to be caught by outer try-catch
      }
      
      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 200));
      
        const newState = await TrackPlayer.getState();
      const position = await TrackPlayer.getPosition();
      console.log(
        "✅ [SERVICE] After play() call - state:",
        newState,
        "position:",
        position
      );
      
      if (newState !== State.Playing) {
        console.error("❌ [SERVICE] TrackPlayer.play() was called but state is not Playing:", newState);
        console.error("❌ [SERVICE] This means the audio is NOT actually playing!");
      } else {
        console.log("✅ [SERVICE] Audio playback confirmed - state is Playing");
      }
    } catch (error) {
      console.error("❌ [SERVICE] RemotePlay error:", error);
    }
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    console.log("⏸️ RemotePause event received");
    try {
      const state = await TrackPlayer.getState();
      console.log("⏸️ [SERVICE] Current state before pause:", state);

        await TrackPlayer.pause();
      
      // Wait a moment for state to update
      await new Promise(resolve => setTimeout(resolve, 200));
      
        const newState = await TrackPlayer.getState();
      console.log(
        "✅ [SERVICE] TrackPlayer.pause() called, new state:",
        newState
      );
      
      if (newState === State.Playing) {
        console.error("❌ [SERVICE] TrackPlayer.pause() was called but state is still Playing!");
      } else {
        console.log("✅ [SERVICE] Audio pause confirmed - state is not Playing");
      }
    } catch (error) {
      console.error("❌ [SERVICE] RemotePause error:", error);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    console.log("⏹️ RemoteStop event received");
    try {
      if (stopGlobalAudio) {
        await stopGlobalAudio();
      } else {
        await TrackPlayer.stop();
        await TrackPlayer.reset();
      }
    } catch (error) {
      console.error("RemoteStop error:", error);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    console.log("⏭️ RemoteNext event received");
    try {
      if (playNextTrack) {
        await playNextTrack();
      } else {
        try {
          await TrackPlayer.skipToNext();
        } catch (skipError) {
          console.log("No next track available");
        }
      }
    } catch (error) {
      console.error("RemoteNext error:", error);
    }
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    console.log("⏮️ RemotePrevious event received");
    try {
      if (playPreviousTrack) {
        await playPreviousTrack();
      } else {
        try {
          await TrackPlayer.skipToPrevious();
        } catch (skipError) {
          console.log("No previous track available");
        }
      }
    } catch (error) {
      console.error("RemotePrevious error:", error);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, async (data) => {
    console.log("⏩ RemoteSeek to", data.position);
    try {
      await TrackPlayer.seekTo(data.position);
    } catch (error) {
      console.error("RemoteSeek error:", error);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (data) => {
    console.log("⏩ RemoteJumpForward", data.interval);
    try {
      const position = await TrackPlayer.getPosition();
      await TrackPlayer.seekTo(position + (data.interval || 15));
    } catch (error) {
      console.error("RemoteJumpForward error:", error);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (data) => {
    console.log("⏪ RemoteJumpBackward", data.interval);
    try {
      const position = await TrackPlayer.getPosition();
      await TrackPlayer.seekTo(Math.max(0, position - (data.interval || 15)));
    } catch (error) {
      console.error("RemoteJumpBackward error:", error);
    }
  });

  console.log("✅ [SERVICE] All event listeners registered successfully");
};
