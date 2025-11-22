# Fix iOS Simulator Invalid Device Error

## The Error

```
Error: xcrun simctl boot 0694F081-B7B7-46F4-A3DB-781D40FD5EF2 exited with non-zero code: 148
Invalid device or device pair: 0694F081-B7B7-46F4-A3DB-781D40FD5EF2
```

This happens when Expo is trying to use a simulator device UUID that no longer exists (the simulator was deleted or renamed).

## ✅ Solution: Complete Cache Clear

I've already cleared the following caches for you:

1. ✅ Expo settings (`~/.expo/settings.json`)
2. ✅ Local Expo iOS cache (`.expo/ios`)
3. ✅ Expo devices cache (`.expo/devices.json`)
4. ✅ Expo global cache (`~/.expo/cache`)
5. ✅ All running Node/Expo processes

## 🚀 Next Steps

**Restart Expo fresh:**

```bash
npx expo start --ios
```

Expo will now automatically detect and use an available simulator instead of the cached invalid UUID.

## Alternative: Start with Device Selection

If you want to manually select a simulator:

```bash
# First, open Simulator app manually
open -a Simulator

# Then start Expo (it will use the open simulator)
npx expo start --ios
```

## Or Use Expo Go (No Simulator Needed)

```bash
npx expo start
# Scan QR code with Expo Go app on your phone
```

## What Was Fixed

- Removed cached simulator UUID from `.expo/devices.json`
- Cleared all Expo caches
- Killed any stuck Node processes
- Ready for a fresh start

## Still Having Issues?

If the error persists after restarting:

1. **Check simulators exist:**
   ```bash
   xcrun simctl list devices
   ```

2. **Create a new simulator if needed:**
   - Open Simulator app
   - File → New Simulator
   - Select iPhone 15 (or latest)
   - Click Create

3. **Use a physical device instead:**
   ```bash
   npx expo start
   # Use Expo Go app on your iPhone
   ```
