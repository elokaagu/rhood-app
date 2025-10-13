# Apple Sign-In Debug Probe

## 🎯 Purpose

This probe bypasses the Supabase SDK and hits GoTrue REST API directly to diagnose Apple Sign-In nonce issues. It shows **exactly** what the server receives and validates, eliminating all SDK/wrapper uncertainties.

---

## 🔧 How It Works

### 1. **Nonce Generation**
- Generates a 64-character hex nonce (32 random bytes)
- Hashes it with SHA-256 → base64url encoding
- Shows both raw and hashed nonce previews

### 2. **Apple Sign-In**
- Sends the **hashed nonce** to Apple
- Receives identity token with nonce claim

### 3. **Local Validation**
- Decodes the JWT token
- Checks:
  - `aud` (audience) matches bundle ID
  - `iss` (issuer) is `https://appleid.apple.com`
  - `nonce` claim matches hashed nonce
- Shows results in **Alert #1**

### 4. **Direct REST Call**
- Bypasses `@supabase/supabase-js` SDK
- Calls GoTrue REST API directly with:
  - `provider: 'apple'`
  - `id_token: <Apple's identityToken>`
  - `nonce: <raw nonce>` (unhashed)
- Shows server response in **Alert #2**

---

## 🚀 How to Use

### In Development (iOS Simulator or Device)

1. **Start the app**: `npm start`
2. **Go to Login screen**
3. **Tap "🔍 Apple Debug Probe"** button (only visible in `__DEV__`)
4. **Complete Apple Sign-In**
5. **See 2 alerts**:
   - **Alert #1**: Local validation (nonce, aud, iss)
   - **Alert #2**: Server response (status, session, errors)

### In TestFlight (Production Build)

The debug button is **hidden in production** (`__DEV__ === false`).

To enable it in TestFlight:
1. Remove the `__DEV__` check in `LoginScreen.js`:
   ```javascript
   {/* Always show in TestFlight for debugging */}
   <TouchableOpacity
     style={[styles.socialButton, styles.debugButton]}
     onPress={appleNonceProbe}
   >
     <Text style={[styles.socialButtonText, styles.debugButtonText]}>
       🔍 Apple Debug Probe
     </Text>
   </TouchableOpacity>
   ```

2. Build and submit to TestFlight
3. Test on real device

---

## 📊 Interpreting Results

### Alert #1: "Local checks"

Shows local JWT validation:

```
rawNonce len: 64
rawNonce preview: a3f8c2...4d9e1b
hashed len: 43
hashed preview: hKj9x1...pL8mN
audOk:true issOk:true nonceOk:true
```

✅ **All true** = Your nonce generation and hashing are correct

❌ **audOk:false** = Bundle ID mismatch (check Supabase config)

❌ **nonceOk:false** = Nonce hashing issue (check SHA-256 implementation)

### Alert #2: "GoTrue REST 200" (Success)

```json
{
  "status": 200,
  "hasSession": true,
  "error": null,
  "msg": null
}
```

✅ **Status 200 + hasSession:true** = Everything works! Apple Sign-In is successful.

**What this means:**
- The nonce validation passed
- The server authenticated successfully
- **If the SDK still fails**, the SDK was dropping/mutating the nonce

**Next steps:**
- Use the REST endpoint in production (safe, identical behavior)
- OR update `@supabase/supabase-js` to latest version

### Alert #2: "GoTrue REST 400" (Nonce Mismatch)

```json
{
  "status": 400,
  "hasSession": false,
  "error": "Nonces do not match",
  "msg": null
}
```

❌ **Nonces do not match** = Server validation failed

**Debugging steps:**

1. **Check Alert #1 first**
   - If `nonceOk:false`, the hashing is wrong locally
   - If `nonceOk:true`, the issue is in transmission

2. **Try fixed nonce** (in `appleNonceProbe.js`):
   ```javascript
   // Uncomment this line:
   const rawNonce = 'abc123-TEST-nonce-ONLY-for-debug';
   // Comment this line:
   // const rawNonce = await makeHexNonce(32);
   ```
   - Fixed nonce removes randomness
   - If it works, the random generation has a bug
   - If it fails, the issue is in hashing/encoding

3. **Check device time**
   - Ensure device clock is accurate
   - Wildly wrong time can cause token issues

4. **Check nonce format**
   - Must be 64 hex chars: `/^[0-9a-f]{64}$/`
   - SHA-256 → base64url (no padding `=`)

---

## 🔍 Advanced Debugging

### Compare SDK vs REST

If REST succeeds but SDK fails:

1. **SDK is dropping the nonce**
   - Update to latest: `npm i @supabase/supabase-js@latest`
   - Or use REST endpoint directly

2. **SDK is mutating the nonce**
   - Log the exact payload in `lib/supabase.js`
   - Compare with REST call payload

### Enable Console Logging

The probe logs to console:

```javascript
console.log('✅ Apple Sign-In Probe SUCCESS:', {
  hasUser: !!json?.user,
  hasSession: !!json?.session,
  email: json?.user?.email,
});
```

**To see logs:**
1. Connect iPhone to Mac via USB
2. Open **Console.app**
3. Filter by `process:RHOOD`
4. Run the probe

---

## 🛠️ Code Reference

### File: `debug/appleNonceProbe.js`

```javascript
export async function appleNonceProbe() {
  // 1. Generate nonce
  const rawNonce = await makeHexNonce(32); // 64 hex chars
  const hashedNonce = await sha256Base64url(rawNonce);

  // 2. Apple Sign-In with hashed nonce
  const cred = await AppleAuthentication.signInAsync({
    nonce: hashedNonce, // HASHED
  });

  // 3. Decode token, validate locally
  const claims = parseJWT(cred.identityToken);
  const nonceOk = claims.nonce === hashedNonce;

  // 4. Call GoTrue REST directly
  const res = await fetch('https://PROJECT_REF.supabase.co/auth/v1/token?grant_type=id_token', {
    method: 'POST',
    body: JSON.stringify({
      provider: 'apple',
      id_token: cred.identityToken,
      nonce: rawNonce, // RAW (unhashed)
    }),
  });
}
```

### Key Variables

- `PROJECT_REF`: `jsmcduecuxtaqizhmiqo`
- `BUNDLE_ID`: `com.rhoodapp.mobile`
- `SUPABASE_ANON_KEY`: (public, safe to commit)

---

## 📋 Checklist

Before testing:
- [ ] Ensure device has internet connection
- [ ] Ensure signed in to iCloud on device
- [ ] Ensure Apple Developer config is correct:
  - [ ] Bundle ID matches `com.rhoodapp.mobile`
  - [ ] Services ID matches Supabase config
  - [ ] Key ID and Team ID are correct
- [ ] Ensure Supabase Apple provider is enabled

After testing:
- [ ] Check Alert #1 for local validation
- [ ] Check Alert #2 for server response
- [ ] Check Console.app for detailed logs
- [ ] Report both alerts if issue persists

---

## 🚨 Common Issues

### "Apple error: No identityToken returned"
- User cancelled sign-in
- Or Apple's servers are down (rare)

### "Nonce format error: Expected 64 hex chars"
- `makeHexNonce` is generating wrong format
- Check `Crypto.getRandomBytesAsync` implementation

### Status 400: "Invalid grant"
- Token expired (wait a few seconds, try again)
- Or Bundle ID mismatch

### Status 400: "Nonces do not match"
- See "Interpreting Results" section above
- Try fixed nonce for debugging

---

## 🎯 Expected Outcome

**Success Path:**
1. Alert #1: `audOk:true issOk:true nonceOk:true`
2. Alert #2: `status: 200, hasSession: true`
3. Console: `✅ Apple Sign-In Probe SUCCESS`

**This proves:**
- ✅ Nonce generation is correct
- ✅ SHA-256 hashing is correct
- ✅ Apple's token is valid
- ✅ Supabase GoTrue accepts the nonce
- ✅ **The flow works end-to-end**

If this succeeds but the SDK fails, **use the REST endpoint** in production.

---

*Last Updated: October 13, 2025*

