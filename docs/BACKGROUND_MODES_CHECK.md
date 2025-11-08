# Background Modes Configuration Check

## Current Status: ✅ VERIFIED

### Configuration Locations

#### 1. app.json (Primary Source)

**File:** `app.json` → `ios.infoPlist`

```json
{
  "ios": {
    "infoPlist": {
      "UIBackgroundModes": ["audio"],
      "AVAudioSessionCategory": "playback",
      "AVAudioSessionMode": "default"
    }
  }
}
```

#### 2. ios/RHOOD/Info.plist (Compiled Output)

**File:** `ios/RHOOD/Info.plist`

```xml
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
</array>
<key>AVAudioSessionCategory</key>
<string>playback</string>
<key>AVAudioSessionMode</key>
<string>default</string>
```

## ✅ Verification Checklist

### 1. UIBackgroundModes: ["audio"]

**Status:** ✅ Configured

- **Location:** `app.json` line 24, `Info.plist` line 73-76
- **Purpose:** Allows app to continue playing audio in the background
- **Required for:** Background audio playback, lock screen controls
- **Value:** `["audio"]` ✓ Correct

### 2. AVAudioSessionCategory: "playback"

**Status:** ✅ Configured

- **Location:** `app.json` line 25, `Info.plist` line 5-6
- **Purpose:** Sets audio session category for playback
- **Required for:** Audio continues playing when device is locked or in silent mode
- **Value:** `"playback"` ✓ Correct
- **Alternative values:** (not used)
  - `"ambient"` - Audio stops when screen locks (wrong)
  - `"soloAmbient"` - Audio stops when screen locks (wrong)

### 3. AVAudioSessionMode: "default"

**Status:** ✅ Configured

- **Location:** `app.json` line 26, `Info.plist` line 7-8
- **Purpose:** Sets audio session mode
- **Required for:** Standard playback behavior
- **Value:** `"default"` ✓ Correct

## What Each Setting Does

### UIBackgroundModes: ["audio"]

- **What it does:** Tells iOS the app needs to continue running in the background for audio playback
- **Why it's needed:** Without this, iOS will suspend the app when it goes to background
- **Effect:** App can play audio even when screen is locked or app is in background
- **Result:** ✅ Lock screen controls can appear and function

### AVAudioSessionCategory: "playback"

- **What it does:** Configures the audio session to prioritize playback
- **Why it's needed:** Ensures audio continues in silent mode and when screen locks
- **Effect:** Audio plays even when:
  - Device is locked
  - Silent switch is on
  - App is in background
- **Result:** ✅ Audio session configured for background playback

### AVAudioSessionMode: "default"

- **What it does:** Sets the default playback mode
- **Why it's needed:** Standard mode for music/media playback
- **Effect:** Standard audio playback behavior
- **Result:** ✅ Compatible with remote controls

## Important Notes

### ⚠️ TrackPlayer vs app.json Configuration

**Important:** When using `react-native-track-player`, the library ALSO sets the audio session category via:

```javascript
TrackPlayer.updateOptions({
  iosCategory: "playback", // This also sets AVAudioSessionCategory
});
```

**This is OK because:**

- ✅ TrackPlayer's `iosCategory` matches `app.json`'s `AVAudioSessionCategory`
- ✅ Both are set to `"playback"`
- ✅ No conflict - they're setting the same value

**However:** If there was a mismatch, it could cause issues.

### 🔍 How Expo Uses These Settings

1. **app.json** → Expo reads `infoPlist` settings
2. **Build time** → Expo writes to `ios/RHOOD/Info.plist`
3. **Runtime** → iOS reads `Info.plist` for permissions/capabilities
4. **TrackPlayer** → Also sets audio session category programmatically (matches Info.plist)

## Verification in Build

### To Verify in Built App:

1. Build app: `eas build --platform ios`
2. Install on device
3. Check Xcode → Project → Capabilities → Background Modes
4. Should show: **Audio, AirPlay, and Picture in Picture** ✓

### To Verify in Info.plist:

After build, check `ios/RHOOD/Info.plist`:

```xml
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
</array>
```

## Common Issues

### ❌ Issue 1: Missing UIBackgroundModes

**Symptom:** Audio stops when app goes to background
**Fix:** Add `"UIBackgroundModes": ["audio"]` to `app.json`

### ❌ Issue 2: Wrong Audio Session Category

**Symptom:** Audio stops in silent mode or when locked
**Fix:** Set `"AVAudioSessionCategory": "playback"` (not "ambient")

### ❌ Issue 3: Mismatch Between app.json and TrackPlayer

**Symptom:** Conflicting audio session configurations
**Fix:** Ensure both use `"playback"`:

- `app.json`: `"AVAudioSessionCategory": "playback"`
- `TrackPlayer`: `iosCategory: "playback"`

### ✅ Current Status

All settings are correctly configured and match each other.

## Summary

✅ **UIBackgroundModes:** Correctly set to `["audio"]`
✅ **AVAudioSessionCategory:** Correctly set to `"playback"`
✅ **AVAudioSessionMode:** Correctly set to `"default"`
✅ **TrackPlayer iosCategory:** Matches app.json (both `"playback"`)
✅ **Info.plist:** Compiled correctly from app.json

**All background modes are correctly configured!** ✅

The app should be able to:

- Play audio in the background
- Continue playback when device is locked
- Show lock screen controls
- Respond to remote control events
