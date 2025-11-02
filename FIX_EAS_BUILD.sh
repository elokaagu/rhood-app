#!/bin/bash
# Fix EAS Build CocoaPods Issues
# This script ensures the build will work correctly

echo "🔧 Fixing EAS Build CocoaPods Issues..."
echo ""

# 1. Verify local pod installation works
echo "1️⃣ Verifying local pod installation..."
cd ios
if pod install > /dev/null 2>&1; then
    echo "✅ Local pod installation works"
else
    echo "❌ Local pod installation failed. Fix local issues first."
    exit 1
fi
cd ..

# 2. Ensure Podfile.lock is committed
echo ""
echo "2️⃣ Checking Podfile.lock status..."
if git ls-files --error-unmatch ios/Podfile.lock > /dev/null 2>&1; then
    echo "✅ Podfile.lock is tracked in git"
    if git diff --quiet ios/Podfile.lock; then
        echo "✅ Podfile.lock has no uncommitted changes"
    else
        echo "⚠️ Podfile.lock has uncommitted changes"
        echo "   Committing Podfile.lock..."
        git add ios/Podfile.lock
        git commit -m "Update Podfile.lock with latest dependencies"
        echo "✅ Podfile.lock committed"
    fi
else
    echo "⚠️ Podfile.lock is not tracked in git"
    echo "   Adding to git..."
    git add ios/Podfile.lock
    git commit -m "Add Podfile.lock with react-native-track-player dependencies"
    echo "✅ Podfile.lock added to git"
fi

# 3. Build command
echo ""
echo "3️⃣ Ready to build!"
echo ""
echo "⚠️ IMPORTANT: You MUST use --clear-cache for this build:"
echo ""
echo "   eas build -p ios --profile development --clear-cache"
echo ""
echo "This will:"
echo "  • Clear EAS's cached Podfile.lock"
echo "  • Use your committed Podfile.lock"
echo "  • Resolve dependencies correctly"
echo ""

