# Troubleshooting Lock Screen Audio Controls

## Issue: No audio player showing on lock screen

### Quick Diagnostic Checklist

1. **Check if you're using Expo Go:**

   - ❌ Expo Go does NOT support custom native modules
   - ✅ You MUST use a development build or TestFlight build

2. **Check console logs when playing audio:**
   Look for these messages:

   - `✅ NowPlayingInfo native module found!` - Module is loaded
   - `⚠️ NowPlayingInfo native module not found` - Module not loaded (this is the problem)
   - `🎵 Setting Now Playing info:` - Metadata being set
   - `✅ Now Playing info set successfully!` - Metadata set successfully

3. **Verify native module setup:**

   ```bash
   # Check if iOS project exists
   ls ios/

   # Check if native files exist
   ls ios/RHOODApp/NowPlayingInfoModule.*
   ```

### Common Causes & Solutions

#### Cause 1: Using Expo Go

**Solution:** Build a development build:

```bash
# Generate iOS native project
npx expo prebuild --platform ios

# Build development client
npx expo run:ios
```

#### Cause 2: Native files not added to Xcode

**Symptoms:** Console shows "NowPlayingInfo native module not found"

**Solution:**

1. Open `ios/RHOODApp.xcworkspace` in Xcode
2. Add the native module files to the project (see `docs/IOS_NOW_PLAYING_SETUP.md`)
3. Set bridging header path
4. Add MediaPlayer framework
5. Rebuild

#### Cause 3: Audio session not configured correctly

**Solution:** The audio mode should already be configured, but verify:

- `staysActiveInBackground: true` is set
- Audio is actually playing when you lock the screen

#### Cause 4: iOS Simulator limitations

**Solution:** Test on a real iOS device. Lock screen controls may not work reliably in the simulator.

### Testing Steps

1. **Play audio in the app**
2. **Check console logs** - should see Now Playing info being set
3. **Lock the device** (don't just turn off screen - actually lock it)
4. **Wake the lock screen** - audio player should appear

### If Still Not Working

1. Check that audio is actually playing:

   - Can you hear the audio?
   - Is the play button showing as playing in the app?

2. Verify audio session:

   ```javascript
   // In console, check:
   Audio.getAudioModeAsync().then(console.log);
   // Should show: staysActiveInBackground: true
   ```

3. Try restarting the app after making changes

4. Clean build:
   ```bash
   # In Xcode: Product → Clean Build Folder (Shift+Cmd+K)
   npx expo run:ios
   ```

### Expected Console Output (When Working)

```
✅ NowPlayingInfo native module found!
✅ Audio mode configured for native lock screen controls
🎵 Setting Now Playing info: { title: '...', artist: '...', ... }
✅ Now Playing info set successfully!
```

### Expected Console Output (When NOT Working)

```
⚠️ NowPlayingInfo native module not found. Available modules: [...]
⚠️ NowPlayingInfo native module not available. This requires a development build...
⚠️ Make sure you've:
1. Run 'npx expo prebuild --platform ios'
2. Added the native files to Xcode project
3. Built a development build (not Expo Go)
```
