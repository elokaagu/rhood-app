// src/audio/playbackService.js
// Playback service for react-native-track-player
// This service runs in the background and handles remote control events
// (lock screen, Control Center, Bluetooth headsets, CarPlay, etc.)

module.exports = async function() {
  console.log('🎧 [SERVICE] Playback service starting...');
  
  // Defensively require TrackPlayer inside the function to avoid build-time errors
  let TrackPlayer;
  let Event;
  let State;
  
  try {
    // Use eval to prevent Metro from statically analyzing this require
    // This is safe because the function only runs at runtime when TrackPlayer calls it
    // eslint-disable-next-line no-eval
    const trackPlayerModule = eval('require')('react-native-track-player');
    
    if (!trackPlayerModule) {
      console.warn('⚠️ [SERVICE] TrackPlayer module not available');
      return;
    }
    
    TrackPlayer = trackPlayerModule.default || trackPlayerModule;
    Event = trackPlayerModule.Event;
    State = trackPlayerModule.State;
    
    if (!TrackPlayer || !Event) {
      console.warn('⚠️ [SERVICE] TrackPlayer or Event not available');
      return;
    }
    
    console.log('✅ [SERVICE] TrackPlayer module loaded successfully');
  } catch (error) {
    console.warn('⚠️ [SERVICE] Failed to load TrackPlayer:', error.message);
    return;
  }

  // ============================================
  // REMOTE PLAY - Resume playback
  // ============================================
  TrackPlayer.addEventListener(Event.RemotePlay, async () => {
    console.log('🎧 [SERVICE] 🔵🔵🔵 RemotePlay event received from lock screen');
    try {
      const state = await TrackPlayer.getState();
      if (state === State.Paused || state === State.Ready) {
        await TrackPlayer.play();
        console.log('✅ [SERVICE] Playback resumed via lock screen');
      }
    } catch (error) {
      console.error('❌ [SERVICE] Error handling RemotePlay:', error);
    }
  });

  // ============================================
  // REMOTE PAUSE - Pause playback
  // ============================================
  TrackPlayer.addEventListener(Event.RemotePause, async () => {
    console.log('🎧 [SERVICE] ⏸️⏸️⏸️ RemotePause event received from lock screen');
    try {
      const state = await TrackPlayer.getState();
      if (state === State.Playing) {
        await TrackPlayer.pause();
        console.log('✅ [SERVICE] Playback paused via lock screen');
      }
    } catch (error) {
      console.error('❌ [SERVICE] Error handling RemotePause:', error);
    }
  });

  // ============================================
  // REMOTE STOP - Stop playback
  // ============================================
  TrackPlayer.addEventListener(Event.RemoteStop, async () => {
    console.log('🎧 [SERVICE] ⏹️⏹️⏹️ RemoteStop event received from lock screen');
    try {
      await TrackPlayer.stop();
      console.log('✅ [SERVICE] Playback stopped via lock screen');
    } catch (error) {
      console.error('❌ [SERVICE] Error handling RemoteStop:', error);
    }
  });

  // ============================================
  // REMOTE NEXT - Skip to next track
  // ============================================
  TrackPlayer.addEventListener(Event.RemoteNext, async () => {
    console.log('🎧 [SERVICE] ⏭️⏭️⏭️ RemoteNext event received from lock screen');
    try {
      const queue = await TrackPlayer.getQueue();
      const currentIndex = await TrackPlayer.getCurrentTrack();
      
      if (queue.length > 0 && currentIndex !== null && currentIndex < queue.length - 1) {
        await TrackPlayer.skipToNext();
        console.log('✅ [SERVICE] Skipped to next track via lock screen');
      } else {
        console.log('⚠️ [SERVICE] No next track available');
      }
    } catch (error) {
      console.error('❌ [SERVICE] Error handling RemoteNext:', error);
    }
  });

  // ============================================
  // REMOTE PREVIOUS - Skip to previous track
  // ============================================
  TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
    console.log('🎧 [SERVICE] ⏮️⏮️⏮️ RemotePrevious event received from lock screen');
    try {
      const queue = await TrackPlayer.getQueue();
      const currentIndex = await TrackPlayer.getCurrentTrack();
      
      if (queue.length > 0 && currentIndex !== null && currentIndex > 0) {
        await TrackPlayer.skipToPrevious();
        console.log('✅ [SERVICE] Skipped to previous track via lock screen');
      } else {
        // If at the beginning, restart current track
        const position = await TrackPlayer.getPosition();
        if (position > 3) {
          // If more than 3 seconds in, restart track
          await TrackPlayer.seekTo(0);
          console.log('✅ [SERVICE] Restarted current track via lock screen');
        } else {
          await TrackPlayer.skipToPrevious();
          console.log('✅ [SERVICE] Skipped to previous track via lock screen');
        }
      }
    } catch (error) {
      console.error('❌ [SERVICE] Error handling RemotePrevious:', error);
    }
  });

  // ============================================
  // REMOTE SEEK - Seek to position
  // ============================================
  TrackPlayer.addEventListener(Event.RemoteSeek, async ({ position }) => {
    console.log(`🎧 [SERVICE] ⏩⏩⏩ RemoteSeek event received: ${position}s`);
    try {
      const duration = await TrackPlayer.getDuration();
      if (duration && position >= 0 && position <= duration) {
        await TrackPlayer.seekTo(position);
        console.log(`✅ [SERVICE] Seeked to ${position}s via lock screen`);
      } else {
        console.warn(`⚠️ [SERVICE] Invalid seek position: ${position}s (duration: ${duration}s)`);
      }
    } catch (error) {
      console.error('❌ [SERVICE] Error handling RemoteSeek:', error);
    }
  });

  // ============================================
  // REMOTE JUMP FORWARD - Jump forward 15 seconds
  // ============================================
  TrackPlayer.addEventListener(Event.RemoteJumpForward, async () => {
    console.log('🎧 [SERVICE] ⏩⏩⏩ RemoteJumpForward event received from lock screen');
    try {
      const position = await TrackPlayer.getPosition();
      const duration = await TrackPlayer.getDuration();
      const newPosition = Math.min(position + 15, duration || 0);
      await TrackPlayer.seekTo(newPosition);
      console.log(`✅ [SERVICE] Jumped forward 15s to ${newPosition}s via lock screen`);
    } catch (error) {
      console.error('❌ [SERVICE] Error handling RemoteJumpForward:', error);
    }
  });

  // ============================================
  // REMOTE JUMP BACKWARD - Jump backward 15 seconds
  // ============================================
  TrackPlayer.addEventListener(Event.RemoteJumpBackward, async () => {
    console.log('🎧 [SERVICE] ⏪⏪⏪ RemoteJumpBackward event received from lock screen');
    try {
      const position = await TrackPlayer.getPosition();
      const newPosition = Math.max(position - 15, 0);
      await TrackPlayer.seekTo(newPosition);
      console.log(`✅ [SERVICE] Jumped backward 15s to ${newPosition}s via lock screen`);
    } catch (error) {
      console.error('❌ [SERVICE] Error handling RemoteJumpBackward:', error);
    }
  });

  // ============================================
  // PLAYBACK STATE CHANGED - Sync with app state
  // ============================================
  TrackPlayer.addEventListener(Event.PlaybackState, async ({ state }) => {
    console.log(`🎧 [SERVICE] 📊 PlaybackState changed: ${state}`);
    // This event helps track state changes for debugging
    // The actual state sync happens via App.js event listeners
  });

  // ============================================
  // PLAYBACK TRACK CHANGED - Track changed
  // ============================================
  TrackPlayer.addEventListener(Event.PlaybackTrackChanged, async ({ track, position }) => {
    console.log(`🎧 [SERVICE] 🎵 PlaybackTrackChanged: track=${track?.id}, position=${position}`);
    // This event is handled in App.js to sync queue state
  });

  // ============================================
  // PLAYBACK PROGRESS - Position updates
  // ============================================
  TrackPlayer.addEventListener(Event.PlaybackProgressUpdated, async ({ position, buffered, duration }) => {
    // This event fires frequently for progress updates
    // Handled in App.js for UI updates
  });

  console.log('✅ [SERVICE] All remote event handlers registered successfully');
  console.log('🎧 [SERVICE] Lock screen controls are now active');
};
