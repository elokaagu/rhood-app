# Quick Fix for EAS Build CocoaPods Error

## The Issue

You're seeing this error:

```
Compatible versions of some pods could not be resolved.
```

## The Solution

The EAS build cache has stale CocoaPods dependency information. Clear it and rebuild:

```bash
eas build -p ios --profile development --clear-cache
```

## Why This Happens

When you add a new native module like `react-native-track-player`, it introduces new CocoaPods dependencies. If EAS has cached the old Podfile.lock from a previous build, it tries to resolve dependencies using outdated information, causing conflicts.

## Verification

Local pod installation works fine (verified), so this is purely a cache issue on EAS servers.

Run this to verify locally:

```bash
cd ios && pod install
```

If that works, the `--clear-cache` flag will fix the EAS build.
