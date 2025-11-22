# Fix iOS Simulator Error - Step by Step

## The Error
```
Error: xcrun simctl boot 0694F081-B7B7-46F4-A3DB-781D40FD5EF2 exited with non-zero code: 148
Invalid device or device pair: 0694F081-B7B7-46F4-A3DB-781D40FD5EF2
```

## ✅ I've Already Done These:

1. ✅ Removed `.expo/devices.json` 
2. ✅ Removed entire `~/.expo` directory
3. ✅ Cleared all Expo caches
4. ✅ Killed all Node/Expo processes

## 🔧 Solution: Start Fresh

### Option 1: Let Expo Auto-Select (Recommended)

**Step 1:** Stop any running Expo process (Ctrl+C)

**Step 2:** Start Expo fresh:
```bash
npx expo start --ios
```

This will now create a fresh `.expo` directory and auto-detect available simulators.

### Option 2: Manually Boot a Simulator First

**Step 1:** Open Simulator manually:
```bash
open -a Simulator
```

**Step 2:** In Simulator app:
- Go to **File → New Simulator**
- Select **iPhone 15** (or latest)
- Select **iOS 17.0** (or latest)
- Click **Create**

**Step 3:** Start Expo:
```bash
npx expo start --ios
```

Expo will detect the open simulator and use it.

### Option 3: Use a Specific Simulator Name

**Step 1:** List available simulators:
```bash
xcrun simctl list devices available
```

**Step 2:** Boot a specific simulator:
```bash
xcrun simctl boot "iPhone 15"
```

**Step 3:** Start Expo:
```bash
npx expo start --ios
```

### Option 4: Use Expo Go (No Simulator Needed)

**Step 1:** Start Expo:
```bash
npx expo start
```

**Step 2:** Scan QR code with Expo Go app on your iPhone

**Step 3:** App opens in Expo Go - no simulator needed!

## 🚨 If Error Persists

Try this nuclear option:

```bash
# Kill everything
killall -9 node
killall -9 com.apple.CoreSimulator.CoreSimulatorService

# Wait a moment
sleep 2

# Remove ALL Expo caches
rm -rf ~/.expo
rm -rf .expo
rm -rf node_modules/.cache
rm -rf .metro

# Start completely fresh
npx expo start --ios --clear
```

## ✅ What Should Happen

After restarting, Expo should:
- ✅ Detect available simulators automatically
- ✅ Create a new `.expo/devices.json` with valid UUIDs
- ✅ Boot and use an available simulator
- ✅ No more invalid UUID errors

If you still see the error after these steps, the UUID might be hardcoded somewhere else. In that case, use **Option 4 (Expo Go)** as a workaround.

