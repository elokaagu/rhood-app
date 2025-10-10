# Google Sign-In Setup Guide (Simple OAuth)

This is a clean, simple Google Sign-In implementation using Supabase OAuth.

## ✅ What's Implemented

- **OAuth-based Google Sign-In** (no native modules)
- **Works in Expo Go** (no development build needed)
- **Simple token extraction** from callback URL
- **Minimal complexity** (just ~80 lines of code)

## 📋 Setup Steps

### 1. Google Cloud Console

You should already have OAuth credentials set up. If not:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create one)
3. Navigate to **APIs & Services** → **Credentials**
4. Create **OAuth 2.0 Client ID** (Web application type)
5. Add these **Authorized redirect URIs**:
   ```
   https://jsmcduecuxtaqizhmiqo.supabase.co/auth/v1/callback
   ```

**Current Credentials:**
- Web Client ID: `668336115926-vm1sb48m9q6cfg3he33t4f074e28s49m.apps.googleusercontent.com`
- Client Secret: (stored in Supabase)

### 2. Supabase Configuration

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to **Authentication** → **Providers**
3. Find **Google** and click **Edit**
4. Enable the provider
5. Add your credentials:
   - **Client ID**: Your Web Client ID from Google
   - **Client Secret**: Your Web Client Secret from Google
6. Add these **Redirect URLs**:
   ```
   rhoodapp://auth/callback
   rhoodapp://*
   exp://localhost:8081
   ```

### 3. Test the Implementation

1. Open your app in Expo Go
2. Tap "Continue with Google"
3. Complete sign-in in the browser
4. Should redirect back to the app
5. Check logs for success messages

## 🔍 How It Works

1. **User taps "Continue with Google"**
2. **App calls `auth.signInWithGoogle()`**
3. **Supabase generates OAuth URL**
4. **Browser opens for authentication**
5. **User signs in with Google**
6. **Google redirects to Supabase with code**
7. **Supabase exchanges code for tokens**
8. **Supabase redirects to `rhoodapp://auth/callback` with tokens**
9. **App extracts tokens from URL**
10. **App creates session with `setSession()`**
11. **User is signed in!**

## 📝 Logs to Watch For

```
🔐 Starting Google Sign-In...
🔗 Redirect URL: rhoodapp://auth/callback
✅ OAuth URL created
🌐 Browser result type: success
✅ OAuth flow successful
✅ Session created for: user@example.com
```

## ❌ Troubleshooting

### "Unsupported provider" error
- Make sure Google provider is enabled in Supabase
- Check that Client ID and Secret are set

### "No access token received" error
- Check Supabase redirect URLs include `rhoodapp://auth/callback`
- Check Google Console authorized redirect URIs

### "Sign-in was cancelled" error
- User closed the browser before completing sign-in
- Normal behavior, just try again

## 🎯 Next Steps

After successful sign-in, the app will:
1. Check if user profile exists
2. If yes → Go to Opportunities screen
3. If no → Show onboarding form

The profile checking logic is handled in `App.js` via the `handleLoginSuccess` function.

