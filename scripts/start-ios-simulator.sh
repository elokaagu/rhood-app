#!/usr/bin/env bash
# Boot a valid iOS simulator so Expo can open the app.
# Use this if you see: "Invalid device or device pair: <UUID>"

set -e

# Kill Simulator so it doesn't restore the invalid cached device
killall Simulator 2>/dev/null || true
sleep 1

# Boot by name (avoids stale UUIDs). Prefer older runtime (iOS 18.6) for compatibility.
# iPhone 16 Pro on iOS 18.6 = older simulator; iPhone 17 Pro = newer (iOS 26.x).
if xcrun simctl list devices available | grep -q "iPhone 16 Pro"; then
  DEVICE="iPhone 16 Pro"
elif xcrun simctl list devices available | grep -q "iPhone 17 Pro"; then
  DEVICE="iPhone 17 Pro"
else
  DEVICE="iPhone 16"
fi

echo "Booting simulator: $DEVICE"
xcrun simctl boot "$DEVICE" 2>/dev/null || true

# Open Simulator app so the device is visible (can fail with -609 when run from script/SSH)
open -a Simulator 2>/dev/null || open /Applications/Xcode.app/Contents/Developer/Applications/Simulator.app 2>/dev/null || true

echo ""
echo "Simulator is ready."
echo "  • First time or no app on simulator? Install dev build:  npm run ios"
echo "  • Dev build already installed? Start Metro then press i:  npm run start"
echo "If the Simulator window did not open, launch Simulator from Spotlight first."
