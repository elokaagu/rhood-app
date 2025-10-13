# How to View TestFlight App Logs

## 🔍 The Problem
JavaScript `console.log()` statements don't appear in iOS system logs. The Console.app logs you're seeing are from iOS system daemons (SpringBoard, runningboardd, etc.), not your React Native JavaScript code.

---

## ✅ Solution 1: In-App Alerts (Easiest - Already Implemented)

We've added `Alert.alert()` debugging to your Apple Sign-In flow that will show diagnostic information directly in the TestFlight app:

```javascript
// Already in lib/supabase.js
if (__DEV__ === false) {
  Alert.alert(
    "Apple Sign-In Debug",
    `Nonce Match: ${nonceMatch ? '✅ YES' : '❌ NO'}\n\nBundle ID: ${claims.aud}\n\nIssuer: ${claims.iss}`,
    [{ text: "Continue" }]
  );
}
```

**When you test Apple Sign-In in TestFlight, you'll see:**
- ✅/❌ Whether nonce matches
- Bundle ID from Apple's token
- Issuer from Apple's token

This runs **only in production builds** (`__DEV__ === false`), so it won't show in development.

---

## 📊 Solution 2: Connect iPhone to Mac (For Detailed Logs)

### Step 1: Connect Your iPhone to Your Mac
1. Plug iPhone into Mac via USB
2. **Trust the computer** if prompted on iPhone
3. Enter iPhone passcode if requested

### Step 2: Open Console.app on Mac
1. Open **Console.app** (Applications → Utilities → Console)
2. Or use Spotlight: `Cmd + Space`, type "Console"

### Step 3: Filter to Your App
1. In Console.app sidebar, select your **iPhone device**
2. In the search bar (top right), enter: `process:RHOOD`
3. This will filter to only show logs from your app

### Step 4: Test Apple Sign-In
1. Open your app on TestFlight
2. Attempt Apple Sign-In
3. Watch Console.app for your custom logs:
   - `🍎 Starting Apple Sign-In...`
   - `[APPLE] rawNonce len/preview`
   - `[APPLE] hashedNonce len/preview`
   - `[APPLE] token.nonce === hashed?`
   - `✅ Apple credential received`
   - `[SB call] nonce len/preview`

### What You'll See
```
[APPLE] rawNonce len/preview 64 a3f8c2 ...4d9e1b
[APPLE] hashedNonce len/preview 43 hKj9x1 ...pL8mN
[APPLE] token.nonce === hashed? true
✅ Apple credential received
[SB call] nonce len/preview 64 a3f8c2 ...4d9e1b
[SB sdk result] { dataPresent: true, error: undefined }
✅ Apple Sign-In successful: user@example.com
```

---

## 🛠️ Solution 3: Use Xcode Device Console (Alternative)

### Step 1: Open Xcode
1. Open Xcode on your Mac
2. Connect iPhone via USB

### Step 2: Open Device Console
1. Go to: **Window → Devices and Simulators** (or `Cmd + Shift + 2`)
2. Select your iPhone from the left sidebar
3. Click **Open Console** button at bottom

### Step 3: Filter Logs
1. In the filter box, type: `RHOOD`
2. Or filter by process: `com.rhoodapp.mobile`

### What Shows
- All `console.log()` statements from your React Native code
- Native iOS logs from your app
- Errors and warnings

---

## 📱 Solution 4: Remote Logging Service (Advanced)

For production debugging when you can't connect the device:

### Option A: Use a Remote Logger
```javascript
// Install a remote logging service
npm install react-native-logs

// Or use a cloud service like:
// - Sentry (errors)
// - LogRocket (sessions)
// - Firebase Crashlytics
```

### Option B: Send Logs to Your Server (Quick & Dirty)
```javascript
// Add to lib/supabase.js
async function remoteLog(message, data = {}) {
  if (__DEV__) return; // Only in production
  
  try {
    await fetch('https://your-logging-endpoint.com/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        data,
        timestamp: new Date().toISOString(),
        app: 'rhood-mobile'
      })
    });
  } catch (err) {
    // Silent fail
  }
}

// Use in your code
remoteLog('[APPLE] Starting sign in', { nonce: rawNonce.slice(0, 6) });
```

---

## 🎯 Recommended Approach for Your Case

### **For Now: Use In-App Alerts** ✅
The `Alert.alert()` we added will show you exactly what you need:
1. Install latest TestFlight build
2. Tap "Sign in with Apple"
3. You'll see an alert with:
   - Nonce match status
   - Bundle ID
   - Issuer

### **For Deeper Investigation: Connect to Console.app**
1. Plug iPhone into Mac
2. Open Console.app
3. Filter by `process:RHOOD`
4. Test Apple Sign-In
5. See all console.log statements in real-time

---

## 🐛 Understanding What You Shared

The logs you pasted are **iOS system logs**, showing:

```
SpringBoard    - UI management
runningboardd  - Process management
backboardd     - Input/keyboard handling
cameracaptured - Camera/display monitoring
RHOOD          - Your app's native layer (not JS console.logs)
```

These are useful for:
- ❌ Debugging React Native JavaScript
- ✅ Debugging native iOS issues
- ✅ Seeing app lifecycle events
- ✅ Diagnosing system-level problems

**To see your JavaScript console.logs**, you need Console.app filtered to your app or the in-app alerts.

---

## 📋 Quick Checklist

- [ ] **In-App Alerts**: Test Apple Sign-In in TestFlight, watch for alert popup
- [ ] **Console.app**: Connect iPhone to Mac, filter to `process:RHOOD`
- [ ] **Xcode Console**: Window → Devices → Your iPhone → Open Console
- [ ] **Check logs**: Look for `[APPLE]`, `[SB call]`, `🍎` emoji markers

---

## 🔧 Current Debug Output (In Your Code)

Your app currently logs:

1. **Nonce Generation**:
   ```
   [APPLE] rawNonce len/preview 64 a3f8c2 ...4d9e1b
   [APPLE] hashedNonce len/preview 43 hKj9x1 ...pL8mN
   ```

2. **Token Validation**:
   ```
   [APPLE] token.nonce === hashed? true/false
   [APPLE] aud/iss <bundle-id> https://appleid.apple.com
   ```

3. **Supabase Call**:
   ```
   [SB call] nonce len/preview 64 a3f8c2 ...4d9e1b
   [SB payload keys] ['provider', 'token', 'nonce']
   [SB sdk result] { dataPresent: true, error: undefined }
   ```

4. **In-App Alert** (TestFlight only):
   ```
   Alert: "Apple Sign-In Debug"
   Nonce Match: ✅ YES
   Bundle ID: com.rhoodapp.mobile
   Issuer: https://appleid.apple.com
   ```

---

*Last Updated: October 13, 2025*

