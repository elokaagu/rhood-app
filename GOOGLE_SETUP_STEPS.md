# Google Sign-In Setup Steps for R/HOOD

## ✅ What's Already Done

- ✅ Web Client ID configured: `668336115926-alpe1knq41ba8rt76tlda9eb2kocllif.apps.googleusercontent.com`
- ✅ `.env` file created with your Web Client ID
- ✅ `app.json` updated with Google Sign-In plugin
- ✅ Code implementation complete

## 📋 What You Need to Do Next

### Step 1: Install the Google Sign-In Package

```bash
npx expo install @react-native-google-signin/google-signin
```

### Step 2: Create iOS OAuth Client ID

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (the one with the Web Client ID above)
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth 2.0 Client ID**
5. Select **iOS** as application type
6. Enter these details:
   - **Name**: R/HOOD iOS
   - **Bundle ID**: `com.rhoodapp.mobile`
7. Click **Create**
8. **Copy the iOS Client ID** (format: `XXXXXX-XXXXX.apps.googleusercontent.com`)

### Step 3: Create Android OAuth Client ID

First, get your SHA-1 fingerprint:

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Look for the line that says `SHA1:` and copy that value.

Then:
1. Go back to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **Create Credentials** → **OAuth 2.0 Client ID**
3. Select **Android** as application type
4. Enter these details:
   - **Name**: R/HOOD Android
   - **Package name**: `com.rhoodapp.mobile`
   - **SHA-1 certificate fingerprint**: (paste the SHA-1 from above)
5. Click **Create**
6. **Copy the Android Client ID**

### Step 4: Update .env File

Open the `.env` file in your project root and update it with your iOS and Android Client IDs:

```env
GOOGLE_WEB_CLIENT_ID=668336115926-alpe1knq41ba8rt76tlda9eb2kocllif.apps.googleusercontent.com
GOOGLE_IOS_CLIENT_ID=YOUR_IOS_CLIENT_ID_HERE.apps.googleusercontent.com
GOOGLE_ANDROID_CLIENT_ID=YOUR_ANDROID_CLIENT_ID_HERE.apps.googleusercontent.com
```

### Step 5: Update app.json with iOS URL Scheme

After you get your iOS Client ID, you need to add it to `app.json` in reverse format.

**Example:**
- If your iOS Client ID is: `123456789-abc.apps.googleusercontent.com`
- The reversed URL scheme is: `com.googleusercontent.apps.123456789-abc`

Add this to the `CFBundleURLTypes` array in `app.json` (under `ios.infoPlist`):

```json
{
  "CFBundleURLName": "google",
  "CFBundleURLSchemes": ["com.googleusercontent.apps.YOUR_IOS_CLIENT_ID_REVERSED"]
}
```

Your `app.json` iOS section should look like:

```json
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.rhoodapp.mobile",
  "newArchEnabled": true,
  "usesAppleSignIn": true,
  "infoPlist": {
    "ITSAppUsesNonExemptEncryption": false,
    "UIBackgroundModes": ["audio"],
    "CFBundleURLTypes": [
      {
        "CFBundleURLName": "rhoodapp",
        "CFBundleURLSchemes": ["rhoodapp"]
      },
      {
        "CFBundleURLName": "google",
        "CFBundleURLSchemes": ["com.googleusercontent.apps.YOUR_IOS_CLIENT_ID_REVERSED"]
      }
    ]
  }
}
```

### Step 6: Configure Supabase (If Not Already Done)

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Authentication** → **Providers**
3. Enable **Google** provider
4. Enter your credentials:
   - **Client ID**: `668336115926-alpe1knq41ba8rt76tlda9eb2kocllif.apps.googleusercontent.com`
   - **Client Secret**: (Get this from Google Cloud Console under your Web OAuth Client)
5. Add authorized redirect URL:
   - `https://jsmcduecuxtaqizhmiqo.supabase.co/auth/v1/callback`
6. Click **Save**

### Step 7: Build Development Client

Now build a custom development client (required for native Google Sign-In):

```bash
# For iOS (Mac only)
npx expo run:ios

# For Android
npx expo run:android
```

This will:
- Install dependencies
- Build the native modules
- Install the app on your device/simulator
- Start the development server

### Step 8: Test Native Google Sign-In

1. Open the app on your device/simulator
2. Navigate to the Login screen
3. Tap **"Continue with Google"**
4. You should see the **native Google account picker** (no browser!)
5. Select your account
6. You should be signed in instantly! ✨

## 🔍 Verification

Check the console logs:
- ✅ **Native working**: `"📱 Attempting native Google Sign-In..."`
- ✅ **Success**: `"✅ Google Sign-In successful: your-email@gmail.com"`
- ⚠️ **Fallback**: `"🔄 Falling back to web-based OAuth..."` (means you're in Expo Go)

## 🐛 Troubleshooting

### iOS: "No valid client ID found"
- Double-check your iOS Client ID in `.env`
- Verify the URL scheme in `app.json` is correctly reversed
- Rebuild: `npx expo run:ios`

### Android: "DEVELOPER_ERROR"
- Verify SHA-1 fingerprint is correct
- Check package name is exactly `com.rhoodapp.mobile`
- Rebuild: `npx expo run:android`

### Still seeing browser popup
- Make sure you're running the **development build**, not Expo Go
- Check that `@react-native-google-signin/google-signin` is installed
- Verify `.env` file has all three Client IDs

## 📝 Quick Checklist

- [ ] Install package: `npx expo install @react-native-google-signin/google-signin`
- [ ] Create iOS OAuth Client ID in Google Cloud Console
- [ ] Create Android OAuth Client ID in Google Cloud Console
- [ ] Update `.env` with iOS and Android Client IDs
- [ ] Update `app.json` with iOS URL scheme (reversed Client ID)
- [ ] Configure Google provider in Supabase (if not done)
- [ ] Build development client: `npx expo run:ios` or `npx expo run:android`
- [ ] Test native Google Sign-In

## 🎯 Expected Result

After completing these steps:
- ✅ Native Google account picker appears (no browser)
- ✅ One-tap sign-in with saved accounts
- ✅ Instant authentication
- ✅ Seamless user experience

## 📞 Need Help?

If you get stuck:
1. Check the console logs for detailed error messages
2. Verify all Client IDs are correct
3. Make sure you're running a development build, not Expo Go
4. See `docs/NATIVE_GOOGLE_SIGNIN_SETUP.md` for more details

Good luck! 🚀
