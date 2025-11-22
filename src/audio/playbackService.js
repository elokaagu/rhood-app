// src/audio/playbackService.js
// Minimal playback service for react-native-track-player

const TrackPlayer = require("react-native-track-player").default || require("react-native-track-player");
const { Event, State } = require("react-native-track-player");

module.exports = async function() {
  // Remote Play
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  // Remote Pause
  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  // Remote Stop
  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    TrackPlayer.stop();
  });

  // Remote Seek
  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => {
    TrackPlayer.seekTo(position);
  });

  // Remote Next
  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    TrackPlayer.skipToNext();
  });

  // Remote Previous
  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    TrackPlayer.skipToPrevious();
  });

  // Remote Jump Forward
  TrackPlayer.addEventListener(Event.RemoteJumpForward, () => {
    TrackPlayer.seekBy(15);
  });

  // Remote Jump Backward
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, () => {
    TrackPlayer.seekBy(-15);
  });

  // Playback Queue Ended - Auto-play next track
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async ({ position, track }) => {
    console.log("🎵 Queue ended, attempting to play next track");
    // The app will handle playing the next track from the queue
    // This event is just a notification that the current track finished
  });

  // Playback Track Changed - Handle track transitions
  TrackPlayer.addEventListener(Event.PlaybackTrackChanged, async ({ nextTrack }) => {
    console.log("🎵 Track changed to:", nextTrack?.title);
  });
};

