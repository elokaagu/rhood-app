# iOS Live Activities & Lock Screen Widgets Setup

## Overview

This guide explains how to set up native iOS Live Activities and Lock Screen widgets for R/HOOD. Live Activities provide real-time updates on the Lock Screen and Dynamic Island, while widgets provide static glanceable information.

## Architecture

- **React Native App**: Owns UI + business logic
- **Native iOS Module**: Bridge between RN and native iOS APIs
- **App Group Storage**: Shared UserDefaults for widget access
- **SwiftUI Extensions**: Render Live Activities and Widgets

## Prerequisites

- iOS 16.1+ for Live Activities
- iOS 14+ for Widgets
- Xcode 14+
- App Group configured in Apple Developer Portal

## Step 1: Configure App Group

1. **In Apple Developer Portal:**
   - Go to Certificates, Identifiers & Profiles
   - Select your App ID (`com.rhoodapp.mobile`)
   - Enable "App Groups" capability
   - Create/select App Group: `group.com.rhoodapp.mobile`

2. **In Xcode:**
   - Open `ios/RHOOD.xcworkspace`
   - Select RHOOD target → Signing & Capabilities
   - Add "App Groups" capability
   - Check `group.com.rhoodapp.mobile`

## Step 2: Add Native Module Files to Xcode

The following files have been created and need to be added to the Xcode project:

1. **Open Xcode:**
   ```bash
   open ios/RHOOD.xcworkspace
   ```

2. **Add Files:**
   - Right-click on `RHOOD` folder in Project Navigator
   - Select "Add Files to RHOOD..."
   - Navigate to `ios/RHOOD/`
   - Select:
     - `LiveActivityModule.swift`
     - `LiveActivityModule.m`
   - Ensure "Copy items if needed" is **unchecked**
   - Ensure "Add to targets: RHOOD" is checked
   - Click "Add"

3. **Verify Bridging Header:**
   - Check that `RHOOD-Bridging-Header.h` exists
   - If not, create it and add:
     ```objc
     #import <React/RCTBridgeModule.h>
     #import <React/RCTEventEmitter.h>
     ```

## Step 3: Add Required Frameworks

In Xcode:

1. Select RHOOD target → Build Phases
2. Expand "Link Binary With Libraries"
3. Add:
   - `ActivityKit.framework` (iOS 16.1+)
   - `WidgetKit.framework`

## Step 4: Create Live Activity Widget Extension (Optional)

For a full Live Activity UI, create a Widget Extension:

1. **In Xcode:**
   - File → New → Target
   - Select "Widget Extension"
   - Name: `RhoodLiveActivity`
   - Language: Swift
   - Include Configuration Intent: No

2. **Update Widget Code:**
   ```swift
   import WidgetKit
   import ActivityKit

   @available(iOS 16.1, *)
   struct RhoodLiveActivityWidget: Widget {
       var body: some WidgetConfiguration {
           ActivityConfiguration(for: RhoodLiveActivityAttributes.self) { context in
               // Lock Screen UI
               VStack(alignment: .leading) {
                   Text(context.attributes.title)
                       .font(.headline)
                   Text(context.attributes.artist)
                       .font(.subheadline)
                       .foregroundColor(.secondary)
                   ProgressView(value: context.state.position, total: context.state.duration)
               }
               .padding()
           } dynamicIsland: { context in
               // Dynamic Island UI
               DynamicIsland {
                   // Expanded UI
                   DynamicIslandExpandedRegion(.leading) {
                       Text(context.attributes.title)
                   }
               } compactLeading: {
                   // Compact leading
                   Image(systemName: "music.note")
               } compactTrailing: {
                   // Compact trailing
                   Text("\(Int(context.state.position))s")
               } minimal: {
                   // Minimal
                   Image(systemName: "music.note")
               }
           }
       }
   }
   ```

3. **Add App Group to Widget Extension:**
   - Select Widget Extension target
   - Signing & Capabilities
   - Add "App Groups"
   - Check `group.com.rhoodapp.mobile`

## Step 5: Use in React Native

The `lib/liveActivity.js` module provides a simple API:

```javascript
import liveActivity from './lib/liveActivity';

// Start Live Activity when playback starts
await liveActivity.startLiveActivity({
  title: 'Track Title',
  artist: 'Artist Name',
  isPlaying: true,
  position: 0,
  duration: 180,
  artwork: 'https://...'
});

// Update during playback
await liveActivity.updateLiveActivity({
  title: 'Track Title',
  artist: 'Artist Name',
  isPlaying: true,
  position: 45,
  duration: 180,
  artwork: 'https://...'
});

// End when playback stops
await liveActivity.endLiveActivity();
```

## Step 6: Integration with Audio Playback

Update `App.js` to use Live Activities:

```javascript
import liveActivity from './lib/liveActivity';

// In playGlobalAudio function:
await liveActivity.startLiveActivity({
  title: track.title,
  artist: track.artist,
  isPlaying: true,
  position: 0,
  duration: track.durationMillis / 1000,
  artwork: track.image
});

// In playback status update:
await liveActivity.updateLiveActivity({
  title: globalAudioState.currentTrack.title,
  artist: globalAudioState.currentTrack.artist,
  isPlaying: globalAudioState.isPlaying,
  position: globalAudioState.positionMillis / 1000,
  duration: globalAudioState.durationMillis / 1000,
  artwork: globalAudioState.currentTrack.image
});
```

## Testing

1. **Build and Run:**
   ```bash
   npx expo run:ios
   ```

2. **Test Live Activity:**
   - Start audio playback
   - Lock the device
   - Check Lock Screen for Live Activity
   - Check Dynamic Island (iPhone 14 Pro+)

3. **Test Widget:**
   - Long press Lock Screen
   - Tap "Customize"
   - Add R/HOOD widget
   - Verify it shows current track info

## Troubleshooting

### Live Activity Not Appearing

- Check iOS version (requires 16.1+)
- Verify App Group is configured correctly
- Check console logs for errors
- Ensure `ActivityKit` framework is linked

### Widget Not Updating

- Verify App Group UserDefaults are being written
- Check widget extension has App Group capability
- Reload widget timeline: `WidgetCenter.shared.reloadAllTimelines()`

### Module Not Found

- Ensure files are added to Xcode project
- Clean build folder (Cmd+Shift+K)
- Rebuild project

## Next Steps

1. **Customize Live Activity UI** - Design the Lock Screen appearance
2. **Add Widget Variants** - Create different widget sizes
3. **Add Interactivity** - Use App Intents for widget actions
4. **Optimize Updates** - Throttle updates to reduce battery usage

## Notes

- Live Activities require iOS 16.1+
- Widgets work on iOS 14+
- App Group identifier must match in all targets
- Shared UserDefaults are the bridge between RN and native extensions
