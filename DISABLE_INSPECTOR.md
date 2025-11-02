# Disable Inspector/DevTools Overlay

## What Was Changed

1. **`ios/Podfile.properties.json`**: Added `EX_DEV_CLIENT_ENABLE_DEV_TOOLS` set to `"false"` to disable DevTools
2. **`index.js`**: Added code to disable React DevTools global hook at app startup

## Quick Fix (Without Rebuilding)

**Shake your device/simulator** to open the dev menu, then:

- Tap "Disable Inspector" or "Hide DevTools" if available
- Or look for any toggle to hide the inspector overlays

The overlays should disappear immediately.

## Permanent Fix (Requires Rebuild)

To permanently disable the inspector overlays, you need to rebuild the app:

### Option 1: EAS Build (Recommended)

```bash
# Rebuild the development client
eas build -p ios --profile development --clear-cache
```

### Option 2: Local Build

```bash
# Regenerate native project
npx expo prebuild --platform ios --clean

# Reinstall pod
cd ios && pod install && cd ..

# Run the app
npx expo run:ios
```

### Option 3: If Running on Simulator/Device Already

1. **Kill the running app** on your device/simulator
2. **Restart the Metro bundler**:
   ```bash
   # Stop current Metro (Ctrl+C)
   # Start fresh
   npx expo start --dev-client --clear
   ```
3. **Reload the app** (shake device → "Reload" or press `r` in terminal)

The JavaScript changes in `index.js` should take effect after a reload.

## What These Settings Do

- `EX_DEV_CLIENT_NETWORK_INSPECTOR`: Disables network inspection overlay
- `EX_DEV_CLIENT_ENABLE_DEV_TOOLS`: Disables DevTools completely
- `__REACT_DEVTOOLS_GLOBAL_HOOK__`: Disables React DevTools integration

## Note

- The inspector is only enabled in development builds
- Production builds don't have these overlays
- If overlays persist, try a full app restart or rebuild
