# Native Google Sign-In Quick Start Guide

## 🚀 Quick Setup (5 Steps)

### Step 1: Install Packages

```bash
./scripts/setup-native-google-signin.sh
```

Or manually:
```bash
npx expo install @react-native-google-signin/google-signin
npx expo install expo-dev-client
```

### Step 2: Get Google OAuth Client IDs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select your project
3. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
4. Create **3 Client IDs**:
   - **iOS**: Bundle ID = `com.rhoodapp.mobile`
   - **Android**: Package = `com.rhoodapp.mobile` + SHA-1 fingerprint
   - **Web**: For Supabase integration

### Step 3: Configure Environment Variables

Create/update `.env`:

```env
GOOGLE_WEB_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=987654321-ghijkl.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=456789123-mnopqr.apps.googleusercontent.com
```

### Step 4: Update app.json

Add to your `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "@react-native-google-signin/google-signin",
        {
          "iosUrlScheme": "com.googleusercontent.apps.987654321-ghijkl"
        }
      ]
    ]
  }
}
```

**Important**: Replace `987654321-ghijkl` with your actual iOS Client ID (reversed format).

### Step 5: Build & Test

```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

## ✅ What's Already Done

The code implementation is complete! The app will:
- ✅ Try native Google Sign-In first
- ✅ Fallback to web-based OAuth if native fails
- ✅ Work in both Expo Go (web) and development builds (native)
- ✅ Handle errors gracefully
- ✅ Create user profiles automatically

## 🔧 Get SHA-1 Fingerprint (Android)

```bash
# Debug keystore (for development)
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Look for "SHA1:" in the output
```

## 🧪 Testing

1. Build the app with native modules
2. Open the app on a device/simulator
3. Go to Login screen
4. Tap "Continue with Google"
5. Should see native Google account picker (no browser!)

## 🐛 Troubleshooting

### iOS: "No valid client ID"
- Check iOS Client ID in `.env`
- Verify Bundle ID is `com.rhoodapp.mobile`
- Rebuild with `npx expo run:ios`

### Android: "DEVELOPER_ERROR"
- Check SHA-1 fingerprint is correct
- Verify package name is `com.rhoodapp.mobile`
- Rebuild with `npx expo run:android`

### Falls back to web browser
- This is normal in Expo Go
- Build a development client to use native sign-in
- Native sign-in only works in custom builds

## 📚 Full Documentation

See `docs/NATIVE_GOOGLE_SIGNIN_SETUP.md` for complete setup instructions.

## 🎯 Key Benefits

- **Better UX**: No browser popup
- **Faster**: Native authentication flow
- **One-tap**: Uses saved Google accounts
- **Reliable**: Automatic fallback to web OAuth
- **Cross-platform**: Works on iOS and Android

## 💡 How It Works

```
User taps "Continue with Google"
    ↓
Try Native Google Sign-In
    ↓
Success? → Use native flow
    ↓
Failed? → Fallback to web OAuth
    ↓
Authenticate with Supabase
    ↓
Create/update user profile
    ↓
User signed in!
```

## 🔗 Resources

- [Google Cloud Console](https://console.cloud.google.com/)
- [React Native Google Sign-In Docs](https://github.com/react-native-google-signin/google-signin)
- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
