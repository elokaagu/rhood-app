# Google Analytics 4 (GA4) Troubleshooting Guide

## Why is Google Analytics not showing data?

If you're seeing "No data available" in Google Analytics, follow these steps to diagnose and fix the issue.

## 🔍 Step 1: Check Console Logs

When the app starts, look for these log messages in your console:

### ✅ Success Messages:
- `✅ [GA4] Firebase Analytics initialized successfully`
- `✅ [GA4] Analytics collection enabled for debugging`
- `📊 [GA4] Tracking event: ...`
- `✅ [GA4] Event tracked: ...`

### ⚠️ Warning Messages (indicates a problem):
- `⚠️ [GA4] Firebase native module not linked - app may need to be rebuilt`
- `⚠️ [GA4] Analytics not initialized - event "..." not sent to GA4`
- `⚠️ [GA4] Firebase Analytics initialization failed`

## 🛠️ Common Issues & Fixes

### Issue 1: Firebase Native Module Not Linked

**Symptoms:**
- Console shows: `⚠️ [GA4] Firebase native module not linked`
- No Firebase logs appear

**Fix:**
1. Make sure you've run `npx expo prebuild` after adding Firebase
2. **Rebuild the app** (not just reload):
   ```bash
   # For iOS
   npx expo run:ios
   
   # For Android
   npx expo run:android
   ```
3. If using EAS Build, create a new build:
   ```bash
   eas build --platform ios
   ```

### Issue 2: Config Files Missing or Incorrect

**Symptoms:**
- Firebase initializes but events don't appear
- No errors in console

**Fix:**
1. Verify `GoogleService-Info.plist` exists in `ios/` folder
2. Verify `google-services.json` exists in `android/app/` folder
3. Check `app.json` has the correct paths:
   ```json
   {
     "ios": {
       "googleServicesFile": "./ios/GoogleService-Info.plist"
     },
     "android": {
       "googleServicesFile": "./android/app/google-services.json"
     }
   }
   ```
4. Make sure the bundle ID/package name matches your Firebase project

### Issue 3: Testing on Simulator

**Symptoms:**
- Events tracked in console but not in GA4
- Works on device but not simulator

**Fix:**
- Firebase Analytics can be unreliable on simulators
- **Test on a real device** for accurate results
- Use Firebase DebugView for simulator testing (see below)

### Issue 4: Wrong Firebase Project / GA4 Property

**Symptoms:**
- Events are being sent (logs show success)
- But you're looking at the wrong GA4 property

**Fix:**
1. Check your Firebase project settings
2. Verify the `GoogleService-Info.plist` matches the project you're viewing
3. In Firebase Console → Project Settings → Your Apps, verify the bundle ID matches

### Issue 5: Analytics Collection Disabled

**Symptoms:**
- Firebase initializes successfully
- But no events appear

**Fix:**
1. Check Firebase Console → Analytics → Settings
2. Verify Analytics is enabled for your project
3. Check that data collection is enabled

## 🧪 Debugging Tools

### 1. Check Analytics Status in Code

Add this to your app to check Firebase status:

```javascript
import { getAnalyticsStatus } from './lib/analytics';

// In your component
const status = getAnalyticsStatus();
console.log('Analytics Status:', status);
// Should show: { firebaseInitialized: true, mixpanelInitialized: true, ... }
```

### 2. Use Firebase DebugView

For real-time debugging on iOS:

1. In Xcode, go to **Product → Scheme → Edit Scheme**
2. Add environment variable: `-FIRDebugEnabled` = `1`
3. Run the app
4. In Firebase Console → Analytics → DebugView, you'll see events in real-time

For Android:

1. Run: `adb shell setprop debug.firebase.analytics.app com.rhoodapp.mobile`
2. Restart the app
3. View events in Firebase DebugView

### 3. Test Event Manually

Add this to test if events are working:

```javascript
import { track } from './lib/analytics';

// Test event
track('test_event', { test_property: 'test_value' });
```

Check console for:
- `📊 [GA4] Tracking event: test_event`
- `✅ [GA4] Event tracked: test_event`

If you see warnings instead, Firebase isn't initialized.

## 📊 Expected Behavior

### When Working Correctly:

1. **App Start:**
   ```
   🔍 [GA4] Starting Firebase Analytics initialization...
   ✅ [GA4] RNFBAppModule found
   ✅ [GA4] Firebase Analytics module loaded
   ✅ [GA4] Firebase Analytics initialized successfully
   ✅ [GA4] Analytics collection enabled for debugging
   ```

2. **Event Tracking:**
   ```
   📊 [GA4] Tracking event: app_open
   ✅ [GA4] Event tracked: app_open
   ```

3. **In Google Analytics:**
   - Events appear in Realtime reports within 30 seconds
   - Events appear in standard reports within 24-48 hours

### When Not Working:

1. **App Start:**
   ```
   ⚠️ [GA4] Firebase native module not linked - app may need to be rebuilt
   ⚠️ [GA4] Firebase Analytics initialization failed
   ```

2. **Event Tracking:**
   ```
   ⚠️ [GA4] Analytics not initialized - event "App Open" not sent to GA4
   ```

## ⏱️ Data Delay

- **Realtime Reports:** Events should appear within 30 seconds
- **Standard Reports:** Can take 24-48 hours for some reports
- **If using DebugView:** Events appear instantly

## 🔄 Still Not Working?

1. **Check all console logs** - Look for `[GA4]` prefixed messages
2. **Verify Firebase project** - Make sure you're looking at the right GA4 property
3. **Rebuild the app** - Native modules require a full rebuild
4. **Test on real device** - Simulators can have issues
5. **Check Firebase Console** - Verify Analytics is enabled in project settings

## 📝 Quick Checklist

- [ ] Ran `npx expo prebuild` after adding Firebase
- [ ] Rebuilt the app (not just reloaded)
- [ ] `GoogleService-Info.plist` exists in `ios/` folder
- [ ] `google-services.json` exists in `android/app/` folder
- [ ] `app.json` has correct `googleServicesFile` paths
- [ ] Bundle ID matches Firebase project
- [ ] Console shows `✅ [GA4] Firebase Analytics initialized successfully`
- [ ] Testing on real device (not simulator)
- [ ] Looking at correct GA4 property in Firebase Console
- [ ] Analytics enabled in Firebase project settings

