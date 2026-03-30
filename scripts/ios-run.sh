#!/usr/bin/env bash
# Regenerates New Architecture headers (e.g. MixpanelReactNativeSessionReplaySpec.h), then builds.
# CocoaPods can clear ios/build/generated/ios; RCT_IGNORE_PODS_DEPRECATION also skips RN's pod codegen.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
node node_modules/react-native/scripts/generate-codegen-artifacts.js -p "$ROOT" -o "$ROOT/ios" -t ios
exec npx expo run:ios "$@"
