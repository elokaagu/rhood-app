# Complete Guide: iOS Lock Screen Remote Controls

## Overview

For lock screen remote controls to work on iOS, you need **both**:

1. **The UI to appear** (lock screen showing media info)
2. **The buttons to function** (play/pause/next/prev actually control playback)

This guide covers **ALL** the steps required and how they must work together.

---

## ✅ Complete Checklist (Must Have ALL of These)

### 1. Service Registration (App Startup) ✅

**File:** `index.js`

- ✅ `TrackPlayer.registerPlaybackService()` called at app startup
- ✅ Must be called **BEFORE** React mounts
- ✅ Must be called **BEFORE** any audio plays
- ✅ Service function must export correctly from `src/audio/playbackService.js`

**What it does:** Tells iOS where to send remote control events (lock screen button presses)

---

### 2. Background Modes (App Configuration) ✅

**File:** `app.json` → `ios.infoPlist`

- ✅ `UIBackgroundModes: ["audio"]` - Allows background playback
- ✅ `AVAudioSessionCategory: "playback"` - Sets audio session category
- ✅ `AVAudioSessionMode: "default"` - Sets audio session mode

**What it does:** iOS permission to play audio in background

---

### 3. Playback Service Event Handlers ✅

**File:** `src/audio/playbackService.js`

- ✅ Service function registered and exports correctly
- ✅ `Event.RemotePlay` handler calls `TrackPlayer.play()`
- ✅ `Event.RemotePause` handler calls `TrackPlayer.pause()`
- ✅ `Event.RemoteNext` handler calls `TrackPlayer.skipToNext()` or App.js callback
- ✅ `Event.RemotePrevious` handler calls `TrackPlayer.skipToPrevious()` or App.js callback
- ✅ `Event.RemoteSeek` handler calls `TrackPlayer.seekTo()`

**What it does:** Handles button presses from lock screen/Control Center

---

### 4. Player Initialization ✅

**File:** `src/audio/player.js`

- ✅ `TrackPlayer.setupPlayer()` called (triggers service function)
- ✅ `TrackPlayer.updateOptions()` called with:
  - ✅ `capabilities: [Play, Pause, SkipToNext, SkipToPrevious, SeekTo, ...]`
  - ✅ `compactCapabilities: [Play, Pause, SkipToNext]`
  - ✅ `iosCategory: "playback"` - **CRITICAL** for remote controls

**What it does:** Tells iOS which buttons to show and enables remote control routing

---

### 5. Track Metadata ✅

**When calling `playTrack()`:**

- ✅ `id` - Unique track identifier
- ✅ `url` - HTTPS audio URL (can be stream)
- ✅ `title` - Track title (shows on lock screen)
- ✅ `artist` - Artist name (shows on lock screen)
- ✅ `artwork` - HTTPS image URL, square, ≥1024px (optional but recommended)
- ✅ `duration` - Duration in seconds (optional, needed for scrubber)

**What it does:** Lock screen displays this metadata

---

### 6. Initialization Order (CRITICAL) ✅

The **EXACT** order must be:

```
1. App Starts
   ↓
2. index.js: TrackPlayer.registerPlaybackService()  ← Service registered
   ↓
3. React Mounts → App.js loads
   ↓
4. setupGlobalAudio() called
   ↓
5. trackPlayer.setupPlayer() called
   ↓
6. TrackPlayer.setupPlayer() internally calls playbackService() function
   ↓
7. playbackService() registers ALL event listeners (RemotePlay, RemotePause, etc.)
   ↓
8. setupPlayer() continues → TrackPlayer.updateOptions() called with capabilities
   ↓
9. iOS sees capabilities + registered listeners → Enables remote controls
   ↓
10. playTrack() called → Track added and starts playing
   ↓
11. iOS recognizes playback → Shows lock screen UI with buttons
   ↓
12. User presses button → iOS routes to playbackService handlers → Works! ✅
```

---

## 🔍 Are There Conflicts Between In-App and Out-of-App Audio?

### **YES - There WAS a conflict (now fixed):**

#### Conflict #1: Audio Session Configuration (FIXED ✅)

**Problem:**

- TrackPlayer sets audio session via `iosCategory: "playback"` in `updateOptions()`
- `lib/lockScreenControls.js` was ALSO calling `Audio.setAudioModeAsync()` on iOS
- **Result:** Audio session conflict → `could not fetch audio session category` error

**Fix:**

- `lockScreenControls.js` now skips `setAudioModeAsync()` on iOS
- TrackPlayer exclusively manages iOS audio session
- ✅ Fixed in commit `32526f1`

#### Conflict #2: expo-av vs TrackPlayer (HANDLED ✅)

**Current Status:**

- ✅ iOS: Uses **ONLY** TrackPlayer (expo-av not used for global audio)
- ✅ Android: Uses expo-av (TrackPlayer not used)
- ✅ No overlap - each platform uses its own system

**In `App.js` `playGlobalAudio()`:**

```javascript
if (Platform.OS === "ios") {
  // Use ONLY track-player - expo-av is NOT called
  await trackPlayer.playTrack({...});
  return; // Early return - no expo-av code runs
}

// Android only
await Audio.setAudioModeAsync({...}); // Only on Android
```

---

## ❌ Common Failure Points

### 1. Service Not Registered at Startup

**Symptom:** Buttons don't respond at all
**Check:** Look for `[STARTUP]` logs in Console
**Fix:** Ensure `index.js` registers service before React mounts

### 2. Event Handlers Not Registered

**Symptom:** Buttons visible but don't work
**Check:** Look for `[SERVICE]` logs showing handlers registered
**Fix:** Ensure service function is called (via `setupPlayer()`)

### 3. Capabilities Not Set

**Symptom:** Buttons might not appear or be disabled
**Check:** Look for `[PLAYER]` logs showing capabilities configured
**Fix:** Ensure `updateOptions()` called with `capabilities` array

### 4. Audio Session Conflict

**Symptom:** `could not fetch audio session category` error
**Check:** Look for audio session errors in Console
**Fix:** ✅ Already fixed - `lockScreenControls.js` skips iOS

### 5. Track Not Playing

**Symptom:** Lock screen UI doesn't appear
**Check:** Verify `TrackPlayer.play()` actually started playback
**Fix:** Ensure audio URL is valid and track is loaded

### 6. Metadata Missing

**Symptom:** Lock screen shows generic/blank info
**Check:** Verify track has `title`, `artist`, `artwork`
**Fix:** Pass complete metadata to `playTrack()`

### 7. Wrong Initialization Order

**Symptom:** Everything looks right but buttons still don't work
**Check:** Verify order: service registration → setupPlayer → updateOptions → play
**Fix:** Follow exact order in checklist above

---

## 🧪 How to Verify Everything Works

### Step 1: Check Service Registration

**In Console, filter by `[STARTUP]`:**

```
✅✅✅ [STARTUP] Registering playback service for iOS remote controls...
✅✅✅ [STARTUP] Playback service registered successfully
```

### Step 2: Check Service Function Called

**In Console, filter by `[SERVICE]`:**

```
🎵 [SERVICE] Playback service function called by TrackPlayer
✅ [SERVICE] TrackPlayer is ready - registering remote control handlers
✅✅✅ [SERVICE] ALL remote control handlers registered successfully
```

### Step 3: Check Capabilities Set

**In Console, filter by `[PLAYER]`:**

```
🎵🎵🎵 [PLAYER] Initializing react-native-track-player...
✅✅✅ [PLAYER] TrackPlayer.setupPlayer() completed
✅✅✅ [PLAYER] Capabilities configured - iOS buttons should now be enabled
```

### Step 4: Start Playback

**In Console:**

```
🎵 Playing track: [Track Name]
✅ Track playing
```

### Step 5: Lock Device and Press Button

**In Console, filter by `[REMOTE]`:**

```
🔵🔵🔵 [REMOTE] PLAY button pressed on lock screen/Control Center
✅✅✅ [REMOTE] Play executed successfully
```

**If you see `[REMOTE]` logs:** ✅ Events are reaching handlers  
**If buttons work:** ✅ Everything is working!  
**If buttons don't work but you see logs:** Check playback state/handlers  
**If no `[REMOTE]` logs:** ❌ Events aren't reaching handlers (service/capability issue)

---

## 📋 Quick Verification Checklist

Run through this when testing:

- [ ] Service registered at startup (`[STARTUP]` logs)
- [ ] Service function called (`[SERVICE]` logs)
- [ ] Event handlers registered (`[SERVICE]` logs)
- [ ] Capabilities configured (`[PLAYER]` logs)
- [ ] Track playing (`[PLAYER]` logs)
- [ ] Lock screen UI appears (visual check)
- [ ] Press Play button → See `[REMOTE]` log → Audio plays/pauses
- [ ] Press Next button → See `[REMOTE]` log → Next track plays (if available)
- [ ] No audio session errors in Console

---

## 🎯 Summary

**For lock screen buttons to work, you need:**

1. ✅ Service registered at startup
2. ✅ Event handlers registered in service
3. ✅ Capabilities configured
4. ✅ Audio session managed by TrackPlayer (no conflicts)
5. ✅ Track playing with valid metadata
6. ✅ Correct initialization order

**Current Status:**

- ✅ All code is in place
- ✅ Audio session conflict fixed
- ✅ No expo-av interference on iOS
- ✅ Proper initialization order
- ✅ Comprehensive logging for debugging

**If buttons still don't work after all this:**

- Check Console logs for `[STARTUP]`, `[SERVICE]`, `[PLAYER]`, `[REMOTE]`
- Verify you're testing on a **physical device** (simulator won't work)
- Verify you're using a **native build** (not Expo Go)
- Check that audio is actually playing (not just queued)
