# How to Enable Push Notifications

## ⚠️ Important Note

Push notifications with `expo-notifications` **requires a custom development build** and will NOT work with Expo Go. This is because expo-notifications includes native modules that need to be compiled into the app.

## Current Status

✅ **Implemented**: All notification code is complete and ready
🔒 **Disabled**: Temporarily disabled in `App.js` to allow app to run in Expo Go
📱 **Requires**: Custom development build to enable

## Steps to Enable Push Notifications

### Step 1: Create Development Build with EAS

Run this command and follow the prompts:

```bash
eas build --profile development --platform ios
```

**What this does:**
- Compiles the native modules (including expo-notifications)
- Creates a development build you can install on your device
- Enables all native features including push notifications

**You'll need:**
- Apple Developer account credentials
- Access to provisioning profiles
- A physical iOS device (for testing)

### Step 2: Install Development Build on Device

1. After the build completes, you'll get a link or QR code
2. Open the link on your iPhone
3. Install the development build
4. The app will now support push notifications!

### Step 3: Enable Push Notifications in Code

Once you have the development build installed, uncomment this line in `App.js`:

**File: `App.js` (around line 312)**

```javascript
// BEFORE (currently disabled):
// setupPushNotifications();

// AFTER (enable it):
setupPushNotifications();
```

### Step 4: Run Database Migration

Run the SQL script in Supabase SQL Editor:

```sql
-- File: database/create-expo-tokens-table.sql
```

This creates the `user_expo_tokens` table for storing push notification tokens.

### Step 5: Test Notifications

1. Open the app with your development build
2. Grant notification permissions when prompted
3. Go to Settings screen
4. Scroll to "Test Push Notifications"
5. Tap "Send Approved Notification" or "Send Rejected Notification"
6. You should receive a push notification!

## Alternative: Use Without Push Notifications

If you don't need push notifications immediately, the app will work fine in Expo Go with push notifications disabled (current state).

**What still works:**
- ✅ All app features
- ✅ In-app notifications (stored in database)
- ✅ Notification UI in the app
- ✅ All other functionality

**What won't work:**
- ❌ Push notifications to device when app is closed
- ❌ Badge counts on app icon
- ❌ Lock screen notifications

## EAS Build Profile Configuration

The `eas.json` file already has a development profile configured:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    }
  }
}
```

## Troubleshooting

### "Cannot find native module 'ExpoPushTokenManager'"

**Cause**: You're running in Expo Go, which doesn't include expo-notifications
**Solution**: Create and install a development build (see Step 1 above)

### "No Apple Developer team found"

**Cause**: You need to provide Apple Developer credentials
**Solution**: Run `eas build --profile development --platform ios` interactively and provide your Apple ID when prompted

### Build fails with authentication error

**Solution**: 
1. Run: `eas credentials`
2. Select iOS
3. Configure credentials manually
4. Try building again

## When to Enable Push Notifications

Enable push notifications when:
- ✅ You're ready to test on a physical device
- ✅ You have Apple Developer account access
- ✅ You want to test the full notification experience
- ✅ You're preparing for production release

You can continue development without push notifications until then!

## Production Deployment

For production (TestFlight/App Store):

```bash
# For TestFlight
eas build --profile preview --platform ios
eas submit -p ios

# For App Store
eas build --profile production --platform ios
eas submit -p ios
```

The production build will automatically include all native modules, including push notifications.

## Summary

**Current State:**
- ✅ All notification code is implemented
- ✅ App runs in Expo Go (push notifications disabled)
- ✅ In-app notifications work
- ⏸️ Push notifications temporarily disabled

**To Enable:**
1. Run `eas build --profile development --platform ios`
2. Install development build on device
3. Uncomment `setupPushNotifications()` in App.js
4. Run database migration
5. Test notifications!

The notification system is ready to go - just needs a development build to activate! 🚀

