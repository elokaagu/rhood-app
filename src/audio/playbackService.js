// src/audio/playbackService.js
// Background service for react-native-track-player
// Handles remote control events from iOS (lock screen, Control Center, AirPods)

const trackPlayerModule = require("react-native-track-player");

// Make sure we get the actual TrackPlayer instance (default export or module)
const TrackPlayer = trackPlayerModule.default || trackPlayerModule;
// Event enum – from module or from TrackPlayer
const Event = trackPlayerModule.Event || TrackPlayer.Event;

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
  console.log("🔵 [SERVICE] About to register RemotePlay listener...");
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    console.log("🔊🔊🔊 REMOTE PLAY EVENT RECEIVED IN JAVASCRIPT SERVICE");
    console.log("🔊 RemotePlay event received");
    try {
      const state = await TrackPlayer.getState();
      const queue = await TrackPlayer.getQueue();
      const activeTrack = await TrackPlayer.getActiveTrack();
      const position = await TrackPlayer.getPosition();

      console.log(
        "🔊 [SERVICE] DIAGNOSTIC - Current state:",
        state,
        "Queue length:",
        queue.length,
        "Active track:",
        activeTrack ? activeTrack.id : "none",
        "Position:",
        position
      );

      if (queue.length === 0) {
        console.error("❌ [SERVICE] Queue is empty while music is playing!");
        console.error(
          "❌ [SERVICE] This means audio is coming from expo-av, not TrackPlayer!"
        );
        console.error(
          "❌ [SERVICE] Check App.js - ensure iOS uses ONLY TrackPlayer for playback"
        );
        return;
      }

      if (!activeTrack) {
        console.warn(
          "⚠️ [SERVICE] No active track, but queue has",
          queue.length,
          "tracks"
        );
      }

      await TrackPlayer.play();
      const newState = await TrackPlayer.getState();
      const newPosition = await TrackPlayer.getPosition();
      console.log(
        "✅ [SERVICE] TrackPlayer.play() called, new state:",
        newState,
        "new position:",
        newPosition
      );
    } catch (error) {
      console.error("❌ [SERVICE] RemotePlay error:", error);
    }
  });

  console.log("🔵 [SERVICE] About to register RemotePause listener...");
  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    console.log("⏸️⏸️⏸️ REMOTE PAUSE EVENT RECEIVED IN JAVASCRIPT SERVICE");
    console.log("⏸️ RemotePause event received");
    try {
      const state = await TrackPlayer.getState();
      const queue = await TrackPlayer.getQueue();
      const activeTrack = await TrackPlayer.getActiveTrack();

      console.log(
        "⏸️ [SERVICE] DIAGNOSTIC - Current state:",
        state,
        "Queue length:",
        queue.length,
        "Active track:",
        activeTrack ? activeTrack.id : "none"
      );

      if (queue.length === 0) {
        console.error("❌ [SERVICE] Queue is empty while music is playing!");
        console.error(
          "❌ [SERVICE] This means audio is coming from expo-av, not TrackPlayer!"
        );
      }

      await TrackPlayer.pause();
      const newState = await TrackPlayer.getState();
      console.log(
        "✅ [SERVICE] TrackPlayer.pause() called, new state:",
        newState
      );
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

  console.log("✅✅✅ [SERVICE] ALL EVENT LISTENERS REGISTERED SUCCESSFULLY");
  console.log("✅ [SERVICE] All event listeners registered successfully");
  console.log(
    "🔵 [SERVICE] Service function completed, returning to TrackPlayer"
  );
};
