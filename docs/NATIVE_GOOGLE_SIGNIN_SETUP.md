# Native Google Sign-In Setup Guide

This guide will help you set up native Google Sign-In (no browser popup) for the R/HOOD app.

## Overview

Native Google Sign-In provides a better user experience by:
- Using the native Google Sign-In SDK
- No browser popup required
- Faster authentication flow
- Better iOS/Android integration
- One-tap sign-in with saved Google accounts

## Prerequisites

- Expo development build (native Google Sign-In requires custom native code)
- Google Cloud Console project
- iOS Bundle ID: `com.rhoodapp.mobile`
- Android Package Name: `com.rhoodapp.mobile`

## Step 1: Install Required Packages

```bash
# Install the Google Sign-In package
npx expo install @react-native-google-signin/google-signin

# Install Expo development client (if not already installed)
npx expo install expo-dev-client
```

## Step 2: Configure Google Cloud Console

### Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project or create a new one
3. Enable these APIs:
   - Google+ API
   - Google Identity Services API
   - Google Sign-In API

### Create iOS OAuth Client ID

1. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
2. Select **iOS** as application type
3. Enter:
   - **Name**: R/HOOD iOS
   - **Bundle ID**: `com.rhoodapp.mobile`
4. Click **Create**
5. **Save the iOS Client ID** (you'll need this)

### Create Android OAuth Client ID

1. Get your SHA-1 certificate fingerprint:

```bash
# For development (debug keystore)
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# For production (your release keystore)
keytool -list -v -keystore /path/to/your/release.keystore -alias your-key-alias
```

2. Create OAuth Client ID:
   - Select **Android** as application type
   - Enter:
     - **Name**: R/HOOD Android
     - **Package name**: `com.rhoodapp.mobile`
     - **SHA-1 certificate fingerprint**: (from above)
3. Click **Create**
4. **Save the Android Client ID** (you'll need this)

### Create Web OAuth Client ID (for Supabase)

1. Create another OAuth Client ID
2. Select **Web application**
3. Add authorized redirect URI:
   - `https://jsmcduecuxtaqizhmiqo.supabase.co/auth/v1/callback`
4. **Save the Web Client ID and Secret** (for Supabase)

## Step 3: Configure Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Enable **Google** provider
4. Enter:
   - **Client ID**: Your Web OAuth Client ID
   - **Client Secret**: Your Web OAuth Client Secret
5. Click **Save**

## Step 4: Configure app.json

Add the Google Sign-In configuration to your `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "@react-native-google-signin/google-signin",
        {
          "iosUrlScheme": "com.googleusercontent.apps.YOUR_IOS_CLIENT_ID_REVERSED"
        }
      ]
    ],
    "ios": {
      "bundleIdentifier": "com.rhoodapp.mobile",
      "googleServicesFile": "./GoogleService-Info.plist"
    },
    "android": {
      "package": "com.rhoodapp.mobile",
      "googleServicesFile": "./google-services.json"
    }
  }
}
```

**Note**: Replace `YOUR_IOS_CLIENT_ID_REVERSED` with your iOS Client ID in reverse format.
Example: If your iOS Client ID is `123456789-abcdef.apps.googleusercontent.com`, 
the reversed scheme is `com.googleusercontent.apps.123456789-abcdef`

## Step 5: Download Configuration Files (Optional but Recommended)

### For iOS (GoogleService-Info.plist)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Add your app or select existing project
3. Add iOS app with Bundle ID: `com.rhoodapp.mobile`
4. Download `GoogleService-Info.plist`
5. Place it in your project root

### For Android (google-services.json)

1. In Firebase Console, add Android app
2. Package name: `com.rhoodapp.mobile`
3. Add your SHA-1 fingerprint
4. Download `google-services.json`
5. Place it in your project root

## Step 6: Update Environment Variables

Create or update `.env` file:

```env
# Google OAuth Client IDs
GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
```

## Step 7: Build Development Client

Native modules require a custom development build:

```bash
# For iOS
npx expo run:ios

# For Android
npx expo run:android

# Or build with EAS
eas build --profile development --platform ios
eas build --profile development --platform android
```

## Step 8: Test the Implementation

1. Install the development build on your device
2. Open the app
3. Navigate to Login/Signup screen
4. Tap "Continue with Google"
5. Select your Google account
6. Verify successful authentication

## Troubleshooting

### iOS Issues

**Error: "No valid client ID found"**
- Verify iOS Client ID is correct in configuration
- Check Bundle ID matches exactly: `com.rhoodapp.mobile`
- Ensure URL scheme is properly configured

**Error: "The operation couldn't be completed"**
- Rebuild the app with `npx expo run:ios`
- Clear Xcode derived data
- Verify GoogleService-Info.plist is included

### Android Issues

**Error: "DEVELOPER_ERROR"**
- Verify SHA-1 fingerprint is correct
- Check package name matches: `com.rhoodapp.mobile`
- Ensure google-services.json is in the correct location

**Error: "Sign in failed"**
- Rebuild the app with `npx expo run:android`
- Verify Android Client ID in Google Cloud Console
- Check that Google Sign-In API is enabled

### General Issues

**Error: "Configuration required"**
- Ensure all OAuth Client IDs are created
- Verify Supabase Google provider is enabled
- Check that all credentials are correctly entered

**Error: "Network error"**
- Check internet connection
- Verify Supabase URL is accessible
- Ensure Google APIs are enabled

## Migration from Web-Based OAuth

If you're migrating from the current web-based implementation:

1. Keep the existing `signInWithGoogle()` as a fallback
2. Add the new native implementation as `signInWithGoogleNative()`
3. Try native first, fallback to web if it fails
4. This ensures compatibility across all platforms

## Next Steps

After setup:
1. Test on both iOS and Android devices
2. Test with multiple Google accounts
3. Verify user data is correctly saved to Supabase
4. Test sign-out and re-authentication flows
5. Submit for TestFlight/Play Store testing

## Resources

- [Google Sign-In Documentation](https://developers.google.com/identity/sign-in/ios)
- [React Native Google Sign-In](https://github.com/react-native-google-signin/google-signin)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Expo Development Builds](https://docs.expo.dev/develop/development-builds/introduction/)
