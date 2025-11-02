# Fix: App Crash on Startup

## The Problem

The app was crashing on startup with `RCTFatal` error when trying to import `react-native-track-player`. This happens because:

1. `react-native-track-player` requires native modules
2. The native modules might not be properly linked or initialized
3. The import was happening at the top level, causing a crash before the app could start

## The Fix

Made all `react-native-track-player` imports and usage **defensive**:

### 1. `index.js` - Conditional Service Registration

```javascript
// Only register if track-player is available
try {
  const TrackPlayer = require("react-native-track-player");
  if (TrackPlayer && TrackPlayer.registerPlaybackService) {
    TrackPlayer.registerPlaybackService(...);
  }
} catch (error) {
  // Continue without track-player
}
```

### 2. `App.js` - Conditional Imports and Usage

```javascript
// Conditionally import track-player
let trackPlayer = null;
try {
  trackPlayer = require("./src/audio/player");
} catch (error) {
  // App will use expo-av fallback
}

// Always check before using
if (Platform.OS === "ios" && trackPlayer) {
  await trackPlayer.setupPlayer();
}
```

## What This Does

- **Prevents crashes**: If track-player isn't available, the app continues with expo-av
- **Graceful fallback**: iOS will use expo-av if track-player fails
- **Development builds**: Track-player will work when properly built
- **Simulator testing**: App won't crash even if native modules aren't ready

## Testing

1. Reload the app in the simulator
2. Check console logs for:
   - `✅ Track player module loaded` - if track-player is available
   - `⚠️ Track player not available` - if using fallback
3. App should start without crashing

## Next Steps

If track-player still doesn't work after this fix:

1. Rebuild the app: `eas build -p ios --profile development --clear-cache`
2. Check that pods installed correctly: `cd ios && pod install`
3. Verify native modules are linked in Xcode

The app should now start without crashing regardless of track-player availability.
