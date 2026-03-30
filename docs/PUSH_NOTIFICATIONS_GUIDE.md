# Push Notifications Implementation Guide

This guide explains the complete push notification system implemented for the Rhood App.

## 🎯 Overview

The notification system sends push notifications to users when their application status changes (e.g. approved or rejected). It includes:

- ✅ **Expo Push Notifications** — Cross-platform push; **all stored Expo tokens per user** are targeted in one batch request
- ✅ **In-app Notifications** — Stored in database and displayed in the app (optional `skipInApp` when a DB trigger already inserts the row)
- ✅ **Optional email** — Via Supabase Edge Function `send-email` when `userEmail` and `userName` are passed
- ✅ **Real-time Updates** — Live notification delivery via Supabase
- ✅ **Token Management** — Registration per device; **unregistration removes only the current device’s token**
- ✅ **Stale tokens** — Push tickets that indicate an unregistered device cause that token row to be removed from `user_expo_tokens`
- ✅ **Test Interface** — Built-in testing in Settings screen
- ✅ **New-message lock-screen push (server)** — After a `notifications` row is inserted for a DM (`type = 'message'`), Postgres queues a call to the Edge Function `send-expo-push`, which sends via Expo’s API. Setup: [`docs/MESSAGE_PUSH_DELIVERY.md`](./MESSAGE_PUSH_DELIVERY.md).

**Production note:** Application-status pushes may still be sent from the client (`lib/notificationService.js`). **Message** pushes use the Edge Function path above; consider moving **all** push sending server-side for consistency.

## 📁 Files Added/Modified

### New Files:
- `supabase/functions/send-expo-push/` — Edge Function: Expo push for new message notifications (invoked from Postgres via `pg_net`)
- `database/queue-expo-push-on-message-notification.sql` — Trigger + config table for message push delivery
- `lib/notificationService.js` — Orchestration: in-app row, Expo push batch, optional email invoke
- `lib/notificationTemplates.js` — Application-status copy and HTML/text email templates (`APPLICATION_NOTIFICATION_CONFIG`, helpers)
- `lib/pushNotifications.js` — Push setup, `registerForPushNotifications` / `unregisterPushNotifications`, listeners
- `components/NotificationHandler.js` — Notification management component
- `components/NotificationTest.js` — Test interface for notifications
- `database/create-expo-tokens-table.sql` — Database schema for tokens

### Modified Files:
- `app.json` — Expo notifications plugin and configuration
- `App.js` — Integrated push notification setup
- `components/SettingsScreen.js` — Notification test interface

## 🚀 Setup Instructions

### 1. Database Setup

Run the SQL script in your Supabase SQL editor:

```sql
-- Run this in Supabase SQL Editor
-- File: database/create-expo-tokens-table.sql
```

### 2. App Configuration

The `app.json` has been updated with:
- Expo notifications plugin
- Notification icon and color configuration

### 3. Dependencies

Install the required packages:
```bash
npx expo install expo-notifications expo-device expo-constants
```

## 🔧 How It Works

### Token registration
1. App starts and calls `setupPushNotifications()` (or your app’s equivalent).
2. Requests notification permissions from the user.
3. Gets Expo push token from the device.
4. Stores token in Supabase `user_expo_tokens` via `registerExpoToken(userId, expoToken, deviceId, platform)` (upsert).
5. Sets up notification listeners.

### Token unregistration (single device)
1. `unregisterPushNotifications()` in `lib/pushNotifications.js` reads the **current** Expo push token.
2. Calls `unregisterExpoToken(userId, expoToken)` so **only that token’s row** is deleted — other devices for the same user keep receiving pushes.
3. If the token cannot be read (e.g. Expo Go), unregister is skipped.

### Sending notifications
1. When application status changes, call `sendApplicationStatusNotification(...)`.
2. Copy and notification **type** are chosen from `lib/notificationTemplates.js` (`approved`, `rejected`, or a **default** for any other status).
3. Unless `skipInApp: true`, creates an in-app notification in the database.
4. Loads **all** `expo_token` values for the user, dedupes them, sends **one** batch POST to the Expo Push API.
5. On ticket errors such as **DeviceNotRegistered**, the matching token is removed from `user_expo_tokens`.
6. Optionally sends email if `userEmail` and `userName` are provided.
7. Success if any channel succeeded (aligned with partial-success behavior in code).

### Notification handling
1. App listens for incoming notifications.
2. Handles notification taps (including `application_approved`, `application_rejected`, and generic `application_status`).
3. Updates notification read status and in-app UI as implemented in your screens.

## 🧪 Testing

### Built-in test interface
1. Go to **Settings** in the app.
2. Find **Test Push Notifications**.
3. Tap **Send Approved Notification** or **Send Rejected Notification**.
4. Check the physical device for the notification.

### Manual testing
You can call the service directly:

```javascript
import { sendApplicationStatusNotification } from './lib/notificationService';

// Minimal (push + in-app; no email)
await sendApplicationStatusNotification(
  'user-id-here',
  'Test Opportunity',
  'approved', // or 'rejected', or any other status (uses default template)
  'test-application-id-uuid',
  undefined,
  undefined,
);

// With optional email (requires `send-email` Edge Function)
await sendApplicationStatusNotification(
  'user-id-here',
  'Test Opportunity',
  'approved',
  'test-application-id-uuid',
  'user@example.com',
  'DJ Name',
);

// When a database trigger already inserted the in-app row
await sendApplicationStatusNotification(
  userId,
  opportunityTitle,
  status,
  applicationId,
  userEmail,
  userName,
  { skipInApp: true },
);
```

### Low-level token API
```javascript
import { registerExpoToken, unregisterExpoToken } from './lib/notificationService';

// After you obtain expoToken from expo-notifications
await registerExpoToken(userId, expoToken, deviceId, platform);

// Remove only this device’s token (both arguments required)
await unregisterExpoToken(userId, expoToken);
```

## 📱 Device requirements

- **Physical device** — Push does not work in simulators for real delivery.
- **iOS** — Apple Developer setup for production.
- **Android** — Works with Expo development builds.

## 🔐 Permissions

The app requests notification permissions when:
1. The user first opens the app (per your `App.js` flow),
2. The user visits Settings,
3. The user runs a notification test.

## 🗄️ Database schema

### `user_expo_tokens` table
```sql
CREATE TABLE user_expo_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  expo_token TEXT NOT NULL,
  device_id TEXT,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### `notifications` table (if not exists)
```sql
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  related_id TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🔄 Integration with the application system

```javascript
import { sendApplicationStatusNotification } from './lib/notificationService';

const approveApplication = async (applicationId, userId, opportunityTitle, applicantEmail, applicantName) => {
  // Your approval logic…

  await sendApplicationStatusNotification(
    userId,
    opportunityTitle,
    'approved',
    applicationId,
    applicantEmail,
    applicantName,
  );
};

const rejectApplication = async (applicationId, userId, opportunityTitle, applicantEmail, applicantName) => {
  // Your rejection logic…

  await sendApplicationStatusNotification(
    userId,
    opportunityTitle,
    'rejected',
    applicationId,
    applicantEmail,
    applicantName,
  );
};
```

To add a new first-class status, extend `APPLICATION_NOTIFICATION_CONFIG` in `lib/notificationTemplates.js`.

## 🐛 Troubleshooting

### Common issues

1. **"No Expo token found"**
   - User has not granted notification permissions.
   - Token registration failed or user is not logged in.
   - No rows in `user_expo_tokens` for that user (multi-device: at least one token must be registered).

2. **Notifications not appearing**
   - Use a physical device.
   - Confirm permissions and a valid Expo push token.
   - Verify the user has a token row in Supabase.

3. **Unregister did nothing**
   - `unregisterExpoToken` requires the **exact** `expoToken` for that device; `unregisterPushNotifications()` reads it from `expo-notifications`.

4. **Database errors**
   - Ensure `user_expo_tokens` and `notifications` exist and RLS policies allow your operations.

### Debug steps
1. Check console logs for token registration (many logs are dev-only).
2. Confirm tokens in Supabase for the target `user_id`.
3. Test with [Expo’s push tool](https://expo.dev/notifications).
4. Check device notification settings.

## 📊 Monitoring

- Supabase logs for inserts/deletes on `user_expo_tokens` and `notifications`.
- Expo push dashboard / tooling for delivery.
- Plan server-side logging when push moves off the client.

## 🔮 Future enhancements

- Move push (and optional receipt polling) to **backend or Edge Function**.
- Rich notifications with images; categories/channels; scheduling; analytics.

## 📞 Support

If you encounter issues:
1. Use the troubleshooting section above.
2. Review console logs for errors.
3. Test with Expo’s push tool.
4. Verify schema and RLS policies.

The notification system is integrated for development and staging; treat **server-side delivery** as the next maturity step for production.
