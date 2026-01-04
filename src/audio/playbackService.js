// src/audio/playbackService.js
// Playback service for react-native-track-player
// This service runs in the background and handles remote control events
// (lock screen, Control Center, Bluetooth headsets, etc.)

const TrackPlayer = require('react-native-track-player').default || require('react-native-track-player');
const { Event } = require('react-native-track-player');

module.exports = async function() {
  console.log('🎧 [SERVICE] Playback service starting...');

  // Remote Play - Resume playback
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    console.log('🎧 [SERVICE] RemotePlay event received');
    TrackPlayer.play();
  });

  // Remote Pause - Pause playback
  TrackPlayer.addEventListener(Event.RemotePause, () => {
    console.log('🎧 [SERVICE] RemotePause event received');
    TrackPlayer.pause();
  });

  // Remote Stop - Stop playback
  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    console.log('🎧 [SERVICE] RemoteStop event received');
    TrackPlayer.stop();
  });

  // Remote Next - Skip to next track
  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    console.log('🎧 [SERVICE] RemoteNext event received');
    TrackPlayer.skipToNext();
  });

  // Remote Previous - Skip to previous track
  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    console.log('🎧 [SERVICE] RemotePrevious event received');
    TrackPlayer.skipToPrevious();
  });

  // Remote Seek - Seek to position
  TrackPlayer.addEventListener(Event.RemoteSeek, ({ position }) => {
    console.log(`🎧 [SERVICE] RemoteSeek event received: ${position}s`);
    TrackPlayer.seekTo(position);
  });

  // Remote Jump Forward - Jump forward
  TrackPlayer.addEventListener(Event.RemoteJumpForward, () => {
    console.log('🎧 [SERVICE] RemoteJumpForward event received');
    TrackPlayer.seekBy(15);
  });

  // Remote Jump Backward - Jump backward
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, () => {
    console.log('🎧 [SERVICE] RemoteJumpBackward event received');
    TrackPlayer.seekBy(-15);
  });

  console.log('✅ [SERVICE] All remote event handlers registered');
};
