# Notification System - Opportunities Only by Default

## Overview

The R/HOOD app now separates notifications and messages into distinct systems. Notifications are **opportunities-only by default**, while messages have their own badge indicator on the Messages tab. Users can opt-in to receive notifications for messages if they wish.

## Key Changes

### Notifications

- **Default**: Only opportunities trigger notifications
- **Opt-in**: Users must explicitly enable message notifications in Settings
- **Separate Badge**: Messages have their own badge count on the Messages tab
- **Clear Separation**: Notifications ≠ Messages

### Messages

- **Own Badge**: Messages tab shows unread message count
- **Independent Indicator**: Badge count visible even when message notifications are disabled
- **Opt-in Notifications**: Users can enable notifications for messages via Settings toggle

## Implementation

### Default Settings

**User Settings Defaults:**
- `message_notifications`: **false** (opt-in)
- `push_notifications`: true
- Other notification settings: true

### Notification Count Logic

```javascript
// Only counts opportunity notifications by default
const messageNotificationsEnabled = userSettings?.message_notifications ?? false;

const [notificationCount, messageCount] = await Promise.all([
  db.getUnreadNotificationCount(user.id, {
    excludeTypes: messageNotificationsEnabled ? [] : ["message"],
  }),
  db.getUnreadMessageCount(user.id),
]);

setUnreadNotificationCount(notificationCount); // Only opportunities
setUnreadMessageCount(messageCount); // Separate message count
```

### Database Trigger

The message notification trigger now checks user preferences before creating notifications:

```sql
-- Check if receiver has message notifications enabled (default: false)
SELECT COALESCE(message_notifications, false) INTO message_notifications_enabled
FROM user_settings
WHERE user_id = receiver_id;

-- Only create notification if user has opted in
IF message_notifications_enabled THEN
  INSERT INTO notifications ...
END IF;
```

### UI Components

#### Messages Tab
- **New Tab**: Added "Messages" tab in bottom navigation
- **Badge Indicator**: Shows unread message count
- **Icon**: `chatbubble-outline`
- **Screen**: Navigates to Connections screen with connections tab active (shows messages)

#### Connections Tab
- **Badge Removed**: No longer shows message count
- **Focus**: Shows connections/discover functionality
- **Clean UI**: Messages have their own dedicated space

#### Settings Screen
- **Toggle**: "Message Notifications" with subtitle "(opt-in)"
- **Clear Labeling**: Makes it clear users must opt-in
- **Default**: OFF by default

## User Flow

### Default Experience

1. **User receives a message**:
   - ❌ No notification (unless opted in)
   - ✅ Badge count increases on Messages tab
   - ✅ Message appears in Messages list

2. **User receives opportunity notification**:
   - ✅ Notification appears
   - ✅ Badge count on Notifications icon increases
   - ✅ Notification visible in Notifications screen

### Opted-In Experience (Message Notifications Enabled)

1. **User receives a message**:
   - ✅ Notification appears
   - ✅ Badge count increases on Messages tab
   - ✅ Notification visible in Notifications screen
   - ✅ Message appears in Messages list

## Database Migration

Run the following migration to update the message notification trigger:

```sql
-- File: database-migrations/update-message-notification-preference-check.sql
```

This migration:
- Updates `notify_new_message()` function to check user preferences
- Sets default `message_notifications` to `false` for existing users
- Ensures only opted-in users receive message notifications

## Settings

### Message Notifications Toggle

- **Location**: Settings → Notifications → Message Notifications
- **Default**: OFF
- **Subtitle**: "Get notifications for new messages (opt-in)"
- **Behavior**: When enabled, creates notifications for new messages

### Push Notifications Toggle

- **Location**: Settings → Notifications → Push Notifications
- **Default**: ON
- **Behavior**: Controls all push notifications (respects message notification preference)

## Benefits

### For Users

- **Less Noise**: Notifications only for opportunities by default
- **Control**: Explicit opt-in for message notifications
- **Clear Indication**: Separate badge for messages
- **Flexibility**: Can enable/disable message notifications anytime

### For DJs

- **Focus**: Notifications for what matters (opportunities)
- **Messages Visible**: Badge count always shows unread messages
- **Choice**: Can enable message notifications if desired

### For Platform

- **Better UX**: Reduces notification fatigue
- **Engagement**: Opportunities get priority in notifications
- **Flexibility**: Users control their experience

## Technical Details

### Badge Counts

**Notification Badge**: 
- Shows only unread opportunity notifications (by default)
- Excludes messages unless user opted in
- Updates in real-time

**Message Badge**:
- Shows unread message count
- Always visible on Messages tab
- Updates in real-time
- Independent of notification preferences

### Real-time Updates

Both counts update in real-time via Supabase subscriptions:
- Notification count: Updates when new notifications arrive
- Message count: Updates when new messages arrive

### Settings Persistence

User preferences are stored in `user_settings` table:
- `message_notifications`: Boolean (default: false)
- `push_notifications`: Boolean (default: true)

Preferences are loaded on app start and updated immediately when changed.

