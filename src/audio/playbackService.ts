// src/audio/playbackService.ts
// Background playback service for react-native-track-player
// Handles remote commands from lock screen, Control Center, AirPods, etc.

import TrackPlayer, { Event, State } from "react-native-track-player";

// Global callbacks for remote commands
let remoteCallbacks: {
  onPlayPause?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onSeek?: (position: number) => void;
} = {};

export function setRemoteCallbacks(callbacks: typeof remoteCallbacks) {
  remoteCallbacks = callbacks;
}

module.exports = async function playbackService() {
  // Remote control event handlers
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    console.log("🎵 Remote: Play");
    if (remoteCallbacks.onPlayPause) {
      remoteCallbacks.onPlayPause();
    } else {
      await TrackPlayer.play();
    }
  });

  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    console.log("🎵 Remote: Pause");
    if (remoteCallbacks.onPlayPause) {
      remoteCallbacks.onPlayPause();
    } else {
      await TrackPlayer.pause();
    }
  });

  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    console.log("🎵 Remote: Next");
    if (remoteCallbacks.onNext) {
      remoteCallbacks.onNext();
    } else {
      await TrackPlayer.skipToNext();
    }
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    console.log("🎵 Remote: Previous");
    if (remoteCallbacks.onPrevious) {
      remoteCallbacks.onPrevious();
    } else {
      await TrackPlayer.skipToPrevious();
    }
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, async (event) => {
    console.log("🎵 Remote: Seek", event.position);
    await TrackPlayer.seekTo(event.position);
    if (remoteCallbacks.onSeek) {
      remoteCallbacks.onSeek(event.position);
    }
  });

  TrackPlayer.addEventListener(Event.RemoteJumpForward, async (event) => {
    console.log("🎵 Remote: Jump Forward", event.interval);
    const position = await TrackPlayer.getPosition();
    await TrackPlayer.seekTo(position + event.interval);
  });

  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async (event) => {
    console.log("🎵 Remote: Jump Backward", event.interval);
    const position = await TrackPlayer.getPosition();
    await TrackPlayer.seekTo(Math.max(0, position - event.interval));
  });

  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    console.log("🎵 Remote: Stop");
    await TrackPlayer.stop();
  });

  // Playback state events
  TrackPlayer.addEventListener(Event.PlaybackState, async (data) => {
    console.log("🎵 Playback State:", data.state);
  });

  TrackPlayer.addEventListener(Event.PlaybackTrackChanged, async (data) => {
    console.log("🎵 Track Changed:", data.track);
  });

  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async (data) => {
    // Progress updates happen frequently, only log occasionally
    if (Math.floor(data.position) % 5 === 0) {
      console.log(
        "🎵 Progress:",
        Math.floor(data.position),
        "/",
        Math.floor(data.duration)
      );
    }
  });
};
