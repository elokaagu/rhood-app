# Debugging Messages in R/HOOD

## 🔍 Quick Debug Checklist

When messages aren't working, follow these steps in order:

### 1️⃣ Check Console Logs

**Look for these patterns:**

**✅ GOOD - Messages Loading:**
```
📥 loadMessages started: { chatType: 'individual', djId: '...', userId: '...' }
🧵 Using thread ID: abc123...
📨 Individual messages loaded: 5 messages
📋 First message preview: { id: 'msg-123', content: 'Hello there!', sender: 'Eloka', timestamp: '...' }
```

**❌ BAD - No Messages Found:**
```
⚠️ NO MESSAGES RETURNED FROM DATABASE
📋 Query details: { threadId: 'abc123', table: 'messages', filter: 'thread_id=eq.abc123' }
```
**Action**: Run SQL test to verify if messages exist in database.

### 2️⃣ Check Send Status

**✅ GOOD - Message Sent Successfully:**
```
✅ Individual message sent successfully!
✅ Message data saved to database: { 
  id: 'msg-456', 
  thread_id: 'abc123', 
  sender_id: 'user-789', 
  content: 'Test message', 
  created_at: '2024-...' 
}
```

**❌ BAD - Send Failed:**
```
❌ Error sending individual message
❌ Error details: { 
  code: '42501', 
  message: 'permission denied for table messages', 
  hint: null, 
  details: null 
}
```
**Action**: RLS policy issue. Run `database/fix-all-messaging-rls.sql`.

### 3️⃣ Run SQL Test

In Supabase SQL Editor, run `database/test-messages-quick.sql`.

**Expected output:**
```
=== RECENT MESSAGE THREADS ===
id                                  | type       | user_id_1 | user_id_2 | created_at
------------------------------------|------------|-----------|-----------|------------------
abc-123-def-456                     | individual | user-1    | user-2    | 2024-01-15 10:30
...

=== RECENT MESSAGES ===
id        | thread_id                    | sender_id | content          | created_at
----------|------------------------------|-----------|------------------|------------------
msg-001   | abc-123-def-456              | user-1    | Hello!           | 2024-01-15 10:31
msg-002   | abc-123-def-456              | user-2    | Hi there!        | 2024-01-15 10:32
...
```

**No results?** Messages aren't being saved. Check send errors above.

**Threads exist but no messages?** Messages might be in wrong thread. Check for duplicate threads.

### 4️⃣ Common Issues & Fixes

#### Issue: "permission denied for table messages"
**Cause**: RLS policy blocking insert/select
**Fix**: Run `database/fix-all-messaging-rls.sql`

#### Issue: Messages in database but not showing in app
**Cause**: Thread ID mismatch or RLS blocking SELECT
**Fix**: 
1. Check that console shows correct thread ID
2. Verify RLS policies allow SELECT
3. Check `thread_id` matches between INSERT and SELECT

#### Issue: Messages disappearing after sending
**Cause**: Real-time subscription not working or thread mismatch
**Fix**:
1. Check console for "📨 New individual message received" logs
2. Verify thread ID is consistent
3. Run `database/cleanup-duplicate-threads.sql`

#### Issue: "Invalid input syntax for type uuid"
**Cause**: User ID or DJ ID not valid UUIDs
**Fix**: Check console logs for user IDs being passed

---

## 📋 Database Schema Reference

### messages table
```sql
- id (uuid, primary key)
- thread_id (uuid, foreign key -> message_threads.id)
- sender_id (uuid, foreign key -> user_profiles.id)
- content (text, nullable)
- message_type (text, default 'text')
- media_url (text, nullable)
- media_filename (text, nullable)
- created_at (timestamptz, default now())
```

### message_threads table
```sql
- id (uuid, primary key)
- type (text, 'individual' or 'group')
- user_id_1 (uuid, foreign key -> user_profiles.id)
- user_id_2 (uuid, foreign key -> user_profiles.id)
- created_at (timestamptz, default now())
```

**Key Relationship**: `messages.thread_id` -> `message_threads.id`

---

## 🧪 Testing Commands

### Check if messages exist for a thread
```sql
SELECT * FROM messages 
WHERE thread_id = 'YOUR-THREAD-ID-HERE' 
ORDER BY created_at DESC;
```

### Check all threads for a user
```sql
SELECT * FROM message_threads 
WHERE user_id_1 = 'YOUR-USER-ID' OR user_id_2 = 'YOUR-USER-ID'
ORDER BY created_at DESC;
```

### Check RLS policies on messages table
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'messages';
```

### Check for duplicate threads
```sql
SELECT 
  LEAST(user_id_1, user_id_2) as user1,
  GREATEST(user_id_1, user_id_2) as user2,
  COUNT(*) as thread_count,
  array_agg(id ORDER BY created_at) as thread_ids
FROM message_threads
WHERE type = 'individual'
GROUP BY LEAST(user_id_1, user_id_2), GREATEST(user_id_1, user_id_2)
HAVING COUNT(*) > 1;
```

---

## 📱 App Flow to Track

1. **User opens chat** → `loadMessages()` called
2. **System finds/creates thread** → `findOrCreateIndividualMessageThread()`
3. **Messages queried** → `supabase.from('messages').select().eq('thread_id', threadId)`
4. **User sends message** → `sendMessage()` called
5. **Message inserted** → `supabase.from('messages').insert(data)`
6. **Real-time updates** → Subscription receives INSERT event
7. **UI updates** → Message added to state

**Check console logs at each step to identify where it fails.**

---

## 🆘 Still Not Working?

1. **Capture full console logs** - Send complete error output
2. **Run all SQL verification scripts** - Check database state
3. **Verify both users are accepted connections** - Required for individual chats
4. **Check network connectivity** - Supabase might be down
5. **Test with different users** - Isolate if it's user-specific

