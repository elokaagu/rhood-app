# Lock Screen Controls Debugging Guide

## Current Issue

Lock screen buttons are being pressed, handlers are being called and returning Success, but audio playback is NOT changing.

## What the System Logs Show

From Console.app logs, we can see:
- ✅ iOS IS receiving lock screen button presses
- ✅ MPRemoteCommandCenter IS dispatching commands
- ✅ Handlers ARE being invoked (`handler start` → `handler finish` with `status=Success`)
- ❌ Audio playback is NOT actually changing

## The Problem

The handlers being called are **TrackPlayer's default handlers** (at addresses like `0x10abc73c0`), not our service handlers. These default handlers return Success but don't actually control playback.

## What Should Happen

1. **Service Function Called**: When `setupPlayer()` is invoked, TrackPlayer should call our service function
2. **Event Listeners Registered**: Our service function should register event listeners for `Event.RemotePlay`, `Event.RemotePause`, etc.
3. **Handlers Override Defaults**: Our handlers should override TrackPlayer's default handlers
4. **Audio Controls**: When lock screen buttons are pressed, our handlers should call `TrackPlayer.play()`, `TrackPlayer.pause()`, etc.

## How to Verify Service is Working

### Step 1: Check JavaScript Console Logs

The service logs (`🎧 [Service]`) appear in **JavaScript console**, NOT in system logs (Console.app).

**To view JavaScript console logs:**

1. **Xcode Console:**
   - Open Xcode
   - Run the app
   - View the console output
   - Look for logs starting with `🎧 [Service]` or `🎵 [PLAYER]`

2. **Metro Bundler:**
   - If using Metro bundler, check the terminal where Metro is running
   - Look for logs starting with `🎧 [Service]` or `🎵 [PLAYER]`

### Step 2: Look for These Logs

**When app starts:**
```
🔊 [STARTUP] TrackPlayer available: true
🔊 [STARTUP] Registering playback service...
✅ [STARTUP] Service module loaded, type: function
✅ [STARTUP] Playback service registration completed
```

**When music starts playing:**
```
🎵 [PLAYER] Calling TrackPlayer.setupPlayer()...
✅ [PLAYER] TrackPlayer.setupPlayer() completed - service should be called now
🎧 [Service] ⚠️⚠️⚠️ SERVICE FUNCTION CALLED ⚠️⚠️⚠️
🎧 [Service] Playback service STARTING
🎧 [Service] Registering RemotePlay listener...
🎧 [Service] Registering RemotePause listener...
✅✅✅ [Service] ALL remote control handlers registered successfully
```

**When you press lock screen buttons:**
```
🔵🔵🔵 [Service] REMOTE PLAY button pressed
✅✅✅ [Service] Play executed successfully
```

### Step 3: If Service Logs Don't Appear

If you don't see `🎧 [Service] ⚠️⚠️⚠️ SERVICE FUNCTION CALLED ⚠️⚠️⚠️`:

1. **Service function isn't being called** - This means `setupPlayer()` isn't triggering the service
2. **Check `index.js`** - Verify service is registered correctly
3. **Rebuild the app** - Service registration requires a native rebuild

### Step 4: If Service Logs Appear But Handlers Don't Fire

If you see service initialization logs but NOT the button press logs (`🔵🔵🔵 [Service] REMOTE PLAY`):

1. **Event listeners not registered** - Check for errors in service function
2. **TrackPlayer using default handlers** - Our handlers might not be overriding defaults
3. **Timing issue** - Handlers might be registered after TrackPlayer sets up defaults

## Next Steps

1. **Check JavaScript console** (Xcode or Metro) for service logs
2. **Share the JavaScript console output** when:
   - App starts
   - Music starts playing
   - You press lock screen buttons

This will help determine if:
- Service function is being called
- Event listeners are being registered
- Handlers are being invoked when buttons are pressed

## Expected Behavior

When working correctly:
- Service function is called when `setupPlayer()` runs
- Event listeners are registered successfully
- Lock screen button presses trigger our handlers
- Handlers call `TrackPlayer.play()`, `TrackPlayer.pause()`, etc.
- Audio playback actually changes

## Current Status

Based on system logs:
- ❌ Service function may not be called (no service logs visible)
- ❌ Our event handlers are not being invoked
- ✅ TrackPlayer's default handlers ARE being called
- ❌ Default handlers return Success but don't control playback

