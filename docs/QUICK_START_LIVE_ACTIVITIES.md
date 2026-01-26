# Quick Start: iOS Live Activities

## Minimal Setup (5 minutes)

### Step 1: Add Files to Xcode

1. Open Xcode:
   ```bash
   open ios/RHOOD.xcworkspace
   ```

2. Add native module files:
   - Right-click `RHOOD` folder → "Add Files to RHOOD..."
   - Select:
     - `LiveActivityModule.swift`
     - `LiveActivityModule.m`
   - Ensure "Add to targets: RHOOD" is checked
   - Click "Add"

### Step 2: Link Framework

1. Select RHOOD target → Build Phases
2. Expand "Link Binary With Libraries"
3. Click "+" and add `ActivityKit.framework`

### Step 3: Configure App Group

1. In Apple Developer Portal:
   - App ID → Capabilities → Enable "App Groups"
   - Create: `group.com.rhoodapp.mobile`

2. In Xcode:
   - RHOOD target → Signing & Capabilities
   - Add "App Groups" capability
   - Check `group.com.rhoodapp.mobile`

### Step 4: Use in Code

```javascript
import liveActivity from './lib/liveActivity';

// Start when audio plays
await liveActivity.startLiveActivity({
  title: 'Track Name',
  artist: 'Artist Name',
  isPlaying: true,
  position: 0,
  duration: 180
});

// Update during playback (throttle to ~1s)
await liveActivity.updateLiveActivity({
  title: 'Track Name',
  artist: 'Artist Name',
  isPlaying: true,
  position: 45,
  duration: 180
});

// End when stopped
await liveActivity.endLiveActivity();
```

### Step 5: Test

1. Build and run:
   ```bash
   npx expo run:ios
   ```

2. Start audio playback
3. Lock device
4. Check Lock Screen for Live Activity

## That's It!

The Live Activity will show on the Lock Screen and Dynamic Island (iPhone 14 Pro+). For custom UI, see `docs/IOS_LIVE_ACTIVITIES_SETUP.md`.
