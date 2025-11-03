# Testing iOS Remote Controls via TestFlight

## Yes, TestFlight is Perfect for This! ✅

TestFlight builds include native dependencies (react-native-track-player), so remote controls will work exactly like in production.

## Setup Steps

### 1. Build for TestFlight

```bash
# Build iOS production/development build for TestFlight
eas build --platform ios --profile production
# OR
eas build --platform ios --profile preview
```

### 2. Submit to TestFlight

- Once build completes, submit to TestFlight via App Store Connect
- Wait for TestFlight processing (usually 10-30 minutes)

### 3. Install on Device

- Open TestFlight app on your iPhone
- Install the build
- Open the app

## Testing Remote Controls

### Method 1: Device Logs (Easiest)

#### On Mac:

1. **Connect iPhone to Mac via USB** (required for Console access)
2. **Open Console.app** (Applications → Utilities → Console)
3. **Select your device** from left sidebar
4. **Filter logs** by typing in search: `[REMOTE]` or `[SERVICE]`

#### On iPhone:

1. **Start audio playback** in the app
2. **Lock the device** (press power button)
3. **Press Play/Pause** on lock screen
4. **Check Mac Console** - you should see:
   ```
   🔵🔵🔵 [REMOTE] PLAY button pressed on lock screen/Control Center
   ✅✅✅ [REMOTE] Play executed successfully
   ```

### Method 2: React Native Debugger / Metro Logs

If you're running the app with Metro bundler connected:

1. **Run app with Metro** (if in development mode)
2. **Check terminal** where Metro is running
3. **Look for** `[REMOTE]`, `[SERVICE]`, `[PLAYER]` logs

**Note**: Metro logs work best in development builds. Production TestFlight builds typically don't connect to Metro.

### Method 3: Xcode Device Console

1. **Open Xcode**
2. **Window → Devices and Simulators**
3. **Select your connected iPhone**
4. **Click "Open Console"** button
5. **Filter by**: `[REMOTE]` or your app's bundle ID

## What to Look For

### ✅ Good Signs (Everything Working)

**At App Startup:**

```
✅✅✅ [STARTUP] Registering playback service for iOS remote controls...
✅✅✅ [STARTUP] Playback service registered successfully
```

**When Audio Plays:**

```
🎵 [SERVICE] Playback service function called by TrackPlayer
✅✅✅ [SERVICE] ALL remote control handlers registered successfully
✅✅✅ [PLAYER] Capabilities configured - iOS buttons should now be enabled
```

**When You Press Lock Screen Button:**

```
🔵🔵🔵 [REMOTE] PLAY button pressed on lock screen/Control Center
✅✅✅ [REMOTE] Play executed successfully
```

### ❌ Bad Signs (Issues)

**No `[STARTUP]` logs:**

- Service not registering
- Check that `react-native-track-player` is properly installed
- Rebuild required

**No `[SERVICE]` logs:**

- Service function not being called
- Check that `TrackPlayer.setupPlayer()` is being called
- Verify audio playback actually starts

**No `[REMOTE]` logs when pressing buttons:**

- Events not reaching handlers
- Possible causes:
  - Service not registered correctly
  - Capabilities not set
  - Hot reload didn't re-register service → **Cold start app**
  - Wrong build (Expo Go won't work)

**`[REMOTE]` logs appear but audio doesn't change:**

- TrackPlayer methods failing
- Check for error logs: `❌❌❌ [REMOTE] ... error:`
- Possible state mismatch or queue issues

## Test Scenarios

### 1. Basic Play/Pause

- ✅ Lock device while audio is playing
- ✅ Press Play/Pause on lock screen
- ✅ Check logs for `[REMOTE] Play` or `[REMOTE] Pause`
- ✅ Verify audio actually plays/pauses

### 2. Next/Previous

- ✅ Have multiple tracks in queue
- ✅ Lock device
- ✅ Press Next/Previous on lock screen
- ✅ Check logs for `[REMOTE] Next` or `[REMOTE] Previous`
- ✅ Verify track actually changes

### 3. Control Center

- ✅ Swipe up from bottom (or down from top-right on iPhone X+)
- ✅ Press Play/Pause/Next in Control Center
- ✅ Check logs - should work same as lock screen

### 4. AirPods/Bluetooth Controls

- ✅ Connect AirPods or Bluetooth headphones
- ✅ Play audio
- ✅ Double-tap AirPods (or use headphones controls)
- ✅ Check logs for `[REMOTE] Next` or `[REMOTE] Previous`

### 5. Seek/Scrub

- ✅ Lock device
- ✅ Drag progress bar on lock screen
- ✅ Check logs for `[REMOTE] SEEK`
- ✅ Verify position actually changes

## Troubleshooting TestFlight Builds

### Issue: Can't see logs at all

**Solution**:

- Make sure device is connected via USB
- Console.app might need permission to access device
- Try Xcode → Devices → Console instead

### Issue: Logs show but app crashes

**Solution**:

- Check Crash Reports in Xcode → Window → Devices → View Device Logs
- Look for native crash logs

### Issue: Works in development but not TestFlight

**Solution**:

- Check build profile settings
- Verify `react-native-track-player` is included in production build
- Check `app.json` native dependencies are correct

## Quick Test Checklist

- [ ] App installed via TestFlight
- [ ] Device connected to Mac via USB
- [ ] Console.app open and filtering by `[REMOTE]`
- [ ] Audio playback started in app
- [ ] Device locked
- [ ] Lock screen shows media controls
- [ ] Press Play/Pause
- [ ] See `[REMOTE]` logs in Console
- [ ] Audio actually plays/pauses

## Notes

- **TestFlight builds are production-like** - remote controls work the same as App Store builds
- **Console logs require USB connection** - wireless debugging won't show device logs
- **Cold start required** - After installing TestFlight build, fully close and reopen app
- **Network debugging** - If Metro won't connect, use Console.app instead
