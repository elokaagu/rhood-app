# Enable Native Google Sign-In UI

## Why You See Browser Popup Now

Currently, you're likely running the app in **Expo Go**, which doesn't support native modules. The app automatically falls back to web-based OAuth (browser popup).

## How to Get Native UI (No Browser)

### Step 1: Install the Package

```bash
npx expo install @react-native-google-signin/google-signin
```

### Step 2: Get Your Google OAuth Client IDs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Go to **APIs & Services** → **Credentials**

#### Create iOS Client ID:
- Click **Create Credentials** → **OAuth 2.0 Client ID**
- Application type: **iOS**
- Bundle ID: `com.rhoodapp.mobile`
- Click **Create**
- **Copy the Client ID** (you'll need this)

#### Create Android Client ID:
First, get your SHA-1 fingerprint:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1
```

Then:
- Click **Create Credentials** → **OAuth 2.0 Client ID**
- Application type: **Android**
- Package name: `com.rhoodapp.mobile`
- SHA-1 certificate fingerprint: (paste from above)
- Click **Create**

#### Web Client ID (Already Done):
You should already have this for Supabase.

### Step 3: Create .env File

Create a `.env` file in your project root:

```env
GOOGLE_WEB_CLIENT_ID=123456789-abc.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=987654321-xyz.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=456789123-def.apps.googleusercontent.com
```

Replace with your actual Client IDs from Google Cloud Console.

### Step 4: Update app.json

Add the plugin configuration to `app.json`:

```json
{
  "expo": {
    "name": "RhoodApp",
    "slug": "rhoodapp",
    "plugins": [
      "@react-native-google-signin/google-signin"
    ],
    "ios": {
      "bundleIdentifier": "com.rhoodapp.mobile",
      "infoPlist": {
        "CFBundleURLTypes": [
          {
            "CFBundleURLSchemes": [
              "com.googleusercontent.apps.987654321-xyz"
            ]
          }
        ]
      }
    },
    "android": {
      "package": "com.rhoodapp.mobile"
    }
  }
}
```

**Important**: In `CFBundleURLSchemes`, use your iOS Client ID in reverse format:
- If your iOS Client ID is: `987654321-xyz.apps.googleusercontent.com`
- The URL scheme is: `com.googleusercontent.apps.987654321-xyz`

### Step 5: Build Development Client

This is the key step! You need a custom build:

```bash
# For iOS (Mac only)
npx expo run:ios

# For Android
npx expo run:android

# Or use EAS Build
eas build --profile development --platform ios
eas build --profile development --platform android
```

### Step 6: Test Native Sign-In

1. Install the development build on your device
2. Open the app
3. Go to Login screen
4. Tap "Continue with Google"
5. **You should now see the native Google account picker!** ✨

## What You'll See

### Before (Expo Go - Browser Popup):
```
Tap "Continue with Google"
    ↓
Opens Safari/Chrome
    ↓
Google login page
    ↓
Redirects back to app
```

### After (Development Build - Native UI):
```
Tap "Continue with Google"
    ↓
Native Google account picker appears
    ↓
Select account
    ↓
Instantly signed in!
```

## Verification

Check the console logs:
- **Native UI**: You'll see `"📱 Attempting native Google Sign-In..."`
- **Web fallback**: You'll see `"🔄 Falling back to web-based OAuth..."`

## Why This Happens

| Environment | Google Sign-In Method | Reason |
|-------------|----------------------|---------|
| **Expo Go** | Web OAuth (browser) | Expo Go doesn't support custom native modules |
| **Development Build** | Native UI | Custom build includes native Google Sign-In SDK |
| **Production Build** | Native UI | Production builds always include native modules |

## Quick Test

To verify your setup is correct before building:

```bash
# Check if package is installed
npm list @react-native-google-signin/google-signin

# Should show:
# @react-native-google-signin/google-signin@X.X.X
```

## Need Help?

If you see the browser popup after building:
1. Check console logs for errors
2. Verify `.env` file has correct Client IDs
3. Ensure `app.json` has the plugin configured
4. Rebuild the app completely
5. Check that you're running the development build, not Expo Go

## Summary

✅ **Code is ready** - No changes needed
✅ **Will work in Expo Go** - Uses web fallback
✅ **Native UI ready** - Just need to build

**To enable native UI**: Build a development client with `npx expo run:ios` or `npx expo run:android`

That's it! The native UI will work automatically once you build. 🚀
