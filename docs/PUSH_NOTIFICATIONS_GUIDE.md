# Push Notifications Implementation Guide

This guide explains the complete push notification system implemented for the Rhood App.

## 🎯 Overview

The notification system sends push notifications to users when their applications are approved or rejected. It includes:

- ✅ **Expo Push Notifications** - Cross-platform push notifications
- ✅ **In-app Notifications** - Stored in database and displayed in the app
- ✅ **Real-time Updates** - Live notification delivery via Supabase
- ✅ **Token Management** - Automatic registration and cleanup
- ✅ **Test Interface** - Built-in testing in Settings screen

## 📁 Files Added/Modified

### New Files:
- `lib/notificationService.js` - Core notification service
- `lib/pushNotifications.js` - Push notification setup and handlers
- `components/NotificationHandler.js` - Notification management component
- `components/NotificationTest.js` - Test interface for notifications
- `database/create-expo-tokens-table.sql` - Database schema for tokens

### Modified Files:
- `app.json` - Added Expo notifications plugin and configuration
- `App.js` - Integrated push notification setup
- `components/SettingsScreen.js` - Added notification test interface

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

### Token Registration
1. App starts and calls `setupPushNotifications()`
2. Requests notification permissions from user
3. Gets Expo push token from device
4. Stores token in Supabase `user_expo_tokens` table
5. Sets up notification listeners

### Sending Notifications
1. When application status changes (approved/rejected)
2. `sendApplicationStatusNotification()` is called
3. Creates in-app notification in database
4. Sends push notification via Expo Push API
5. User receives notification on device

### Notification Handling
1. App listens for incoming notifications
2. Handles notification taps and navigation
3. Updates notification read status
4. Shows in-app notification UI

## 🧪 Testing

### Built-in Test Interface
1. Go to **Settings** screen in the app
2. Scroll down to see "Test Push Notifications" section
3. Tap "Send Approved Notification" or "Send Rejected Notification"
4. Check your device for the notification

### Manual Testing
You can also test by calling the notification service directly:

```javascript
import { sendApplicationStatusNotification } from './lib/notificationService';

// Send test notification
await sendApplicationStatusNotification(
  'user-id-here',
  'Test Opportunity',
  'approved', // or 'rejected'
  'test-application-id'
);
```

## 📱 Device Requirements

- **Physical Device Required**: Push notifications don't work in simulators
- **iOS**: Requires Apple Developer account for production
- **Android**: Works with Expo development builds

## 🔐 Permissions

The app will automatically request notification permissions when:
1. User first opens the app
2. User goes to Settings screen
3. User tries to test notifications

## 🗄️ Database Schema

### `user_expo_tokens` Table
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

### `notifications` Table (if not exists)
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

## 🔄 Integration with Application System

To integrate with your application approval/rejection system:

```javascript
import { sendApplicationStatusNotification } from './lib/notificationService';

// When approving an application
const approveApplication = async (applicationId, userId, opportunityTitle) => {
  // Your approval logic here...
  
  // Send notification
  await sendApplicationStatusNotification(
    userId,
    opportunityTitle,
    'approved',
    applicationId
  );
};

// When rejecting an application
const rejectApplication = async (applicationId, userId, opportunityTitle) => {
  // Your rejection logic here...
  
  // Send notification
  await sendApplicationStatusNotification(
    userId,
    opportunityTitle,
    'rejected',
    applicationId
  );
};
```

## 🐛 Troubleshooting

### Common Issues:

1. **"No Expo token found"**
   - User hasn't granted notification permissions
   - Token registration failed
   - User is not logged in

2. **Notifications not appearing**
   - Check if using physical device (not simulator)
   - Verify notification permissions are granted
   - Check Expo push token is valid

3. **Database errors**
   - Ensure `user_expo_tokens` table exists
   - Check user_id foreign key constraints
   - Verify Supabase connection

### Debug Steps:
1. Check console logs for token registration
2. Verify token is stored in database
3. Test with Expo Push Tool: https://expo.dev/notifications
4. Check notification permissions in device settings

## 📊 Monitoring

Monitor notification delivery:
- Check Supabase logs for database operations
- Monitor Expo push notification delivery
- Track notification open rates
- Monitor token registration success

## 🔮 Future Enhancements

Potential improvements:
- Rich notifications with images
- Notification categories and channels
- Scheduled notifications
- Notification analytics
- Batch notification sending
- Notification templates

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review console logs for errors
3. Test with Expo Push Tool
4. Verify database schema and permissions

The notification system is now fully integrated and ready for testing! 🎉
