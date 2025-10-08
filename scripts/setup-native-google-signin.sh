#!/bin/bash

# Native Google Sign-In Setup Script for R/HOOD App
# This script helps you set up native Google Sign-In

echo "🚀 Setting up Native Google Sign-In for R/HOOD App"
echo "=================================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

echo "📦 Step 1: Installing required packages..."
echo ""

# Install Google Sign-In package
npx expo install @react-native-google-signin/google-signin

# Install Expo dev client if not already installed
npx expo install expo-dev-client

echo ""
echo "✅ Packages installed successfully!"
echo ""

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo "📝 Step 2: Creating .env file..."
    cat > .env << EOF
# Google OAuth Client IDs
# Replace these with your actual client IDs from Google Cloud Console
GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
EOF
    echo "✅ .env file created! Please update it with your Google Client IDs."
else
    echo "⚠️  .env file already exists. Make sure it contains your Google Client IDs."
fi

echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Configure Google Cloud Console:"
echo "   - Go to https://console.cloud.google.com/"
echo "   - Create OAuth 2.0 Client IDs for iOS, Android, and Web"
echo "   - See docs/NATIVE_GOOGLE_SIGNIN_SETUP.md for detailed instructions"
echo ""
echo "2. Update .env file with your Google Client IDs"
echo ""
echo "3. Configure app.json with your iOS Client ID (reversed)"
echo ""
echo "4. Build a development client:"
echo "   iOS:     npx expo run:ios"
echo "   Android: npx expo run:android"
echo ""
echo "5. Test Google Sign-In in your app"
echo ""
echo "📖 For detailed setup instructions, see:"
echo "   docs/NATIVE_GOOGLE_SIGNIN_SETUP.md"
echo ""
echo "✅ Setup script completed!"
