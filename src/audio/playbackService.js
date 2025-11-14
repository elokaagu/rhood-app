// src/audio/playbackService.js
// Background service for react-native-track-player
// Handles remote control events from iOS (lock screen, Control Center, AirPods)

// Store callbacks from App.js
let playNextTrack = null;
let playPreviousTrack = null;
let stopGlobalAudio = null;
let pauseGlobalAudio = null;
let resumeGlobalAudio = null;

export function setQueueNavigationCallbacks(callbacks) {
  playNextTrack = callbacks?.playNextTrack || null;
  playPreviousTrack = callbacks?.playPreviousTrack || null;
  stopGlobalAudio = callbacks?.stopGlobalAudio || null;
  pauseGlobalAudio = callbacks?.pauseGlobalAudio || null;
  resumeGlobalAudio = callbacks?.resumeGlobalAudio || null;
}

// Service function - called by TrackPlayer when setupPlayer() is invoked
// This runs in a background context, not the React Native JS thread
module.exports = function playbackService() {
  const TrackPlayer = require("react-native-track-player");
  const Event = TrackPlayer.Event;
  const State = TrackPlayer.State;

  // Register remote control event listeners
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    try {
      if (resumeGlobalAudio) {
        await resumeGlobalAudio();
      } else {
        await TrackPlayer.play();
      }
    } catch (error) {
      console.error("RemotePlay error:", error);
    }
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    try {
      if (pauseGlobalAudio) {
        await pauseGlobalAudio();
      } else {
        await TrackPlayer.pause();
      }
    } catch (error) {
      console.error("RemotePause error:", error);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
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
    try {
      if (playNextTrack) {
        await playNextTrack();
      } else {
        try {
          await TrackPlayer.skipToNext();
        } catch (skipError) {
          // If skipToNext fails (e.g., no next track), ignore the error
          console.log("No next track available");
        }
      }
    } catch (error) {
      console.error("RemoteNext error:", error);
    }
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    try {
      if (playPreviousTrack) {
        await playPreviousTrack();
      } else {
        try {
          await TrackPlayer.skipToPrevious();
        } catch (skipError) {
          // If skipToPrevious fails (e.g., no previous track), ignore the error
          console.log("No previous track available");
        }
      }
    } catch (error) {
      console.error("RemotePrevious error:", error);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, async (data) => {
    try {
      await TrackPlayer.seekTo(data.position);
    } catch (error) {
      console.error("RemoteSeek error:", error);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (data) => {
    try {
      const position = await TrackPlayer.getPosition();
      await TrackPlayer.seekTo(position + (data.interval || 15));
    } catch (error) {
      console.error("RemoteJumpForward error:", error);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (data) => {
    try {
      const position = await TrackPlayer.getPosition();
      await TrackPlayer.seekTo(Math.max(0, position - (data.interval || 15)));
    } catch (error) {
      console.error("RemoteJumpBackward error:", error);
    }
  });
};

