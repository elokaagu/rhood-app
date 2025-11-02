# React Native Track Player Setup

This document explains the setup for `react-native-track-player` on iOS for native lock screen and Control Center media controls.

## Configuration

### app.json

The `react-native-track-player` config plugin is **not included** in `app.json` because:

1. Background audio modes are already configured via `UIBackgroundModes: ["audio"]`
2. The library doesn't require a config plugin - it works with native modules directly
3. Removing it prevents module resolution errors during EAS builds

The necessary iOS configuration is already present:

- `UIBackgroundModes: ["audio"]` - enables background audio playback
- `AVAudioSessionCategory: "playback"` - sets audio session category

## Building

### For Development/Testing

Before building, you need to generate native projects:

```bash
# Generate iOS native project
npx expo prebuild --platform ios
```

### EAS Build (Recommended)

If you encounter CocoaPods dependency conflicts during EAS builds, clear the cache:

```bash
# Build with cleared cache (fixes pod dependency issues)
eas build -p ios --profile development --clear-cache
```

Or build without cache clearing (faster, but may fail if dependencies changed):

```bash
eas build -p ios --profile development
```

### Local Build

To test locally:

```bash
npx expo run:ios
```

### Important Notes

1. **Expo Go won't work**: `react-native-track-player` requires native modules and only works with development builds or production builds via EAS/TestFlight.

2. **Native setup**: After running `npx expo prebuild`, the native iOS project will be generated in the `ios/` directory. The library's native code will be automatically linked.

3. **Background audio**: The app already has `UIBackgroundModes: ["audio"]` configured, which is required for lock screen controls.

## How It Works

### iOS Implementation

- Uses `react-native-track-player` for iOS playback
- Automatically displays native MPNowPlayingInfoCenter controls on lock screen and Control Center
- Handles remote commands (AirPods, car, lock screen buttons)
- Requires no manual notification setup - iOS handles it natively

### Android Implementation

- Continues using `expo-av` with MediaStyle notifications
- No changes to existing Android behavior

## Files

- `src/audio/player.js` - Player initialization and control functions
- `src/audio/playbackService.js` - Background service for remote commands
- `index.js` - Registers the playback service at app startup
- `App.js` - Routes iOS to track-player, Android to expo-av

## Testing

1. Build a development or production build (not Expo Go)
2. Install on a physical iOS device
3. Play audio from the app
4. Lock the device - you should see:
   - Track artwork (if provided)
   - Title and artist
   - Progress bar (if duration is set)
   - Play/pause, next, previous, and seek controls
5. Test remote controls:
   - AirPods play/pause buttons
   - Car media controls
   - Lock screen controls

## Troubleshooting

### "Track player initialization failed"

- Make sure you're not running in Expo Go
- Build a development build: `eas build -p ios --profile development`
- Check console logs for specific errors

### Lock screen controls not appearing

- Verify audio is actually playing
- Check that `UIBackgroundModes: ["audio"]` is in app.json
- Ensure artwork URLs are https and accessible
- Test on a real device (not simulator)

### CocoaPods dependency conflicts during EAS build

If you see errors like "Compatible versions of some pods could not be resolved":

1. **Clear EAS cache and rebuild:**

   ```bash
   eas build -p ios --profile development --clear-cache
   ```

2. **Or manually clear cache on EAS:**

   - Go to the build page in Expo dashboard
   - Click "Clear cache and retry build"

3. **Verify local pods work:**
   ```bash
   cd ios && pod install
   ```
   If this works locally, the issue is likely just the EAS cache.

### Module resolution errors during build

- Removed the config plugin from app.json (already done)
- Clean and rebuild: `rm -rf node_modules/.cache && npm install`
