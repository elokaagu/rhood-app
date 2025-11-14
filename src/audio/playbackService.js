// src/audio/playbackService.js
// Background service for react-native-track-player
// Handles remote control events from iOS lock screen, Control Center, and AirPods

const TrackPlayer =
  require("react-native-track-player").default ||
  require("react-native-track-player");
const { Event } = require("react-native-track-player");

module.exports = async function playbackService() {
  // Play button pressed
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  // Pause button pressed
  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  // Stop button pressed
  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.stop();
  });

  // Next button pressed
  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    TrackPlayer.skipToNext();
  });

  // Previous button pressed
  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    TrackPlayer.skipToPrevious();
  });

  // Seek/scrub
  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    TrackPlayer.seekTo(event.position);
  });

  // Jump forward
  TrackPlayer.addEventListener(Event.RemoteJumpForward, (event) => {
    TrackPlayer.getPosition().then((position) => {
      TrackPlayer.seekTo(position + (event.interval || 15));
    });
  });

  // Jump backward
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, (event) => {
    TrackPlayer.getPosition().then((position) => {
      TrackPlayer.seekTo(Math.max(0, position - (event.interval || 15)));
    });
  });
};
