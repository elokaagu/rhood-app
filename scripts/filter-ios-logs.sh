#!/bin/bash

# Script to filter iOS Simulator logs for remote control debugging
# Usage: ./scripts/filter-ios-logs.sh

echo "🔍 Filtering iOS Simulator logs for remote control events..."
echo "Press Ctrl+C to stop"
echo ""
echo "Looking for:"
echo "  - [STARTUP] - Service registration"
echo "  - [SERVICE] - Service execution and handler registration"
echo "  - [PLAYER] - TrackPlayer initialization"
echo "  - [REMOTE] - Lock screen button presses"
echo ""

# Stream logs and filter for our custom tags
xcrun simctl spawn booted log stream \
  --predicate 'process == "rhoodapp"' \
  --level=debug 2>/dev/null | \
  grep -E "\[STARTUP\]|\[SERVICE\]|\[REMOTE\]|\[PLAYER\]|TrackPlayer|react-native-track-player" \
  --line-buffered

