# iOS Lock Screen Architecture Guide

## Understanding Lock Screen Surfaces

iOS has multiple Lock Screen surfaces, each with different requirements:

### 1. Now Playing Controls (MPRemoteCommandCenter)
- **What**: Play/pause/skip buttons for audio
- **Technology**: Native iOS APIs (MPRemoteCommandCenter, MPNowPlayingInfoCenter)
- **Current Status**: ✅ Implemented via `react-native-track-player`
- **Location**: Handled by TrackPlayer service (`src/audio/playbackService.js`)

### 2. Live Activities (iOS 16.1+)
- **What**: Real-time updating UI on Lock Screen and Dynamic Island
- **Technology**: ActivityKit + SwiftUI
- **Current Status**: 🔄 Native module created, needs Xcode setup
- **Files**: 
  - `ios/RHOOD/LiveActivityModule.swift`
  - `ios/RHOOD/LiveActivityModule.m`
  - `lib/liveActivity.js`

### 3. Lock Screen Widgets (iOS 14+)
- **What**: Static glanceable information
- **Technology**: WidgetKit + SwiftUI
- **Current Status**: 📋 Can be added via Widget Extension
- **Data Source**: App Group UserDefaults

## Architecture Overview

```
┌─────────────────────────────────────────┐
│         React Native App                 │
│  (App.js, audio playback logic)          │
└──────────────┬──────────────────────────┘
               │
               │ Native Bridge
               │
┌──────────────▼──────────────────────────┐
│      Native iOS Module                   │
│  (LiveActivityModule.swift)              │
│  - startLiveActivity()                   │
│  - updateLiveActivity()                  │
│  - endLiveActivity()                     │
│  - updateSharedState()                   │
└──────────────┬──────────────────────────┘
               │
       ┌───────┴────────┐
       │                 │
┌──────▼──────┐  ┌──────▼──────────────┐
│ ActivityKit │  │ App Group Storage    │
│ (Live       │  │ (UserDefaults)      │
│ Activities) │  │                      │
└──────┬──────┘  └──────┬───────────────┘
       │                 │
       │                 │
┌──────▼─────────────────▼──────────────┐
│     SwiftUI Extensions                 │
│  - Live Activity Widget                │
│  - Lock Screen Widget                  │
│  - Dynamic Island UI                   │
└───────────────────────────────────────┘
```

## Data Flow

### Starting Playback

1. **RN App** calls `liveActivity.startLiveActivity(state)`
2. **Native Module** creates ActivityKit activity
3. **Native Module** writes state to App Group UserDefaults
4. **SwiftUI Extension** reads from UserDefaults and renders
5. **Live Activity** appears on Lock Screen

### Updating Playback

1. **RN App** calls `liveActivity.updateLiveActivity(state)` (throttled)
2. **Native Module** updates ActivityKit activity
3. **Native Module** updates App Group UserDefaults
4. **SwiftUI Extension** re-renders with new data

### Ending Playback

1. **RN App** calls `liveActivity.endLiveActivity()`
2. **Native Module** ends ActivityKit activity
3. **Live Activity** disappears from Lock Screen

## App Group Configuration

**Identifier**: `group.com.rhoodapp.mobile`

**Shared Keys**:
- `currentTrackTitle` - String
- `currentTrackArtist` - String
- `isPlaying` - Bool
- `position` - Double (seconds)
- `duration` - Double (seconds)
- `artwork` - String (URL)
- `lastUpdated` - Date
- `currentLiveActivityId` - String (UUID)

## Integration Points

### In App.js

```javascript
import liveActivity from './lib/liveActivity';

// When track starts playing
const handleTrackStart = async (track) => {
  await liveActivity.startLiveActivity({
    title: track.title,
    artist: track.artist,
    isPlaying: true,
    position: 0,
    duration: track.durationMillis / 1000,
    artwork: track.image
  });
};

// During playback updates (throttle to ~1s)
const handlePlaybackUpdate = async (state) => {
  await liveActivity.updateLiveActivity({
    title: state.currentTrack.title,
    artist: state.currentTrack.artist,
    isPlaying: state.isPlaying,
    position: state.positionMillis / 1000,
    duration: state.durationMillis / 1000,
    artwork: state.currentTrack.image
  });
};

// When playback stops
const handlePlaybackStop = async () => {
  await liveActivity.endLiveActivity();
};
```

## Current Implementation Status

### ✅ Completed
- Native module bridge (`LiveActivityModule.swift`)
- React Native interface (`lib/liveActivity.js`)
- App Group entitlements configured
- Documentation

### 🔄 Needs Setup
- Add files to Xcode project
- Link ActivityKit framework
- Create Widget Extension (optional)
- Test on physical device

### 📋 Future Enhancements
- Custom Live Activity UI design
- Widget variants (small, medium, large)
- Interactive widgets (App Intents)
- Dynamic Island animations

## Key Points

1. **React Native cannot render into Lock Screen surfaces** - Must use native SwiftUI
2. **App Groups are required** - For sharing data between app and extensions
3. **ActivityKit is iOS 16.1+ only** - Widgets work on iOS 14+
4. **Now Playing controls are separate** - Already handled by TrackPlayer
5. **Updates should be throttled** - To preserve battery life

## Testing Checklist

- [ ] App Group configured in Developer Portal
- [ ] App Group added to app entitlements
- [ ] Native module files added to Xcode
- [ ] ActivityKit framework linked
- [ ] Test Live Activity on iOS 16.1+ device
- [ ] Test widget on iOS 14+ device
- [ ] Verify App Group UserDefaults are shared
- [ ] Test update throttling
- [ ] Test end activity cleanup
