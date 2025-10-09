# 🍎 Apple Sign-In Debug Guide

## 🎯 Current Status

Your R/HOOD app has **NATIVE Apple Sign-In** implemented using `expo-apple-authentication`. This is the recommended approach!

## ✅ What's Already Configured

### In Your App (`app.json`):
- ✅ `bundleIdentifier`: `com.rhoodapp.mobile`
- ✅ `usesAppleSignIn`: `true`
- ✅ URL Scheme: `rhoodapp://`
- ✅ Native implementation in `lib/supabase.js` (lines 268-318)

### How It Works:
1. **Native Flow** (iOS device/TestFlight): Uses `AppleAuthentication.signInAsync()` → `signInWithIdToken()`
2. **Web Fallback** (Expo Go/Simulator): Uses browser OAuth → `signInWithAppleWeb()`

---

## 🐛 The Error You're Seeing

**Error**: "Unable to exchange external code for a Supabase session"

**What It Means**: 
- Apple Sign-In is working on your app side ✅
- But Supabase can't verify the Apple token ❌
- This happens when the Apple provider isn't properly enabled in Supabase

---

## 🔧 How to Fix

### Step 1: Enable Apple Provider in Supabase

1. Go to your Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/jsmcduecuxtaqizhmiqo/auth/providers
   ```

2. Find "Apple" in the list of providers

3. Click to expand it

4. **Toggle "Enable Sign in with Apple" to ON**

5. **For Native Sign-In**: You don't need to fill in Services ID, Team ID, Key ID, or Secret Key!
   - These are only required for web-based OAuth
   - Native `signInWithIdToken` works without them

6. Click "Save"

### Step 2: Verify Redirect URLs (Optional, for web fallback)

If you also want the web fallback to work (for testing in Expo Go), add these to Supabase:

1. Go to: Authentication → URL Configuration → Redirect URLs
2. Add:
   - `rhoodapp://auth/callback`
   - `rhoodapp://*`
   - `exp://localhost:8081` (for Expo Go)

---

## 🧪 Testing

### Test on iOS Device (Recommended):
1. Install via TestFlight
2. Tap "Sign in with Apple"
3. Should show native Apple Sign-In prompt
4. No browser popup
5. Works instantly

### Test in Expo Go (Uses web fallback):
1. Start with `npx expo start`
2. Tap "Sign in with Apple"
3. Opens browser for OAuth
4. Requires full Supabase configuration (Services ID, etc.)

---

## 📋 Troubleshooting Checklist

- [ ] Apple provider is **enabled** in Supabase
- [ ] Testing on an **iOS device** or TestFlight (not simulator)
- [ ] App has `usesAppleSignIn: true` in `app.json`
- [ ] Bundle ID matches: `com.rhoodapp.mobile`
- [ ] App is a **development build** or **production build** (not Expo Go)

---

## 🆘 Common Issues

### Issue 1: "Apple Sign-In is not available on this device"
**Cause**: Testing on Android or simulator without Apple Sign-In capability
**Fix**: Test on a real iOS device

### Issue 2: "Unable to exchange external code"
**Cause**: Apple provider not enabled in Supabase
**Fix**: Enable the Apple provider in Supabase (Step 1 above)

### Issue 3: Browser opens with "localhost" error
**Cause**: Web fallback triggered, but redirect URL not configured
**Fix**: 
- Either: Add redirect URLs to Supabase (Step 2 above)
- Or: Use a development build instead of Expo Go for native sign-in

---

## 🎯 Recommended Setup

**For Production (Best User Experience):**
1. ✅ Enable Apple provider in Supabase (toggle only, no keys needed)
2. ✅ Use native Apple Sign-In (already implemented in your app)
3. ✅ Build with EAS or `expo run:ios` (not Expo Go)
4. ✅ Test on real iOS device or TestFlight

**Current Implementation:**
- Your app already has native Apple Sign-In ✅
- Just needs Supabase provider enabled ✅

---

## 📞 Next Steps

1. **Enable Apple provider in Supabase** (5 seconds)
2. **Test in TestFlight** on iOS device
3. **Report back** if you see any errors

That's it! Native Apple Sign-In should work perfectly after Step 1.

---

## 🔍 Debug Logs

If you're still having issues, check your console logs for:

```javascript
🍎 Attempting native Apple Sign-In...
🔐 Generated nonce: [nonce]
✅ Apple credential received: true
✅ Native Apple Sign-In successful: [email]
```

If you see:
```javascript
❌ Supabase Apple auth error: [error]
```

Then the issue is with Supabase configuration, not your app.

---

## 📚 Resources

- [Expo Apple Authentication Docs](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Supabase Apple Sign-In Docs](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Apple Developer - Sign in with Apple](https://developer.apple.com/sign-in-with-apple/)

