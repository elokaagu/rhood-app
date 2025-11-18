// src/audio/playbackService.js
// Background service for react-native-track-player
// Handles remote control events from iOS lock screen, Control Center, and AirPods

const trackPlayerModule = require("react-native-track-player");
const TrackPlayer = trackPlayerModule.default || trackPlayerModule;
const Event = trackPlayerModule.Event || trackPlayerModule.Event;

module.exports = async function () {
  console.log("🎧 [Service] Playback service started");

  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    console.log("🎧 [Service] RemotePlay");
    await TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    console.log("🎧 [Service] RemotePause");
    await TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, async (event) => {
    console.log("🎧 [Service] RemoteSeek →", event.position);
    await TrackPlayer.seekTo(event.position);
  });

  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    console.log("🎧 [Service] RemoteNext");
    try {
      await TrackPlayer.skipToNext();
    } catch (e) {
      console.log("No next track:", e.message);
    }
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    console.log("🎧 [Service] RemotePrevious");
    try {
      await TrackPlayer.skipToPrevious();
    } catch (e) {
      console.log("No previous track:", e.message);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, async () => {
    console.log("🎧 [Service] RemoteJumpForward");
    await TrackPlayer.seekBy(15);
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async () => {
    console.log("🎧 [Service] RemoteJumpBackward");
    await TrackPlayer.seekBy(-15);
  });

  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    console.log("🎧 [Service] RemoteStop");
    await TrackPlayer.stop();
  });
};
