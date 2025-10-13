# 🍎 Apple Sign-In Implementation Guide

## 📋 Overview

This document explains how Apple Sign-In is implemented in the R/HOOD app using native `expo-apple-authentication` with Supabase's `signInWithIdToken` method.

---

## 🏗️ Architecture

### Implementation Location

- **File**: `lib/supabase.js`
- **Function**: `signInWithApple()`
- **Method**: Native implementation using `AppleAuthentication.signInAsync()` + `supabase.auth.signInWithIdToken()`

### Why This Approach?

- ✅ **Native Experience**: Uses iOS native Apple Sign-In UI
- ✅ **No Browser**: No web browser popup required
- ✅ **Secure**: Uses nonce-based verification
- ✅ **Production Ready**: Clean, minimal implementation
- ✅ **Works in TestFlight**: Requires production builds

---

## 🔐 How It Works

### The Nonce Flow

Apple Sign-In uses a **nonce** (number used once) to prevent replay attacks. Here's the complete flow:

```javascript
// 1. Generate raw nonce (32 bytes → 64-char hex string)
const bytes = await Crypto.getRandomBytesAsync(32);
const rawNonce = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
  ""
);

// 2. Hash the raw nonce (SHA256 → base64url)
const base64Hash = await Crypto.digestStringAsync(
  Crypto.CryptoDigestAlgorithm.SHA256,
  rawNonce,
  { encoding: Crypto.CryptoEncoding.BASE64 }
);
const hashedNonce = base64Hash
  .replace(/\+/g, "-")
  .replace(/\//g, "_")
  .replace(/=+$/g, "");

// 3. Send HASHED nonce to Apple
const credential = await AppleAuthentication.signInAsync({
  requestedScopes: [
    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    AppleAuthentication.AppleAuthenticationScope.EMAIL,
  ],
  nonce: hashedNonce, // ← HASHED
});

// 4. Send RAW nonce to Supabase
const { data, error } = await supabase.auth.signInWithIdToken({
  provider: "apple",
  token: credential.identityToken,
  nonce: rawNonce, // ← RAW
});
```

### Why Two Different Nonces?

- **Apple receives**: `hashedNonce` (SHA256 hash of raw nonce, base64url encoded)
- **Supabase receives**: `rawNonce` (original hex string)
- **Supabase verifies**: It hashes the raw nonce and compares it to the nonce in Apple's ID token

This prevents man-in-the-middle attacks and ensures the token is fresh.

---

## 🛠️ Configuration

### App Configuration (`app.json`)

```json
{
  "ios": {
    "bundleIdentifier": "com.rhoodapp.mobile",
    "usesAppleSignIn": true,
    "infoPlist": {
      "NSUserTrackingUsageDescription": "..."
    }
  }
}
```

### Supabase Configuration

1. **Enable Apple Provider**:

   - Go to: Supabase Dashboard → Authentication → Providers
   - Find "Apple" and toggle it **ON**

2. **For Native Sign-In**: No additional configuration needed!

   - Services ID, Team ID, Key ID, Secret Key are **not required** for `signInWithIdToken`
   - These are only needed for web-based OAuth flows

3. **Bundle ID Must Match**:
   - Apple Developer Console: `com.rhoodapp.mobile`
   - app.json: `"bundleIdentifier": "com.rhoodapp.mobile"`
   - Supabase: Will validate against this bundle ID

---

## 📱 Implementation Details

### Complete Function

```javascript
async signInWithApple() {
  // One-attempt guard to prevent double taps
  if (this._signingInWithApple) {
    console.log("⚠️ Apple Sign-In already in progress");
    return;
  }

  this._signingInWithApple = true;

  try {
    // Check if Apple Sign-In is available
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      throw new Error("Apple Sign-In is not available on this device");
    }

    console.log("🍎 Starting Apple Sign-In...");

    // 1. Generate raw nonce: 32 random bytes → 64-char hex string
    const bytes = await Crypto.getRandomBytesAsync(32);
    const rawNonce = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

    // 2. Hash the raw nonce: SHA256 → base64url
    const base64Hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );
    const hashedNonce = base64Hash
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");

    console.log("🔐 Nonce generated:", rawNonce.length, "chars");

    // 3. Request Apple Sign-In with hashed nonce
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce, // Send HASHED nonce to Apple
    });

    if (!credential.identityToken) {
      throw new Error("No identity token received from Apple");
    }

    console.log("✅ Apple credential received");

    // 4. Send to Supabase with raw nonce
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
      nonce: rawNonce, // Send RAW nonce to Supabase
    });

    if (error) {
      console.error("❌ Supabase error:", error);
      throw error;
    }

    console.log("✅ Apple Sign-In successful:", data.user?.email);
    return data;
  } catch (error) {
    console.error("❌ Apple Sign-In error:", error);
    throw error;
  } finally {
    this._signingInWithApple = false;
  }
}
```

### Key Features

1. **Double-Tap Prevention**: `_signingInWithApple` flag prevents multiple concurrent sign-in attempts
2. **Availability Check**: Verifies Apple Sign-In is available on the device
3. **Clean Error Handling**: Simple try/catch with proper cleanup in `finally`
4. **Minimal Logging**: Only essential logs for debugging

---

## 🧪 Testing

### Where It Works

✅ **Works:**

- Physical iOS devices (iOS 13+)
- TestFlight builds
- Production builds (EAS/App Store)

❌ **Doesn't Work:**

- iOS Simulator (Apple limitation)
- Expo Go (requires native build)
- Android devices (Apple Sign-In is iOS-only)
- Development mode (requires production/TestFlight build)

### Testing Checklist

- [ ] Testing on physical iOS device (iOS 13+)
- [ ] Using TestFlight or production build
- [ ] Apple provider enabled in Supabase
- [ ] Bundle ID matches in all places
- [ ] Device has Apple ID signed in

### Expected Console Output

```javascript
🍎 Starting Apple Sign-In...
🔐 Nonce generated: 64 chars
✅ Apple credential received
✅ Apple Sign-In successful: user@example.com
```

### Common Errors

```javascript
// Error 1: Not available
"Apple Sign-In is not available on this device"
→ Using simulator or Android device
→ Fix: Test on physical iOS device

// Error 2: Supabase rejection
"❌ Supabase error: Nonces mismatch"
→ Nonce implementation issue
→ Fix: Ensure using the clean implementation above

// Error 3: No token
"No identity token received from Apple"
→ User cancelled or Apple auth failed
→ Fix: Retry sign-in
```

---

## 🔒 Security

### Nonce Security

- **Random**: Generated using `Crypto.getRandomBytesAsync(32)` (cryptographically secure)
- **One-Time Use**: Fresh nonce for every sign-in attempt
- **Hashed**: Apple receives SHA256 hash, preventing raw nonce exposure
- **Verified**: Supabase validates the nonce matches Apple's token

### Token Validation

Supabase automatically validates:

- ✅ Token signature (signed by Apple)
- ✅ Issuer (`iss`) is `https://appleid.apple.com`
- ✅ Audience (`aud`) is `com.rhoodapp.mobile`
- ✅ Nonce matches (SHA256 of raw nonce)
- ✅ Token hasn't expired

---

## 📚 Dependencies

```json
{
  "expo-apple-authentication": "^8.0.7",
  "expo-crypto": "^15.0.7",
  "@supabase/supabase-js": "^2.x.x"
}
```

---

## 🐛 Troubleshooting

### Issue: "Nonces mismatch"

**Causes:**

1. Using different raw nonce for Apple and Supabase
2. Not hashing the nonce correctly for Apple
3. Encoding issues (base64 vs base64url)

**Solution:**

- Ensure using the clean implementation above
- Always send **hashed** nonce to Apple, **raw** nonce to Supabase
- Use proper base64url encoding (replace `+` with `-`, `/` with `_`, remove `=`)

### Issue: Works in development, fails in production

**Cause:** React Native production optimizations

**Solution:**

- Our implementation uses minimal state
- No refs or complex state management
- Clean async/await flow
- Should work identically in dev and prod

### Issue: "Unable to exchange external code"

**Cause:** Apple provider not enabled in Supabase

**Solution:**

1. Go to Supabase Dashboard
2. Authentication → Providers
3. Enable Apple provider
4. No additional configuration needed for native sign-in

---

## 🎯 Best Practices

### ✅ Do:

- Use native `AppleAuthentication.signInAsync()`
- Generate fresh nonce for each attempt
- Send hashed nonce to Apple, raw nonce to Supabase
- Test on physical iOS devices
- Handle errors gracefully
- Prevent double-tap with guard flag

### ❌ Don't:

- Use web-based OAuth in native apps
- Reuse nonces across sign-in attempts
- Send the same nonce to both Apple and Supabase
- Test in simulator (won't work)
- Add complex debugging in production code
- Skip availability check

---

## 📖 Resources

- [Expo Apple Authentication](https://docs.expo.dev/versions/latest/sdk/apple-authentication/)
- [Supabase Apple Sign-In](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Apple Developer - Sign in with Apple](https://developer.apple.com/sign-in-with-apple/)
- [Supabase signInWithIdToken](https://supabase.com/docs/reference/javascript/auth-signinwithidtoken)

---

## 🔄 Version History

### v2.0 (Current) - Clean Implementation

- Removed all debugging code
- Production-ready implementation
- Minimal logging
- ~70 lines of clean code

### v1.0 (Deprecated) - Debug Version

- Extensive debugging
- JWT validation
- REST API fallback
- ~250 lines of code

---

## 💡 Key Takeaways

1. **Nonce is critical**: Always use fresh, properly hashed nonces
2. **Native is better**: Use `signInWithIdToken` for native apps
3. **Test on device**: Simulator won't work
4. **Simple is better**: Clean implementation = fewer bugs
5. **Supabase handles validation**: Trust the platform

---

_Last Updated: 2025-10-13_
_Implementation: lib/supabase.js - signInWithApple()_
