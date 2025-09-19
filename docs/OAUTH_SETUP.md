# OAuth Setup Guide for R/HOOD App

This guide will help you set up Google and Apple OAuth authentication for the R/HOOD app.

## Prerequisites

- Supabase project (already configured)
- Google Cloud Console account
- Apple Developer account

## 1. Google OAuth Setup

### Step 1: Create Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Create credentials for:
   - **iOS**: Bundle ID: `com.rhoodapp.mobile`
   - **Android**: Package name: `com.rhoodapp.mobile`
   - **Web**: For development

### Step 2: Configure Supabase

1. Go to your Supabase project dashboard
2. Navigate to Authentication → Providers
3. Enable Google provider
4. Add your Google OAuth credentials:
   - **Client ID**: From Google Cloud Console
   - **Client Secret**: From Google Cloud Console
5. Set redirect URL: `https://jsmcduecuxtaqizhmiqo.supabase.co/auth/v1/callback`

### Step 3: Configure Redirect URLs

Add these URLs to your Google OAuth configuration:

- `https://jsmcduecuxtaqizhmiqo.supabase.co/auth/v1/callback`
- `rhoodapp://auth/callback`

## 2. Apple OAuth Setup

### Step 1: Configure Apple Sign In

1. Go to [Apple Developer Console](https://developer.apple.com/)
2. Navigate to "Certificates, Identifiers & Profiles"
3. Select your App ID (`com.rhoodapp.mobile`)
4. Enable "Sign In with Apple" capability
5. Create a Service ID for web authentication

### Step 2: Configure Supabase

1. In Supabase dashboard → Authentication → Providers
2. Enable Apple provider
3. Add your Apple credentials:
   - **Client ID**: Your Service ID
   - **Client Secret**: Generated JWT token
4. Set redirect URL: `https://jsmcduecuxtaqizhmiqo.supabase.co/auth/v1/callback`

### Step 3: Generate Apple Client Secret

You'll need to generate a JWT token for Apple. Use this script:

```bash
# Install jwt-cli
npm install -g jwt-cli

# Generate the secret (replace with your actual values)
jwt encode \
  --secret "YOUR_APPLE_PRIVATE_KEY" \
  --iss "YOUR_TEAM_ID" \
  --sub "YOUR_SERVICE_ID" \
  --aud "https://appleid.apple.com" \
  --exp "+1y"
```

## 3. App Configuration

The app is already configured with:

- OAuth dependencies installed
- URL scheme: `rhoodapp://`
- Redirect handling in `lib/supabase.js`
- UI components in `components/LoginScreen.js`

## 4. Testing

1. Run the app: `npx expo run:ios`
2. Tap "Sign in with Google" or "Sign in with Apple"
3. Complete the OAuth flow
4. Verify user is signed in

## 5. Troubleshooting

### Common Issues:

1. **"Invalid redirect URL"**

   - Ensure redirect URLs are properly configured in OAuth providers
   - Check that the scheme `rhoodapp://` is registered

2. **"OAuth flow was cancelled"**

   - User cancelled the authentication
   - Check browser permissions

3. **"Invalid client"**
   - Verify OAuth credentials are correct
   - Check bundle ID/package name matches

### Debug Steps:

1. Check Supabase logs in the dashboard
2. Verify OAuth provider configuration
3. Test redirect URLs manually
4. Check app bundle ID matches OAuth configuration

## 6. Production Considerations

- Use production OAuth credentials
- Configure proper redirect URLs for production
- Test on physical devices
- Consider implementing deep linking for better UX

## Support

If you encounter issues:

1. Check Supabase documentation
2. Verify OAuth provider settings
3. Test with a simple OAuth flow first
4. Check app logs for specific error messages
