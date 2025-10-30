# 📨 R/HOOD Peer-to-Peer Messaging Flow

## Overview

This document describes the complete peer-to-peer messaging flow in the R/HOOD app, from connection requests to sending messages.

---

## 🔗 Connection Request Flow

### 1. User Sends Connection Request

**When:** User taps "Connect" on another DJ's profile

**What Happens:**
- `handleConnect()` is called (in `UserProfileView.js` or `ConnectionsScreen.js`)
- `db.createConnection(targetUserId)` is invoked
- Uses `create_connection_request` RPC function (fallback to direct INSERT)
- Creates entry in `connections` table with `status = 'pending'`

**Database:**
```sql
INSERT INTO connections (user_id_1, user_id_2, status, initiated_by)
VALUES (smaller_id, larger_id, 'pending', requester_id)
```

### 2. Target User Receives Notification

**What Happens:**
- Database trigger `notify_connection_request()` fires automatically
- Creates notification for the target user
- Shows "New Connection Request" with sender's name

**Notification:**
```sql
INSERT INTO notifications (user_id, title, message, type, related_id)
VALUES (target_user_id, 'New Connection Request', 'sender_name wants to connect with you', 'connection_request', connection_id)
```

**UI:** 
- User sees notification in NotificationsScreen
- Badge count increases
- Alert shows in notification list

### 3. User Accepts Connection

**When:** User taps "Accept" on the connection request notification

**What Happens:**
- `handleAcceptConnection()` is called
- `db.acceptConnection(connectionId)` is invoked
- Uses `accept_connection_request` RPC function
- Updates `connections` table: `status = 'accepted'`

**Database:**
```sql
UPDATE connections 
SET status = 'accepted', accepted_at = NOW() 
WHERE id = connection_id
```

### 4. Original Requester Gets Notification

**What Happens:**
- Database trigger `notify_connection_accepted()` fires automatically
- Creates notification for the original requester
- Shows "Connection Accepted" message

**Notification:**
```sql
INSERT INTO notifications (user_id, title, message, type, related_id)
VALUES (original_requester_id, 'Connection Accepted', 'accepter_name accepted your connection request', 'connection_accepted', connection_id)
```

### 5. Success Modal Appears (Accepter Side)

**What Happens:**
- `setAcceptedUser()` is called with sender info
- `setShowAcceptModal(true)` displays modal
- Modal shows: "Connection Accepted!" with checkmark icon

**Modal Options:**
- **"Start Chatting"** button → Navigates directly to messages screen
- **"Close"** button → Dismisses modal

---

## 💬 Messaging Flow

### 1. Opening Chat

**When:** User taps "Start Chatting" from modal or opens from connections list

**What Happens:**
- `MessagesScreen` loads with `djId` and `chatType='individual'`
- `loadMessages()` checks connection status
- If connected: loads all messages from database
- If not connected: shows "Connect to start messaging" prompt

**Database Query:**
```javascript
// Get or create message thread
const threadId = await db.findOrCreateIndividualMessageThread(user.id, djId);

// Load messages
const messages = await db.getMessages(threadId);
```

### 2. Sending a Message

**When:** User types message and taps send button

**What Happens:**
- `sendMessage()` is called
- Validates connection status (must be accepted)
- Gets/creates message thread
- Inserts message into `messages` table
- Adds message to UI immediately (optimistic update)
- Scrolled to bottom to show new message

**Database Insert:**
```javascript
await supabase.from("messages").insert({
  thread_id: threadId,
  sender_id: user.id,
  content: messageText,
  message_type: 'text'
});
```

### 3. Receiver Gets Notification

**What Happens:**
- Database trigger `notify_new_message()` fires automatically
- Gets receiver from `message_threads` table (other participant)
- Creates notification for receiver
- Shows preview of message

**Notification:**
```sql
INSERT INTO notifications (user_id, title, message, type, related_id)
VALUES (receiver_id, 'New Message', 'sender_name: message_preview', 'message', message_id)
```

### 4. Real-time Message Delivery

**What Happens:**
- Supabase Realtime subscription on `messages` table
- When new message inserted, `onReceiveMessage()` callback fires
- Message immediately appears in chat for receiver
- Auto-scrolls to bottom

**Subscription:**
```javascript
supabase
  .channel(`messages-${threadId}`)
  .on('postgres_changes', { event: 'INSERT', table: 'messages' }, callback)
```

---

## 🗄️ Database Schema

### connections
```sql
CREATE TABLE connections (
  id UUID PRIMARY KEY,
  user_id_1 UUID,
  user_id_2 UUID,
  status VARCHAR(20), -- 'pending', 'accepted', 'rejected'
  initiated_by UUID,
  created_at TIMESTAMP,
  accepted_at TIMESTAMP
);
```

### message_threads
```sql
CREATE TABLE message_threads (
  id UUID PRIMARY KEY,
  type VARCHAR(20), -- 'individual' or 'group'
  user_id_1 UUID,
  user_id_2 UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### messages
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  thread_id UUID REFERENCES message_threads(id),
  sender_id UUID,
  content TEXT,
  message_type VARCHAR(20), -- 'text', 'image', 'audio', 'file'
  media_url TEXT,
  created_at TIMESTAMP
);
```

### notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID,
  title VARCHAR(255),
  message TEXT,
  type VARCHAR(50),
  related_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP
);
```

---

## 🔔 Notification Types

1. **`connection_request`** - "User wants to connect with you"
2. **`connection_accepted`** - "User accepted your connection request"
3. **`message`** - "User: message preview"

---

## ✅ Complete Flow Summary

1. ✅ **User A sends connection request** → Creates `connections` entry (pending)
2. ✅ **User B receives notification** → "User A wants to connect"
3. ✅ **User B accepts request** → Updates status to accepted
4. ✅ **User A receives notification** → "User B accepted your request"
5. ✅ **Modal appears** → "Start Chatting" button navigates to messages
6. ✅ **Message thread created** → Get/ creates `message_threads` entry
7. ✅ **User A sends message** → Inserts into `messages` table
8. ✅ **User B gets notification** → "User A: message preview"
9. ✅ **Real-time delivery** → Message appears instantly in chat
10. ✅ **All messages stored** → Retrieved from database on load

---

## 🚀 Next Steps

To ensure notifications work properly, run this SQL migration in Supabase:

```bash
# Run this in Supabase SQL Editor:
database/fix-message-notification-trigger.sql
```

This updates the `notify_new_message()` function to work with thread-based messaging instead of `receiver_id` column.

---

## 📱 User Experience

**Connection Request:**
- Instant feedback: "Connection request sent"
- Waiting for acceptance
- Cannot chat until connection accepted

**After Acceptance:**
- Immediate notification to both parties
- Modal offers quick start: "Start Chatting" button
- One tap to begin conversation

**Sending Messages:**
- Optimistic UI updates (message shows immediately)
- Real-time delivery to receiver
- Persistent storage in database
- Notification on receiver's device

**All Working Features:**
- ✅ Connection requests
- ✅ Acceptance notifications
- ✅ Modal to start chatting
- ✅ Message storage in database
- ✅ Real-time message delivery
- ✅ Notification on new messages
- ✅ Message history persistence

