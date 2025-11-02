# iOS Remote Controls Setup Verification

This document verifies that all requirements for iOS remote control events are correctly configured.

## ✅ Configuration Checklist

### 1. Service Registration (index.js)

- ✅ Service registered at app startup: `TrackPlayer.registerPlaybackService()` in `index.js`
- ✅ Registered BEFORE any audio plays
- ✅ Service function exported from `src/audio/playbackService.js`

**Status:** CORRECT ✅

### 2. Background Modes (app.json)

- ✅ `UIBackgroundModes: ["audio"]` configured
- ✅ `AVAudioSessionCategory: "playback"` configured
- ✅ `AVAudioSessionMode: "default"` configured

**Status:** CORRECT ✅

### 3. Service Function (playbackService.js)

- ✅ All remote event listeners registered INSIDE the service function
- ✅ Listeners registered before `updateOptions()` is called
- ✅ Service verifies TrackPlayer instance is available
- ✅ Handles: RemotePlay, RemotePause, RemoteNext, RemotePrevious, RemoteSeek, RemoteStop

**Status:** CORRECT ✅

### 4. Player Setup (player.js)

- ✅ `setupPlayer()` calls `TrackPlayer.setupPlayer()` first
- ✅ Waits 500ms for service to register listeners
- ✅ Then calls `updateOptions()` with capabilities
- ✅ Sets `iosCategory: "playback"`
- ✅ Configures all required capabilities (Play, Pause, Next, Previous, Seek, etc.)

**Status:** CORRECT ✅

### 5. Initialization Order

The correct order is now:

1. ✅ App starts → `index.js` registers service
2. ✅ `setupGlobalAudio()` called → waits for service, then calls `setupPlayer()`
3. ✅ `setupPlayer()` → calls `TrackPlayer.setupPlayer()` (triggers service function)
4. ✅ Service function → registers all remote event listeners
5. ✅ `setupPlayer()` → waits 500ms for service to finish
6. ✅ `setupPlayer()` → calls `updateOptions()` with capabilities
7. ✅ Audio plays → iOS recognizes app as "Now Playing" and sends remote events

**Status:** CORRECT ✅

## 🔍 How to Verify It's Working

1. **Build and run on a physical iOS device** (simulator won't work)

2. **Check console logs for this sequence:**

   ```
   ✅ Track player playback service registered at app startup
   🎵 Initializing react-native-track-player...
   ✅ TrackPlayer.setupPlayer() completed
   🎵 Playback service initializing...
   ✅ Background playback service started
   📱 Registering remote control event listeners for iOS...
   ⏳ Waiting for playback service to register listeners...
   ✅ Service listeners should now be registered
   ⚙️ Configuring TrackPlayer capabilities...
   ✅ Track player capabilities configured for remote control events
   ✅ Track player initialized with capabilities
   ```

3. **Play audio and verify:**

   - Lock screen shows controls with artwork, title, artist
   - Control Center shows controls
   - AirPods controls work
   - Car Bluetooth controls work
   - Lock screen buttons (play/pause/next/prev) work

4. **Check for remote control events:**
   When you press buttons, you should see:
   ```
   🎵🔵 REMOTE PLAY BUTTON PRESSED
   🎵 Current state before play: [state]
   ✅ Remote: Play command executed
   ```

## 🐛 Troubleshooting

If remote controls still don't work:

1. **Service not registering:** Check that `index.js` logs show "✅ Track player playback service registered"
2. **Listeners not registering:** Check that `playbackService.js` logs show "✅ Playback service event listeners registered"
3. **Capabilities not set:** Check that `setupPlayer()` completes without errors
4. **Timing issues:** The 500ms delay should be enough, but if not, increase it
5. **Physical device required:** Remote controls don't work in simulator - must test on real device

## 📝 Notes

- The service function is called automatically when `TrackPlayer.setupPlayer()` is invoked
- The 500ms delay in `setupPlayer()` ensures the service has time to register listeners before capabilities are set
- iOS only sends remote control events to the app that is currently "Now Playing"
- All listeners are registered inside the service function (required by react-native-track-player)
