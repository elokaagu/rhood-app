# Audio Session Conflict Fix

## Problem

Console logs showed this error:

```
AQIONode.cpp:590   client <RemoteIOClient@0x71bff3000(@0x71bff3240); output; CMSession(UserEventAgent[32], 0xffffffff)>: could not fetch audio session category (err = 1768843583)
```

## Root Cause

**Audio session configuration conflict** on iOS:

- `react-native-track-player` manages the iOS audio session internally when `iosCategory: "playback"` is set in `updateOptions()`
- `lib/lockScreenControls.js` was ALSO calling `Audio.setAudioModeAsync()` from expo-av on iOS
- Having both frameworks try to configure the audio session causes iOS to fail with error code 1768843583

## Solution

Modified `lib/lockScreenControls.js` to **skip** `Audio.setAudioModeAsync()` on iOS:

**Before:**

```javascript
// Called on both iOS and Android
await Audio.setAudioModeAsync({
  allowsRecordingIOS: false,
  staysActiveInBackground: true,
  playsInSilentModeIOS: true,
  shouldDuckAndroid: false,
  playThroughEarpieceAndroid: false,
});
```

**After:**

```javascript
// Only called on Android
if (Platform.OS === "android") {
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    staysActiveInBackground: true,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: false,
    playThroughEarpieceAndroid: false,
  });
} else {
  // iOS: TrackPlayer handles audio session configuration internally
  console.log("📱 iOS: Audio session managed by react-native-track-player");
}
```

## Why This Works

1. **On iOS with TrackPlayer:**

   - TrackPlayer's `iosCategory: "playback"` in `updateOptions()` sets up the audio session
   - No need for expo-av's `setAudioModeAsync()`
   - TrackPlayer is the single source of truth for audio session configuration

2. **On Android:**

   - expo-av is used for playback
   - `setAudioModeAsync()` is still needed for background playback

3. **Result:**
   - No conflicting audio session configurations
   - iOS audio session properly configured by TrackPlayer
   - No more "could not fetch audio session category" errors

## Verification

After this fix, you should:

1. ✅ No longer see `could not fetch audio session category` errors in Console
2. ✅ See log: `📱 iOS: Audio session managed by react-native-track-player`
3. ✅ Lock screen controls should work properly (no audio session conflicts)

## Related Files

- `lib/lockScreenControls.js` - Fixed to skip audio session config on iOS
- `src/audio/player.js` - TrackPlayer configures iOS audio session via `iosCategory: "playback"`
- `App.js` - Already correctly skips `setAudioModeAsync()` on iOS (early return)
