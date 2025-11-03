# Console Log Filtering Guide for Remote Controls

## ⚠️ Important: Ignore Identity Services Errors

If you see this error in Console:

```
Error Domain=com.apple.identityservices.error Code=3 "Remote user isn't registered"
```

**This is NOT related to audio remote controls!** This is Apple's Identity Services (iMessage/FaceTime) system trying to send a message. It's harmless and unrelated to our audio playback.

## ✅ What to Actually Look For

### Filter by These Markers in Console.app:

1. **`[STARTUP]`** - Service registration at app launch
2. **`[SERVICE]`** - Playback service initialization and handler attachment
3. **`[PLAYER]`** - TrackPlayer setup and capability configuration
4. **`[REMOTE]`** - **CRITICAL**: Lock screen button presses

### Expected Log Sequence When Working:

#### At App Launch:

```
[STARTUP] ✅ Track player playback service registered at app startup
[STARTUP] 📱 iOS will now send remote control events to this service
[SERVICE] 🎵 Background playback service initializing...
[SERVICE] ✅ TrackPlayer instance verified
[SERVICE] ✅ Event listeners attached successfully
[PLAYER] 🎵 Initializing react-native-track-player...
[PLAYER] ✅ TrackPlayer.setupPlayer() completed
[PLAYER] ⚙️ Configuring TrackPlayer capabilities...
[PLAYER] ✅ Track player capabilities configured for remote control events
```

#### When You Press Lock Screen Buttons:

```
🔵🔵🔵 [REMOTE] PLAY button pressed on lock screen/Control Center
✅✅✅ [REMOTE] Play executed successfully
```

OR

```
⏸️⏸️⏸️ [REMOTE] PAUSE button pressed on lock screen/Control Center
✅✅✅ [REMOTE] Pause executed successfully
```

## How to Filter in Console.app

### Step 1: Connect iPhone to Mac

- Connect via USB cable
- Open Console.app (Applications → Utilities → Console)

### Step 2: Select Your Device

- Click your iPhone name in left sidebar
- Make sure "Include Info Messages" is checked (View menu)

### Step 3: Filter Logs

In the search box at top right, type:

- **`[REMOTE]`** - See all remote button presses
- **`[SERVICE]`** - See service registration and setup
- **`[STARTUP]`** - See app startup registration
- **`rhoodapp`** - See all logs from your app (bundle ID)

### Step 4: Test Remote Controls

1. Start audio playback in your app
2. Lock the device (press power button)
3. Press Play/Pause on lock screen
4. **Watch Console for `[REMOTE]` logs**

## Troubleshooting

### If You See `[STARTUP]` but NOT `[REMOTE]`:

- ✅ Service registered correctly
- ❌ Buttons aren't triggering events
- **Possible causes:**
  - Capabilities not set correctly
  - Audio session conflict
  - TrackPlayer not properly initialized

### If You See `[REMOTE]` logs but audio doesn't change:

- ✅ Events are reaching handlers
- ❌ But playback isn't responding
- **Possible causes:**
  - TrackPlayer state mismatch
  - Queue issues
  - Error in playback command

### If You Don't See ANY `[REMOTE]` logs:

- ❌ Events aren't reaching the service
- **Possible causes:**
  - Service not registered properly
  - Capabilities not enabled
  - Expo-av still active (audio session conflict)

## Ignore These (Harmless) Logs

- ✅ Identity Services errors (com.apple.identityservices.error)
- ✅ SpringBoard logs (lock screen UI rendering)
- ✅ RunningBoard logs (process management)
- ✅ AudioAccessory logs (unless specifically about your app)

Focus only on logs with `[STARTUP]`, `[SERVICE]`, `[PLAYER]`, or `[REMOTE]` prefixes.
