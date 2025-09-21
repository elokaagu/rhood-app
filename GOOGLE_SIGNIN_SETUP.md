# Google Sign-In Setup Guide for R/HOOD App

## Current Implementation Status ✅

Your app already has Google Sign-In implemented with:

- ✅ Supabase OAuth integration
- ✅ Expo AuthSession setup
- ✅ Proper URL scheme configuration (`rhoodapp://auth/callback`)
- ✅ Error handling in LoginScreen and SignupScreen

## Required Setup Steps

### 1. Google Cloud Console Configuration

#### Step 1: Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API and Google Identity API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Create credentials for:
   - **Web application** (for Supabase)
   - **iOS** (Bundle ID: `com.rhoodapp.mobile`)
   - **Android** (Package name: `com.rhoodapp.mobile`)

#### Step 2: Configure Authorized Redirect URIs

Add these URLs to your Google OAuth configuration:

**Web Application:**

- `https://jsmcduecuxtaqizhmiqo.supabase.co/auth/v1/callback`

**iOS:**

- `com.rhoodapp.mobile://auth/callback`

**Android:**

- `com.rhoodapp.mobile://auth/callback`

### 2. Supabase Configuration

#### Step 1: Enable Google Provider

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Enable **Google** provider
4. Add your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console (Web application)
   - **Client Secret**: From Google Cloud Console (Web application)

#### Step 2: Configure Site URL

Set your Site URL to: `https://jsmcduecuxtaqizhmiqo.supabase.co`

### 3. Test the Implementation

Your Google Sign-In should work with the current code. Test it by:

1. Running the app: `npm run start`
2. Going to Login or Signup screen
3. Tapping "Continue with Google"
4. Completing the OAuth flow

### 4. Debugging Common Issues

#### Issue: "OAuth flow was cancelled or failed"

- Check that redirect URLs are properly configured
- Verify Google OAuth credentials are correct
- Ensure Supabase Google provider is enabled

#### Issue: "Configuration Required"

- Verify Google Cloud Console setup
- Check Supabase provider configuration
- Ensure proper bundle identifier

## Current Code Implementation

Your app uses this flow:

1. User taps "Continue with Google"
2. `auth.signInWithGoogle()` is called
3. Expo AuthSession opens Google OAuth
4. User completes authentication
5. Supabase handles the callback
6. User session is established

## Testing Commands

```bash
# Start the development server
npm run start

# For iOS simulator
npm run ios

# For Android emulator
npm run android
```

## Next Steps

1. **Configure Google Cloud Console** (if not done)
2. **Enable Google provider in Supabase** (if not done)
3. **Test the sign-in flow**
4. **Check console logs for any errors**

The implementation is ready - you just need to complete the OAuth configuration!
