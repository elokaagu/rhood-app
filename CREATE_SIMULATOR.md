# Create iOS Simulator Manually

## The Problem

Expo is trying to use a simulator UUID that doesn't exist: `0694F081-B7B7-46F4-A3DB-781D40FD5EF2`

## Solution: Create a New Simulator via Xcode

### Method 1: Use Xcode GUI (Easiest)

1. **Open Xcode**
   ```bash
   open -a Xcode
   ```

2. **Open Simulator:**
   - In Xcode menu: **Xcode → Settings** (or Preferences)
   - Go to **Platforms** tab
   - Make sure **iOS 26.1** runtime is downloaded
   - Close Settings

3. **Open Simulator app:**
   ```bash
   open -a Simulator
   ```

4. **Create New Simulator:**
   - In Simulator menu: **File → New Simulator**
   - Select **iPhone 15** (or any iPhone model)
   - Select **iOS 26.1** runtime
   - Click **Create**

5. **Boot the Simulator:**
   - The simulator should boot automatically
   - Wait for it to fully load

6. **Start Expo:**
   ```bash
   npx expo start --ios
   ```
   Expo should now detect the open simulator and use it.

### Method 2: Use Command Line (Advanced)

First, get the exact identifiers:

```bash
# List available device types
xcrun simctl list devicetypes

# List available runtimes  
xcrun simctl list runtimes

# Create simulator (replace identifiers with actual values)
xcrun simctl create "iPhone 15 Test" "com.apple.CoreSimulator.SimDeviceType.iPhone-15" "com.apple.CoreSimulator.SimRuntime.iOS-26-1"

# Boot it
xcrun simctl boot "iPhone 15 Test"

# Start Expo
npx expo start --ios
```

### Method 3: Use Expo Go (Recommended - No Simulator Needed)

**This bypasses the simulator entirely:**

```bash
npx expo start
```

Then scan the QR code with **Expo Go** app on your iPhone.

## Why This Happens

- Expo caches the last used simulator UUID
- If that simulator is deleted, Expo still tries to use the cached UUID
- Creating a new simulator gives Expo a valid device to use

## Quick Fix Right Now

**Just use Expo Go:**
```bash
npx expo start
# Scan QR code with Expo Go app - no simulator needed!
```

This will work immediately without needing to fix simulators.

