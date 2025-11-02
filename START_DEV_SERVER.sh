#!/bin/bash
# Start Expo Dev Server for Development Build

echo "🚀 Starting Expo dev server..."
echo ""

# Check if port 8081 is in use
if lsof -ti:8081 > /dev/null 2>&1; then
    echo "⚠️  Port 8081 is already in use"
    echo "   Killing existing process..."
    kill $(lsof -ti:8081) 2>/dev/null
    sleep 2
fi

# Start the dev server
echo "✅ Starting dev server on port 8081..."
npx expo start --dev-client

