# How to View iOS App Logs

## ⚠️ IMPORTANT: Where JavaScript Logs Appear

**JavaScript `console.log()` messages (like `[STARTUP]`, `[SERVICE]`, `[REMOTE]`, `[PLAYER]`) will NOT appear in Console.app!**

**Console.app only shows system-level logs** (audio session state, app lifecycle, etc.)

**To see JavaScript logs, use:**

- **Xcode Console** (Method 2) - Best for native builds on physical devices
- **Metro Bundler** (Method 1) - Best for development builds

---

## Quick Reference

### For Development (Metro Bundler)

**Easiest method** - Logs appear in the terminal where you ran `npm start` or `expo start`

Look for:

- `[STARTUP]` - Service registration
- `[SERVICE]` - Service execution and handler registration
- `[REMOTE]` - Button presses on lock screen
- `[PLAYER]` - TrackPlayer initialization

---

## Method 1: Metro Bundler Console (Recommended for Development)

**When to use:** Running app via `expo start` or `npm start`

1. Start your app:

   ```bash
   npm start
   # or
   expo start
   ```

2. Logs will appear in the same terminal window
3. Look for the log prefixes: `[STARTUP]`, `[SERVICE]`, `[REMOTE]`, `[PLAYER]`

**Note:** Some native logs (especially from the background service) might not appear here. For those, use Xcode Console.

---

## Method 2: Xcode Console (Best for Native Builds)

**When to use:** Testing on physical device or need to see ALL logs including background service

### For Physical Device:

1. **Connect your iPhone/iPad** via USB
2. **Open Xcode**
3. **Window → Devices and Simulators** (or press `Cmd+Shift+2`)
4. **Select your device** from the left sidebar
5. **Click "Open Console"** button (or "View Device Logs")
6. **Filter logs:**
   - Search for: `rhoodapp` (your app name)
   - Or search for: `[STARTUP]`, `[SERVICE]`, `[REMOTE]`
   - Or filter by process: Select your app from the process dropdown

### For Simulator:

1. **Open Xcode**
2. **Run your app** from Xcode (or have it running)
3. **View → Debug Area → Activate Console** (or press `Cmd+Shift+Y`)
4. Logs will appear in the bottom panel

**Tip:** You can filter by typing in the search box at the bottom of the console

---

## Method 3: Terminal (iOS Simulator Only)

**When to use:** Want to see logs in a separate terminal window

### Stream All Simulator Logs:

```bash
xcrun simctl spawn booted log stream --level=debug
```

### Stream Only Your App Logs:

```bash
xcrun simctl spawn booted log stream --predicate 'process == "rhoodapp"' --level=debug
```

### Stream with Filter for Specific Logs:

```bash
xcrun simctl spawn booted log stream --predicate 'process == "rhoodapp"' --level=debug | grep -E "\[STARTUP\]|\[SERVICE\]|\[REMOTE\]|\[PLAYER\]"
```

**To stop:** Press `Ctrl+C`

---

## Method 4: Console.app (macOS System Logs)

⚠️ **CRITICAL: Console.app does NOT show JavaScript `console.log()` messages!**

**Console.app only shows system-level logs** (audio session state, app lifecycle, etc.).  
**JavaScript logs** (like `[STARTUP]`, `[SERVICE]`, `[REMOTE]`, `[PLAYER]`) **will NOT appear here.**

**To see JavaScript logs, you MUST use Xcode Console (Method 2) or Metro bundler (Method 1).**

**When to use Console.app:** Only for viewing system-level events (audio session, app lifecycle, etc.)

1. **Open Console.app** (Applications → Utilities → Console)
2. **Select your device** from the left sidebar (if connected)
3. **Filter by your app's bundle ID:**
   - In the search bar (top right), type: `com.rhoodapp.mobile`
   - OR filter by process: In the "Process" column, look for your app's process name
4. **Clear existing logs** (optional): Click "Clear" button to start fresh

**What you'll see in Console.app:**

- System-level events (audio session state, app lifecycle)
- Native iOS framework messages
- **NOT JavaScript `console.log()` messages** - these require Xcode Console

**What you WON'T see in Console.app:**

- `[STARTUP]` logs
- `[SERVICE]` logs
- `[REMOTE]` logs
- `[PLAYER]` logs
- Any JavaScript `console.log()` output

**If you see `MediaRemoteUI` suspension messages:** That's a problem (see troubleshooting below)

---

## Method 5: React Native Debugger

**When to use:** Using React Native Debugger for debugging

1. **Open React Native Debugger**
2. **Console tab** will show JavaScript logs
3. **Native logs** (from background service) won't appear here - use Xcode Console

---

## What to Look For

### ✅ Good Signs (Everything Working):

```
✅✅✅ [STARTUP] Registering playback service for iOS remote controls...
✅✅✅ [STARTUP] Playback service registered successfully
🎵 [SERVICE] Playback service function called by TrackPlayer
✅✅✅ [SERVICE] ALL remote control handlers registered successfully
🔵🔵🔵 [REMOTE] PLAY button pressed on lock screen/Control Center
✅✅✅ [REMOTE] Play executed successfully
```

### ❌ Bad Signs (Issues):

```
⚠️ [STARTUP] Track player not available
❌ [SERVICE] TrackPlayer.addEventListener is not available
❌❌❌ [REMOTE] Play error: ...
```

### 🔍 If You Don't See `[REMOTE]` Logs:

- **Problem:** iOS isn't routing remote control events to handlers
- **Possible causes:**
  - Service not registered correctly
  - Handlers not registered before capabilities set
  - Audio session conflict
- **Check:** Look for `[STARTUP]` and `[SERVICE]` logs first

### 🔍 If You See `[REMOTE]` Logs But Buttons Don't Work:

- **Problem:** Handlers are being called, but TrackPlayer methods are failing
- **Check:** Look for error messages after `[REMOTE]` logs
- **Example:**
  ```
  🔵🔵🔵 [REMOTE] PLAY button pressed
  ❌❌❌ [REMOTE] Play error: TrackPlayer not ready
  ```

---

## Quick Test Script

To quickly test if logs are working, add this to your app startup:

```javascript
console.log("🔍 TEST: Logs are working!");
```

If you see this in your chosen log viewer, you're all set!

---

## Troubleshooting

### "I don't see any logs"

1. **Check you're looking in the right place:**

   - Metro bundler = terminal where you ran `npm start`
   - Xcode Console = Xcode → Devices → Open Console
   - Terminal = separate terminal window with `xcrun simctl` command

2. **Check app is actually running:**

   - Make sure the app is launched and playing audio
   - Service logs only appear when `setupPlayer()` is called

3. **Check log level:**
   - Some log viewers filter by level
   - Make sure debug/info logs are enabled

### "I see Metro logs but not native logs"

- Native logs (from background service) require Xcode Console
- Metro only shows JavaScript logs
- Use Xcode → Devices → Open Console for native logs

### "Logs are too verbose"

- Use filters: Search for `[STARTUP]`, `[SERVICE]`, `[REMOTE]`
- In Xcode Console: Use the search box at the bottom
- In Terminal: Use `grep` to filter

### "I see MediaRemoteUI suspension messages"

**Problem:** If you see logs like:

```
[osservice<com.apple.MediaRemoteUI>:91747] Suspending task
Sending stop command to com.apple.MediaRemoteUI
```

This means iOS is suspending the media remote UI service, which prevents lock screen controls from working.

**Solutions:**

1. **Verify background audio is enabled:**

   - Check `app.json` has `"UIBackgroundModes": ["audio"]`
   - Rebuild the app after changing this

2. **Ensure audio session is configured:**

   - The app should set `AVAudioSessionCategory` to `playback` before playing audio
   - `react-native-track-player` should handle this automatically

3. **Check for audio session conflicts:**

   - Make sure you're not using both `expo-av` and `react-native-track-player` simultaneously on iOS
   - iOS should use ONLY `react-native-track-player` for native controls

4. **Rebuild the app:**
   - Background modes require a native rebuild
   - Run `eas build --platform ios` or rebuild locally

---

## Quick Test: Do Remote Controls Work?

**You can test if remote controls are working WITHOUT viewing logs:**

1. **Start playing audio** in the app
2. **Lock your device** (press power button)
3. **Press Play/Pause** on the lock screen
4. **Check if audio actually plays/pauses**

**If audio responds to button presses:**

- ✅ Remote controls ARE working
- The handlers are being called successfully
- You don't need to check logs (unless debugging a specific issue)

**If audio does NOT respond:**

- ❌ Remote controls are NOT working
- Check logs in **Xcode Console** (not Console.app) to see why
- Look for `[REMOTE]` logs when you press buttons
- If no `[REMOTE]` logs appear, the handlers aren't being called

---

## Recommended Workflow

1. **During development:** Use Metro bundler console (easiest)
2. **When testing remote controls:** Use Xcode Console (shows all logs including background service)
3. **For debugging specific issues:** Use Terminal with filters
4. **Quick test:** Just try the buttons - if they work, you're done!
