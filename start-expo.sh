#!/bin/bash

# Script to start Expo with optimizations for macOS file watching issues

echo "🧹 Cleaning up previous processes..."
pkill -f "expo start" 2>/dev/null || true
pkill -f "metro" 2>/dev/null || true

echo "🗑️  Clearing caches..."
rm -rf .expo 2>/dev/null || true
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .metro 2>/dev/null || true

echo "🚀 Starting Expo development server..."
npx expo start --clear

echo "✅ Expo server started!"
echo "📱 Scan the QR code with Expo Go app or press 'w' to open in web browser"
