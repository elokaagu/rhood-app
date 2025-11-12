# 🍎 Apple Sign-In Implementation Guide

## 📋 Overview

This document explains how Apple Sign-In is implemented in the R/HOOD app using a native-first `expo-apple-authentication` flow with an automatic Supabase OAuth fallback, both powered by `signInWithIdToken`.

---

## 🏗️ Architecture

### Implementation Location

- **File**: `lib/supabase.js`
- **Function**: `signInWithApple()`
- **Method**: Native implementation using `AppleAuthentication.signInAsync()` + `supabase.auth.signInWithIdToken()`

### Why This Approach?

- ✅ **Native Experience First**: Prioritises iOS native Apple Sign-In UI for the best UX
- ✅ **Automatic Fallback**: Seamlessly falls back to Supabase OAuth when native sign-in is unavailable (simulator, Expo Go)
- ✅ **Secure**: Uses nonce-based verification handled entirely by Supabase
- ✅ **Production Ready**: Minimal logging, no debug prompts, no hard-coded secrets
- ✅ **TestFlight & Development Friendly**: Works in production builds and continues to function during local Expo testing

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

2. **Configuration Requirements**:

   - **Native flow** (`signInWithIdToken`): Services ID, Team ID, Key ID, and Secret Key are optional; Supabase validates against the bundle ID
   - **OAuth fallback** (`signInWithOAuth`): Requires the full Apple Services ID + Auth Key configuration so that Supabase can initiate the hosted web flow

3. **Bundle ID Must Match**:
   - Apple Developer Console: `com.rhoodapp.mobile`
   - app.json: `"bundleIdentifier": "com.rhoodapp.mobile"`
   - Supabase: Will validate against this bundle ID

---

## 📱 Implementation Details

### Redirect Helper

```javascript
WebBrowser.maybeCompleteAuthSession();

const expoGlobal =
  typeof globalThis !== "undefined" ? globalThis.expo : undefined;
const isExpoGo =
  typeof expoGlobal !== "undefined" &&
  expoGlobal?.Constants?.appOwnership === "expo";

const getRedirectUrl = () => {
  if (isExpoGo || (typeof __DEV__ !== "undefined" && __DEV__)) {
    return AuthSession.makeRedirectUri({
      scheme: "rhoodapp",
      path: "auth/callback",
    });
  }

  return AuthSession.makeRedirectUri({
    scheme: "rhoodapp",
    path: "auth/callback",
    useProxy: false,
  });
};
```

### Complete Function

```javascript
async signInWithApple() {
  if (this._signingInWithApple) {
    console.log("⚠️ Apple Sign-In already in progress, ignoring duplicate request");
    return;
  }

  this._signingInWithApple = true;

  const runOAuthFallback = async () => {
    console.log("🍎 Falling back to Apple web OAuth flow…");

    const redirectUrl = getRedirectUrl();

    const { data: oauthData, error: oauthError } =
      await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

    if (oauthError) {
      console.error("❌ Apple OAuth init failed:", oauthError);
      throw oauthError;
    }

    const result = await WebBrowser.openAuthSessionAsync(
      oauthData.url,
      redirectUrl,
      {
        showInRecents: false,
        preferEphemeralSession: true,
      }
    );

    if (result.type !== "success") {
      throw new Error("Apple sign-in was cancelled or failed");
    }

    try {
      const { data: sessionData, error: sessionFromUrlError } =
        await supabase.auth.getSessionFromUrl({
          url: result.url,
          storeSession: true,
        });

      if (sessionFromUrlError) {
        console.warn(
          "⚠️ Unable to hydrate Apple session via getSessionFromUrl:",
          sessionFromUrlError
        );
      } else if (sessionData?.session) {
        console.log("✅ Apple OAuth session restored from callback URL");
        return sessionData;
      }
    } catch (sessionFromUrlException) {
      console.warn(
        "⚠️ Exception while parsing Apple OAuth callback:",
        sessionFromUrlException
      );
    }

    const url = new URL(result.url);
    const code = url.searchParams.get("code");

    if (code) {
      const { data: sessionData, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error(
          "❌ Error exchanging Apple OAuth code for session:",
          exchangeError
        );
        throw new Error(
          `Failed to complete Apple sign-in: ${exchangeError.message}`
        );
      }

      if (sessionData?.session) {
        console.log("✅ Apple OAuth code exchange succeeded");
        return sessionData;
      }
    }

    let accessToken = url.searchParams.get("access_token");
    let refreshToken = url.searchParams.get("refresh_token");

    if (!accessToken && url.hash) {
      const hashParams = new URLSearchParams(url.hash.substring(1));
      accessToken = hashParams.get("access_token");
      refreshToken = hashParams.get("refresh_token");
    }

    if (accessToken) {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

      if (sessionError) {
        console.error("❌ Apple session error:", sessionError);
        throw sessionError;
      }

      console.log("✅ Apple OAuth tokens accepted");
      return sessionData;
    }

    throw new Error("No session information returned from Apple OAuth");
  };

  try {
    const nativeAvailable = await AppleAuthentication.isAvailableAsync();

    if (!nativeAvailable) {
      console.log(
        "⚠️ Native Apple Sign-In unavailable; attempting OAuth fallback"
      );
      return await runOAuthFallback();
    }

    console.log("🍎 Starting native Apple Sign-In flow…");

    const bytes = await Crypto.getRandomBytesAsync(32);
    const rawNonce = Array.from(bytes, (b) =>
      b.toString(16).padStart(2, "0")
    ).join("");

    const base64Hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );

    const hashedNonce = base64Hash
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");

    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    if (!credential.identityToken) {
      throw new Error("Apple sign-in did not return an identity token");
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "apple",
      token: credential.identityToken,
      nonce: rawNonce,
    });

    if (error) {
      console.error("❌ Native Apple Sign-In failed:", error);
      throw error;
    }

    console.log("✅ Apple Sign-In successful via native flow");
    return data;
  } catch (error) {
    if (
      error?.code === "ERR_CANCELED" ||
      error?.code === "ERR_APPLE_SIGNIN_CANCELLED"
    ) {
      console.log("⚠️ Apple Sign-In cancelled by user");
      throw new Error("Apple sign-in was cancelled");
    }

    console.warn(
      "⚠️ Native Apple Sign-In failed, attempting OAuth fallback...",
      error
    );

    return await runOAuthFallback();
  } finally {
    this._signingInWithApple = false;
  }
}
```

### Key Features

1. **Native-First Flow**: Attempts `expo-apple-authentication` before anything else
2. **Automatic OAuth Fallback**: Transparently switches to Supabase-hosted OAuth when native sign-in isn't available (simulator, Expo Go, Android)
3. **Duplicate Tap Guard**: `_signingInWithApple` flag prevents concurrent attempts
4. **Clean Error Handling**: User cancellations bubble up cleanly, unexpected errors log once and reuse fallback

---

## 🧪 Testing

### Where It Works

✅ **Native flow (signInWithIdToken):**

- Physical iOS devices (iOS 13+) via TestFlight or production builds
- Development client builds that embed the native Apple module

⚠️ **OAuth fallback (signInWithOAuth):**

- Expo Go or iOS Simulator when the native module is unavailable
- Requires Apple provider to be fully configured in Supabase (Services ID, Team ID, Key ID, Secret)
- Best suited for internal testing—production users should rely on the native flow

❌ **Not supported:**

- Android devices (Apple Sign-In is iOS-only)
- Bare development mode without either the native module or a configured OAuth provider

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

### Issue: OAuth fallback returns "Provider not configured"

**Cause:** Apple Services ID credentials are missing in Supabase, so the hosted OAuth flow cannot start.

**Solution:**

1. In Supabase Dashboard, open the Apple provider settings
2. Fill in the **Services ID**, **Team ID**, **Key ID**, and upload the **Auth Key (.p8)**
3. Add the redirect URLs generated by Supabase (e.g. `rhoodapp://auth/callback`) to your Apple developer configuration
4. Save changes, then retry the fallback flow

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

### v3.0 (Current) - Native First + OAuth Fallback

- Native `signInWithIdToken` flow with hashed nonce
- Automatic Supabase OAuth fallback for simulators/Expo Go
- Simplified logging, improved error surfacing
- One place to configure (no more REST hacks)

### v2.0 (Deprecated) - Clean Native Implementation

- Removed debugging code
- Relied solely on native flow (no fallback)
- ~70 lines of code

### v1.0 (Deprecated) - Debug Version

- Extensive debugging helpers and alerts
- Manual JWT validation
- Direct REST API fallback with hard-coded anon key
- ~250 lines of code

---

## 💡 Key Takeaways

1. **Nonce is critical**: Always use fresh, properly hashed nonces
2. **Native is better**: Use `signInWithIdToken` for native apps
3. **Test on device**: Simulator won't work
4. **Simple is better**: Clean implementation = fewer bugs
5. **Supabase handles validation**: Trust the platform

---

_Last Updated: 2025-11-10_
_Implementation: lib/supabase.js - signInWithApple()_
