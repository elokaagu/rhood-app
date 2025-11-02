# EAS Build Instructions - CocoaPods Fix

## The Problem

EAS builds are failing with:

```
Compatible versions of some pods could not be resolved.
```

This happens because EAS cached a `Podfile.lock` from before `react-native-track-player` was added.

## The Solution

### Option 1: Clear Cache (Recommended for first build after adding native module)

```bash
eas build -p ios --profile development --clear-cache
```

### Option 2: After Podfile.lock is committed

Once `ios/Podfile.lock` is committed to git with the correct dependencies, EAS will use the committed version:

```bash
# Make sure Podfile.lock is committed
git add ios/Podfile.lock
git commit -m "Update Podfile.lock with react-native-track-player"

# Then build (cache should work now)
eas build -p ios --profile development
```

## What Changed

1. **Committed Podfile.lock**: The updated `Podfile.lock` with `react-native-track-player` dependencies is now in git
2. **Updated eas.json**: Removed `ios/Pods` from cache paths to avoid stale pod installations
3. **Pod Dependencies**: Verified locally - `react-native-track-player (4.1.2)` and `SwiftAudioEx (1.1.0)` install correctly

## Verification

Local pod installation confirms everything works:

```bash
cd ios && pod install
# Should complete successfully with react-native-track-player installed
```

## Next Steps

1. **First build after this fix**: Use `--clear-cache` flag
2. **Subsequent builds**: Should work normally without cache clearing
3. **If issues persist**: Check the build logs for specific pod version conflicts
