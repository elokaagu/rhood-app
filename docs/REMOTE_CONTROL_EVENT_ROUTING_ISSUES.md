# Remote Control Event Routing Issues

## Problem
iOS lock screen shows artwork and track info, but buttons (play, pause, rewind, fast forward, scrub) don't respond.

## Root Causes Identified

### ✅ Issue 1: Service Registration Pattern (FIXED)

**Problem:**
Service was required at module load time, then passed to `registerPlaybackService`:
```javascript
const playbackService = require("./src/audio/playbackService");
TrackPlayer.registerPlaybackService(() => playbackService);
```

**Why this could fail:**
- Module might not be fully initialized when required at top level
- Service function might not be in the correct execution context
- React Native's module system might cache the module incorrectly

**Fix:**
Require the service INSIDE the registration callback:
```javascript
TrackPlayer.registerPlaybackService(() => {
  const service = require("./src/audio/playbackService");
  if (typeof service === "function") {
    return service;
  }
  return service.default || service;
});
```

**Status:** ✅ Fixed in commit `[latest]`

---

### ⚠️ Issue 2: Audio Session Category Conflict (POTENTIAL)

**Problem:**
Both `app.json` and TrackPlayer set the audio session category:
- `app.json`: `AVAudioSessionCategory: "playback"`
- TrackPlayer: `iosCategory: "playback"` in `updateOptions()`

**Why this could fail:**
- iOS might apply app.json settings first
- TrackPlayer tries to override, but if audio is already playing, iOS might reject the change
- This could prevent remote control events from being routed correctly

**Potential Fix:**
Remove `AVAudioSessionCategory` from `app.json` and let TrackPlayer manage it exclusively:
```json
// app.json - REMOVE these lines:
"AVAudioSessionCategory": "playback",
"AVAudioSessionMode": "default",
```

**Status:** ⚠️ Not yet tested - may not be necessary

---

### ⚠️ Issue 3: TrackPlayer State Not Ready

**Problem:**
Remote control events might arrive before TrackPlayer has a track loaded or is in a ready state.

**Why this could fail:**
- Handlers call `TrackPlayer.play()`, `TrackPlayer.pause()`, etc.
- If TrackPlayer isn't initialized or has no track, these calls might fail silently
- iOS might stop routing events if handlers fail repeatedly

**Current Protection:**
Handlers now verify TrackPlayer is ready:
```javascript
if (!TrackPlayer || typeof TrackPlayer.getState !== "function") {
  console.error("❌ [REMOTE] TrackPlayer not ready");
  return;
}
```

**Status:** ✅ Protected with error handling

---

### ⚠️ Issue 4: Service Function Execution Context

**Problem:**
The service function runs in a background thread, separate from the React Native JS thread.

**Why this could fail:**
- Module imports might not work correctly in background context
- TrackPlayer instance might be different between threads
- Event listeners might not be registered if module loading fails

**Current Protection:**
Service function imports TrackPlayer inside the function:
```javascript
module.exports = function playbackService() {
  const trackPlayerModule = require("react-native-track-player");
  TrackPlayer = trackPlayerModule.default || trackPlayerModule;
  // ... register handlers
};
```

**Status:** ✅ Already handled correctly

---

### ⚠️ Issue 5: Timing - Handlers Registered After Capabilities

**Problem:**
If capabilities are set before handlers are registered, iOS might not route events.

**Why this could fail:**
- iOS checks for handlers when capabilities are set
- If handlers aren't registered yet, iOS might disable remote controls
- Even if handlers are registered later, iOS might not re-enable them

**Current Protection:**
500ms delay after `setupPlayer()` before setting capabilities:
```javascript
await TrackPlayer.setupPlayer();
await new Promise((resolve) => setTimeout(resolve, 500));
await TrackPlayer.updateOptions({ capabilities, ... });
```

**Status:** ✅ Protected with delay

---

### ⚠️ Issue 6: Background Modes Not Enabled

**Problem:**
If `UIBackgroundModes: ["audio"]` is missing, iOS won't allow background playback or remote controls.

**Current Status:**
✅ Already configured in `app.json`:
```json
"UIBackgroundModes": ["audio"]
```

---

## Debugging Checklist

When remote controls don't work, check these in order:

1. **Service Registration**
   - Look for `[STARTUP]` logs showing service registered
   - Should see: `✅✅✅ [STARTUP] Playback service registered successfully`

2. **Service Execution**
   - Look for `[SERVICE]` logs when audio starts playing
   - Should see: `🎵 [SERVICE] Playback service function called by TrackPlayer`
   - Should see: `✅✅✅ [SERVICE] ALL remote control handlers registered successfully`

3. **Handler Calls**
   - When you press buttons, look for `[REMOTE]` logs
   - Should see: `🔵🔵🔵 [REMOTE] PLAY button pressed`
   - If you DON'T see these logs → iOS isn't routing events (service registration issue)
   - If you DO see these logs but playback doesn't change → TrackPlayer methods are failing

4. **TrackPlayer State**
   - Check if TrackPlayer has a track loaded: `TrackPlayer.getActiveTrack()`
   - Check if TrackPlayer is playing: `TrackPlayer.getState()`
   - Remote controls won't work if no track is loaded

5. **Audio Session**
   - Check for audio session errors in device logs
   - Look for: `could not fetch audio session category`
   - This indicates a conflict between app.json and TrackPlayer

6. **Capabilities**
   - Verify capabilities are set: Look for `[PLAYER]` logs
   - Should see: `✅✅✅ [PLAYER] Capabilities configured`

---

## Testing Steps

1. **Rebuild the app** (native changes require rebuild)
2. **Start playing audio**
3. **Lock the screen**
4. **Press buttons** (play, pause, rewind, fast forward, scrub)
5. **Check device logs** (Xcode → Devices → View Device Logs)
6. **Look for:**
   - `[STARTUP]` - Service registration
   - `[SERVICE]` - Service execution and handler registration
   - `[REMOTE]` - Button presses (if you see these, handlers are being called)
   - Error messages - What's failing

---

## Next Steps

1. ✅ Fixed service registration pattern
2. ⚠️ Test if removing `AVAudioSessionCategory` from app.json helps
3. ✅ Added comprehensive error handling and logging
4. ⚠️ Monitor logs to see if handlers are being called

If handlers ARE being called (you see `[REMOTE]` logs) but buttons still don't work, the issue is with TrackPlayer methods, not event routing.

If handlers are NOT being called (no `[REMOTE]` logs), the issue is with service registration or iOS routing.

