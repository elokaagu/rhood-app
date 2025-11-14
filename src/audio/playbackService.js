// src/audio/playbackService.js
// Background service for react-native-track-player
// Handles remote control events from iOS lock screen, Control Center, and AirPods

const trackPlayerModule = require("react-native-track-player");
const TrackPlayer = trackPlayerModule.default || trackPlayerModule;
const Event = trackPlayerModule.Event || trackPlayerModule.Event;

console.log(
  "🔵 [SERVICE] Module loaded, TrackPlayer:",
  !!TrackPlayer,
  "Event:",
  !!Event
);

module.exports = async function playbackService() {
  console.log("🛰️🛰️🛰️ [SERVICE] SERVICE FUNCTION CALLED BY TRACKPLAYER");
  console.log("🔵 [SERVICE] TrackPlayer type:", typeof TrackPlayer);
  console.log("🔵 [SERVICE] Event type:", typeof Event);
  console.log(
    "🔵 [SERVICE] TrackPlayer.addEventListener:",
    typeof TrackPlayer?.addEventListener
  );

  if (!TrackPlayer) {
    console.error("❌ [SERVICE] TrackPlayer is null!");
    return;
  }

  if (!Event) {
    console.error("❌ [SERVICE] Event is null!");
    return;
  }

  if (typeof TrackPlayer.addEventListener !== "function") {
    console.error("❌ [SERVICE] addEventListener is not a function!");
    return;
  }

  console.log("✅ [SERVICE] Registering event listeners...");

  // Play button pressed
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    console.log("🔊🔊🔊 [SERVICE] REMOTE PLAY EVENT FIRED!");
    try {
      await TrackPlayer.play();
      console.log("✅ [SERVICE] TrackPlayer.play() called");
    } catch (error) {
      console.error("❌ [SERVICE] Error in RemotePlay:", error);
    }
  });
  console.log("✅ [SERVICE] RemotePlay listener registered");

  // Pause button pressed
  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    console.log("⏸️⏸️⏸️ [SERVICE] REMOTE PAUSE EVENT FIRED!");
    try {
      await TrackPlayer.pause();
      console.log("✅ [SERVICE] TrackPlayer.pause() called");
    } catch (error) {
      console.error("❌ [SERVICE] Error in RemotePause:", error);
    }
  });
  console.log("✅ [SERVICE] RemotePause listener registered");

  // Stop button pressed
  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    console.log("⏹️ [SERVICE] REMOTE STOP EVENT FIRED!");
    try {
      await TrackPlayer.stop();
      console.log("✅ [SERVICE] TrackPlayer.stop() called");
    } catch (error) {
      console.error("❌ [SERVICE] Error in RemoteStop:", error);
    }
  });
  console.log("✅ [SERVICE] RemoteStop listener registered");

  // Next button pressed
  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    console.log("⏭️ [SERVICE] REMOTE NEXT EVENT FIRED!");
    try {
      await TrackPlayer.skipToNext();
      console.log("✅ [SERVICE] TrackPlayer.skipToNext() called");
    } catch (error) {
      console.error("❌ [SERVICE] Error in RemoteNext:", error);
    }
  });
  console.log("✅ [SERVICE] RemoteNext listener registered");

  // Previous button pressed
  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    console.log("⏮️ [SERVICE] REMOTE PREVIOUS EVENT FIRED!");
    try {
      await TrackPlayer.skipToPrevious();
      console.log("✅ [SERVICE] TrackPlayer.skipToPrevious() called");
    } catch (error) {
      console.error("❌ [SERVICE] Error in RemotePrevious:", error);
    }
  });
  console.log("✅ [SERVICE] RemotePrevious listener registered");

  // Seek/scrub
  TrackPlayer.addEventListener(Event.RemoteSeek, async (event) => {
    console.log("⏩ [SERVICE] REMOTE SEEK EVENT FIRED:", event.position);
    try {
      await TrackPlayer.seekTo(event.position);
      console.log("✅ [SERVICE] TrackPlayer.seekTo() called");
    } catch (error) {
      console.error("❌ [SERVICE] Error in RemoteSeek:", error);
    }
  });
  console.log("✅ [SERVICE] RemoteSeek listener registered");

  // Jump forward
  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
    console.log("⏩ [SERVICE] REMOTE JUMP FORWARD EVENT FIRED");
    try {
      const position = await TrackPlayer.getPosition();
      await TrackPlayer.seekTo(position + (event.interval || 15));
      console.log("✅ [SERVICE] TrackPlayer.seekTo() called for jump forward");
    } catch (error) {
      console.error("❌ [SERVICE] Error in RemoteJumpForward:", error);
    }
  });
  console.log("✅ [SERVICE] RemoteJumpForward listener registered");

  // Jump backward
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
    console.log("⏪ [SERVICE] REMOTE JUMP BACKWARD EVENT FIRED");
    try {
      const position = await TrackPlayer.getPosition();
      await TrackPlayer.seekTo(Math.max(0, position - (event.interval || 15)));
      console.log("✅ [SERVICE] TrackPlayer.seekTo() called for jump backward");
    } catch (error) {
      console.error("❌ [SERVICE] Error in RemoteJumpBackward:", error);
    }
  });
  console.log("✅ [SERVICE] RemoteJumpBackward listener registered");

  console.log("✅✅✅ [SERVICE] ALL EVENT LISTENERS REGISTERED SUCCESSFULLY");
};
