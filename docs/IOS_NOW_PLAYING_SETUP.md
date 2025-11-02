# iOS Now Playing Setup Guide

This guide explains how to add native iOS Now Playing metadata support to display track details (title, artist, artwork) on the lock screen.

## Overview

The app uses `expo-av` for audio playback, but `expo-av` doesn't expose an API to set `MPNowPlayingInfoCenter` metadata directly. We've created a native module to bridge to iOS's `MPNowPlayingInfoCenter`.

## ✅ Files Created

The native module files have been created:

- ✅ `ios/RHOODApp/NowPlayingInfoModule.swift` - Swift implementation
- ✅ `ios/RHOODApp/NowPlayingInfoModule.m` - React Native bridge
- ✅ `ios/RHOODApp/NowPlayingInfoModule-Bridging-Header.h` - Bridging header
- ✅ `lib/nowPlayingInfo.js` - JavaScript interface
- ✅ `lib/lockScreenControls.js` - Updated to use Now Playing info

## 🚀 Setup Steps

### Step 1: Generate iOS Native Project

If you haven't already generated the iOS native project, run:

```bash
npx expo prebuild --platform ios
```

This will create the `ios/` directory with the Xcode project structure.

### Step 2: Add Files to Xcode Project

1. **Open Xcode:**

   ```bash
   open ios/RHOODApp.xcworkspace
   ```

   Or open `ios/RHOODApp.xcodeproj` if you don't use CocoaPods.

2. **Add the Native Module Files:**

   The files are already in `ios/RHOODApp/` but need to be added to the Xcode project:

   - Right-click on the `RHOODApp` folder in the Project Navigator
   - Select "Add Files to RHOODApp..."
   - Navigate to `ios/RHOODApp/`
   - Select these files:
     - `NowPlayingInfoModule.swift`
     - `NowPlayingInfoModule.m`
     - `NowPlayingInfoModule-Bridging-Header.h`
   - Make sure "Copy items if needed" is **unchecked** (files are already in place)
   - Ensure "Add to targets: RHOODApp" is checked
   - Click "Add"

3. **Configure Bridging Header:**

   In Xcode:

   - Select your project in the Project Navigator (top item)
   - Select the `RHOODApp` target
   - Go to "Build Settings" tab
   - Search for "Objective-C Bridging Header"
   - Set the value to: `RHOODApp/NowPlayingInfoModule-Bridging-Header.h`

4. **Add MediaPlayer Framework:**

   In Xcode:

   - Still in Build Settings, or go to "Build Phases" tab
   - Expand "Link Binary With Libraries"
   - Click the "+" button
   - Search for and add: `MediaPlayer.framework`

### Step 3: Build and Test

1. **Clean build folder:**

   ```bash
   # In Xcode: Product → Clean Build Folder (Shift+Cmd+K)
   ```

2. **Build and run:**

   ```bash
   npx expo run:ios
   ```

   Or build from Xcode:

   - Select your device or simulator
   - Press Cmd+R to build and run

### Step 4: Verify It Works

1. Play a track in the app
2. Lock your iPhone
3. You should see on the lock screen:
   - ✅ Track title
   - ✅ Artist name
   - ✅ Album artwork (if provided)
   - ✅ Progress bar with elapsed/remaining time
   - ✅ Playback controls (play/pause, next/previous)

## 🔧 How It Works

### JavaScript → Native Bridge

1. **JavaScript calls** `nowPlayingInfo.setNowPlayingInfo()` in `lib/nowPlayingInfo.js`
2. **Bridge** connects to native module via `NativeModules.NowPlayingInfo`
3. **Swift module** updates `MPNowPlayingInfoCenter.default().nowPlayingInfo`
4. **iOS system** displays the info on lock screen and Control Center

### Integration Points

The module is automatically called from `lib/lockScreenControls.js`:

- When track starts: `showLockScreenNotification()` sets full metadata
- During playback: `setPlaybackState()` updates position and play/pause state
- When stopped: `hideLockScreenNotification()` clears the info

## 📝 Manual Verification

If you want to verify the native module is accessible from JavaScript:

```javascript
import { NativeModules } from "react-native";
console.log("Available modules:", Object.keys(NativeModules));
// Should include 'NowPlayingInfoModule'
```

## 🐛 Troubleshooting

### Module Not Found Error

If you see "NowPlayingInfoModule is null":

- Make sure files are added to the Xcode project target
- Verify bridging header path is correct
- Clean and rebuild the project

### Artwork Not Showing

- Check that the image URL is accessible
- Verify the URL format is correct (https://)
- Check console logs for image loading errors

### Metadata Not Updating

- Ensure you're calling `setPlaybackState()` regularly during playback
- Check that the native module methods are being called (add console logs)
- Verify the track object has `title`, `artist`, and `image` properties

### Build Errors

**"Cannot find type 'RCTPromiseResolveBlock'":**

- Make sure React Native is properly linked
- Check that `#import <React/RCTBridgeModule.h>` is in the bridging header

**Swift/Objective-C Compatibility:**

- Make sure the bridging header is configured correctly
- Ensure all Swift files use `@objc` annotations

## 🎯 Next Steps

Once the native module is working:

1. Test on a physical device (not just simulator)
2. Test background playback and lock screen controls
3. Verify artwork loads correctly from various sources
4. Test play/pause/next/previous buttons from lock screen

## 📚 Reference

- [MPNowPlayingInfoCenter Documentation](https://developer.apple.com/documentation/mediaplayer/mpnowplayinginfocenter)
- [React Native Native Modules](https://reactnative.dev/docs/native-modules-intro)
- [Expo Development Builds](https://docs.expo.dev/development/introduction/)

## Current Status

- ✅ Native module files created
- ✅ JavaScript interface implemented
- ✅ Integration with lock screen controls complete
- ⏳ **Action needed:** Add files to Xcode project and rebuild
