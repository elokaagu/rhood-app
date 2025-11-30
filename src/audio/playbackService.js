// src/audio/playbackService.js
// Playback service for react-native-track-player
// Connects remote controls (lock screen, Control Center) to App.js audio functions

const TrackPlayer = require("react-native-track-player").default || require("react-native-track-player");
const { Event, State } = require("react-native-track-player");
const playbackCallbacks = require("./playbackCallbacks");

module.exports = async function() {
  console.log("🎧 [SERVICE] Playback service starting, registering event handlers...");

  // Remote Play - Resume playback
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    console.log("🎧 [SERVICE] ⚠️⚠️⚠️ RemotePlay event received (lock screen play) ⚠️⚠️⚠️");
    
    // Try to use App.js callback first (for queue management)
    const callbackUsed = await playbackCallbacks.call("onResume");
    console.log(`🎧 [SERVICE] Callback used: ${callbackUsed}`);
    
    // If no callback, fall back to TrackPlayer directly
    if (!callbackUsed) {
      console.log("🎧 [SERVICE] No callback available, using TrackPlayer.play() directly");
      await TrackPlayer.play();
      console.log("🎧 [SERVICE] TrackPlayer.play() completed");
    }
  });

  // Remote Pause - Pause playback
  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    console.log("🎧 [SERVICE] ⚠️⚠️⚠️ RemotePause event received (lock screen pause) ⚠️⚠️⚠️");
    
    // Try to use App.js callback first (for state management)
    const callbackUsed = await playbackCallbacks.call("onPause");
    console.log(`🎧 [SERVICE] Callback used: ${callbackUsed}`);
    
    // If no callback, fall back to TrackPlayer directly
    if (!callbackUsed) {
      console.log("🎧 [SERVICE] No callback available, using TrackPlayer.pause() directly");
      await TrackPlayer.pause();
      console.log("🎧 [SERVICE] TrackPlayer.pause() completed");
    }
  });

  // Remote Stop - Stop playback
  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    console.log("🎧 [SERVICE] RemoteStop event received");
    
    // Try to use App.js callback first
    const callbackUsed = await playbackCallbacks.call("onStop");
    
    // If no callback, fall back to TrackPlayer directly
    if (!callbackUsed) {
      await TrackPlayer.stop();
      console.log("🎧 [SERVICE] Used TrackPlayer.stop() directly");
    }
  });

  // Remote Seek - Seek to position
  TrackPlayer.addEventListener(Event.RemoteSeek, async ({ position }) => {
    console.log(`🎧 [SERVICE] RemoteSeek event received: ${position}s`);
    
    // Try to use App.js callback first (for state sync)
    const callbackUsed = await playbackCallbacks.call("onSeek", position * 1000); // Convert to milliseconds
    
    // If no callback, fall back to TrackPlayer directly
    if (!callbackUsed) {
      await TrackPlayer.seekTo(position);
      console.log("🎧 [SERVICE] Used TrackPlayer.seekTo() directly");
    }
  });

  // Remote Next - Play next track in queue
  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    console.log("🎧 [SERVICE] ⚠️⚠️⚠️ RemoteNext event received (lock screen next) ⚠️⚠️⚠️");
    
    // Use App.js callback for queue management (critical!)
    // TrackPlayer doesn't manage the queue - App.js does
    const callbackUsed = await playbackCallbacks.call("onNext");
    console.log(`🎧 [SERVICE] Callback used: ${callbackUsed}`);
    
    if (!callbackUsed) {
      console.warn("⚠️ [SERVICE] onNext callback not available, TrackPlayer.skipToNext() won't work without queue");
      // TrackPlayer.skipToNext() only works if there are multiple tracks in TrackPlayer queue
      // Since we only add one track at a time, this won't work
      try {
        await TrackPlayer.skipToNext();
      } catch (error) {
        console.error("❌ [SERVICE] TrackPlayer.skipToNext() failed:", error.message);
      }
    }
  });

  // Remote Previous - Play previous track in queue
  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    console.log("🎧 [SERVICE] ⚠️⚠️⚠️ RemotePrevious event received (lock screen previous) ⚠️⚠️⚠️");
    
    // Use App.js callback for queue management (critical!)
    // TrackPlayer doesn't manage the queue - App.js does
    const callbackUsed = await playbackCallbacks.call("onPrevious");
    console.log(`🎧 [SERVICE] Callback used: ${callbackUsed}`);
    
    if (!callbackUsed) {
      console.warn("⚠️ [SERVICE] onPrevious callback not available, TrackPlayer.skipToPrevious() won't work without queue");
      // TrackPlayer.skipToPrevious() only works if there are multiple tracks in TrackPlayer queue
      // Since we only add one track at a time, this won't work
      try {
        await TrackPlayer.skipToPrevious();
      } catch (error) {
        console.error("❌ [SERVICE] TrackPlayer.skipToPrevious() failed:", error.message);
      }
    }
  });

  // Remote Jump Forward - Seek forward 15 seconds
  TrackPlayer.addEventListener(Event.RemoteJumpForward, async () => {
    console.log("🎧 [SERVICE] RemoteJumpForward event received");
    
    // Try to use App.js callback first
    const callbackUsed = await playbackCallbacks.call("onJumpForward");
    
    // If no callback, fall back to TrackPlayer directly
    if (!callbackUsed) {
      await TrackPlayer.seekBy(15);
      console.log("🎧 [SERVICE] Used TrackPlayer.seekBy(15) directly");
    }
  });

  // Remote Jump Backward - Seek backward 15 seconds
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async () => {
    console.log("🎧 [SERVICE] RemoteJumpBackward event received");
    
    // Try to use App.js callback first
    const callbackUsed = await playbackCallbacks.call("onJumpBackward");
    
    // If no callback, fall back to TrackPlayer directly
    if (!callbackUsed) {
      await TrackPlayer.seekBy(-15);
      console.log("🎧 [SERVICE] Used TrackPlayer.seekBy(-15) directly");
    }
  });

  // Playback Queue Ended - Track finished playing
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async ({ position, track }) => {
    console.log("🎵 [SERVICE] Queue ended, attempting to play next track");
    
    // Use App.js callback to play next track from queue
    await playbackCallbacks.call("onNext");
  });

  // Playback Track Changed - Track changed (for future use)
  TrackPlayer.addEventListener(Event.PlaybackTrackChanged, async ({ nextTrack }) => {
    console.log("🎵 [SERVICE] Track changed to:", nextTrack?.title);
  });

  console.log("✅ [SERVICE] All event handlers registered successfully");
};

