// src/audio/playbackService.js
// Background playback service for react-native-track-player
// Handles remote commands from lock screen, Control Center, AirPods, etc.

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
  // TrackPlayer will be null, service won't register handlers
}

// Global callbacks for remote commands
let remoteCallbacks = {};

// Direct access to App.js functions via getters (always returns latest)
let getPlayNextTrack = null;
let getPlayPreviousTrack = null;

export function setRemoteCallbacks(callbacks) {
  remoteCallbacks = callbacks;
}

export function setQueueCallbacks(callbacks) {
  getPlayNextTrack = callbacks.getNextTrack;
  getPlayPreviousTrack = callbacks.getPreviousTrack;
}

module.exports = async function playbackService() {
  // If track-player isn't available, return early (service won't register)
  if (!TrackPlayer || !Event || !State) {
    console.warn(
      "⚠️ Playback service: TrackPlayer not available, skipping registration"
    );
    return;
  }

  console.log("🎵 Playback service initializing...");

  // CRITICAL: Register ALL listeners INSIDE the service function
  // This is where track-player expects them to be registered

  // Remote control event handlers - NEW APPROACH: Direct TrackPlayer control
  // Play/Pause: Direct TrackPlayer calls (simple and reliable)
  // Next/Previous: Use App.js callbacks via getter functions (no stale closures)

  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    try {
      const state = await TrackPlayer.getState();
      if (state !== State.Playing) {
        await TrackPlayer.play();
      }
    } catch (error) {
      console.error("❌ Remote Play error:", error);
    }
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    try {
      const state = await TrackPlayer.getState();
      if (state === State.Playing) {
        await TrackPlayer.pause();
      }
    } catch (error) {
      console.error("❌ Remote Pause error:", error);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    try {
      // Use callback getter if available (accesses latest App.js function)
      if (getPlayNextTrack) {
        const playNext = getPlayNextTrack();
        if (playNext) {
          await playNext();
          return;
        }
      }
      // Fallback: Try TrackPlayer's built-in queue navigation
      try {
        await TrackPlayer.skipToNext();
      } catch (skipError) {
        // No next track in queue - that's okay
        console.log("ℹ️ No next track in queue");
      }
    } catch (error) {
      console.error("❌ Remote Next error:", error);
    }
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    try {
      // Use callback getter if available (accesses latest App.js function)
      if (getPlayPreviousTrack) {
        const playPrev = getPlayPreviousTrack();
        if (playPrev) {
          await playPrev();
          return;
        }
      }
      // Fallback: Try TrackPlayer's built-in queue navigation
      try {
        await TrackPlayer.skipToPrevious();
      } catch (skipError) {
        // No previous track in queue - that's okay
        console.log("ℹ️ No previous track in queue");
      }
    } catch (error) {
      console.error("❌ Remote Previous error:", error);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, async (event) => {
    console.log("🎵 Remote: Seek", event.position);
    try {
      await TrackPlayer.seekTo(event.position);
      if (remoteCallbacks.onSeek) {
        await remoteCallbacks.onSeek(event.position);
      }
      console.log("✅ Remote: Seek command handled");
    } catch (error) {
      console.error("❌ Remote: Seek command failed:", error);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
    console.log("🎵 Remote: Jump Forward", event.interval);
    try {
      const position = await TrackPlayer.getPosition();
      await TrackPlayer.seekTo(position + event.interval);
      console.log("✅ Remote: Jump Forward handled");
    } catch (error) {
      console.error("❌ Remote: Jump Forward failed:", error);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
    console.log("🎵 Remote: Jump Backward", event.interval);
    try {
      const position = await TrackPlayer.getPosition();
      await TrackPlayer.seekTo(Math.max(0, position - event.interval));
      console.log("✅ Remote: Jump Backward handled");
    } catch (error) {
      console.error("❌ Remote: Jump Backward failed:", error);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    console.log("🎵 Remote: Stop");
    try {
      await TrackPlayer.stop();
      console.log("✅ Remote: Stop handled");
    } catch (error) {
      console.error("❌ Remote: Stop failed:", error);
    }
  });

  // Playback state events - these help keep UI in sync
  // MUST be registered to prevent warnings and keep UI synchronized
  TrackPlayer.addEventListener(Event.PlaybackState, async (data) => {
    try {
      const stateName =
        Object.keys(State).find((key) => State[key] === data.state) ||
        data.state;
      console.log("🎵 Playback State Changed:", stateName, data.state);

      // Notify callbacks about state change so UI can update
      if (remoteCallbacks.onStateChange) {
        try {
          const position = await TrackPlayer.getPosition();
          const duration = await TrackPlayer.getDuration();
          await remoteCallbacks.onStateChange({
            state: data.state,
            isPlaying: data.state === State.Playing,
            position,
            duration,
          });
        } catch (error) {
          console.warn("⚠️ Error notifying state change:", error);
        }
      }
    } catch (error) {
      console.warn("⚠️ Error handling playback state event:", error);
    }
  });

  TrackPlayer.addEventListener(Event.PlaybackTrackChanged, async (data) => {
    console.log("🎵 Track Changed:", data.track);
    // Notify callbacks about track change
    if (remoteCallbacks.onTrackChanged) {
      try {
        await remoteCallbacks.onTrackChanged(data.track);
      } catch (error) {
        console.warn("⚠️ Error notifying track change:", error);
      }
    }
  });

  // Register PlaybackProgressUpdated listener INSIDE service to prevent warnings
  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async (data) => {
    try {
      // Notify callbacks about progress updates (throttled to every 2 seconds)
      if (
        remoteCallbacks.onProgressUpdate &&
        Math.floor(data.position) % 2 === 0
      ) {
        try {
          await remoteCallbacks.onProgressUpdate({
            position: data.position,
            duration: data.duration,
            buffered: data.buffered,
          });
        } catch (error) {
          // Silently ignore progress update errors
        }
      }
    } catch (error) {
      // Silently handle any errors in progress updates
    }
  });

  // Log that listeners are registered
  console.log("✅ Playback service event listeners registered");
  console.log("📋 Registered listeners:", {
    remotePlay: true,
    remotePause: true,
    remoteNext: true,
    remotePrevious: true,
    remoteSeek: true,
    remoteJumpForward: true,
    remoteJumpBackward: true,
    remoteStop: true,
    playbackState: true,
    playbackTrackChanged: true,
    playbackProgressUpdated: true,
  });
};
