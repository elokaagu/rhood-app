# Testing Guide: Messages and Lock Screen Controls

## 🗄️ Database Setup (Do This First!)

### Step 1: Fix Trigger Error

Run in Supabase SQL Editor: `database/fix-messages-updated-at-trigger.sql`

**Expected Result**: Should see "✅ Fixed messages trigger issue!"

### Step 2: Clean Up Duplicate Threads (if needed)

Run in Supabase SQL Editor: `database/cleanup-duplicate-threads.sql`

**Expected Result**: Should show which threads will be merged, then see "✅ Duplicate threads cleaned up!"

### Step 3: Verify RLS Policies (if not done already)

Run in Supabase SQL Editor: `database/fix-all-messaging-rls.sql`

**Expected Result**: Should see successful policies created and verification results

---

## 📱 App Testing

### Step 1: Reload the App

**Expo Go**: Shake device → Tap "Reload"
**Physical Device**: Close app completely, then reopen

### Step 2: Test Message Persistence

1. Navigate to **Connections** tab
2. Tap **Messages** subtab
3. Open chat with Eloka (or any connected user)
4. **Send a test message** (e.g., "Testing 123")
5. **Expected**: Message should appear immediately in chat

**Test Persistence**:

- Navigate back to Connections list
- Re-open the Eloka chat
- **Expected**: Your message should still be there

**Test Real-time**:

- Send another message
- Lock your phone screen
- Unlock and check
- **Expected**: New message should still be visible

### Step 3: Test Lock Screen Controls

1. Navigate to **Listen** screen
2. Play a mix (tap any mix to start playback)
3. **Immediately lock your phone** (press power button)
4. Look at lock screen

**Expected on iOS**:

- Should see album artwork
- Should see track title and artist name
- Should see play/pause button in center
- Should see skip forward/backward buttons
- Scrubbing should work on the timeline

**Expected on Android**:

- Should see media notification
- Should see album artwork (if available)
- Should see track title and artist name
- Should see play/pause, next, previous controls

**Test Lock Screen Actions**:

- Tap play/pause on lock screen
- **Expected**: Audio should pause/resume
- Tap next button (if available)
- **Expected**: Next track should play
- Drag timeline scrubber
- **Expected**: Audio position should change

---

## 🔍 How to Verify Messages Are Working

### Step 1: Check Console Logs

When you open a chat, you should see:

```
📥 loadMessages started: { chatType: 'individual', djId: '...', userId: '...' }
🧵 Using thread ID: abc123...
📨 Individual messages loaded: X messages
📋 First message preview: { id: '...', content: '...', sender: '...', timestamp: '...' }
```

If you see:

```
⚠️ NO MESSAGES RETURNED FROM DATABASE
📋 Query details: { threadId: '...', table: 'messages', filter: '...' }
```

**This means the database query returned empty. Check if messages exist in that thread.**

### Step 2: When Sending a Message

After sending, you should see:

```
✅ Individual message sent successfully!
✅ Message data saved to database: { id: '...', thread_id: '...', sender_id: '...', content: '...', created_at: '...' }
```

If you see:

```
❌ Error sending individual message
❌ Error details: { code: '...', message: '...', hint: '...', details: '...' }
```

**This means the message failed to save. Check RLS policies.**

### Step 3: Run SQL Test in Supabase

Run `database/test-messages-quick.sql` to verify messages are actually in the database.

---

## 🐛 Troubleshooting

### Messages Not Appearing

**Symptoms**: Chat shows "NO MESSAGES YET" even after sending

**Solutions**:

1. **Check console logs** - Look for the messages above
2. Run `database/test-messages-quick.sql` to verify messages are in database
3. Check app logs for thread ID mismatchesew
4. Verify RLS policies were applied correctly
5. Check that you're testing with an **accepted connection**

### Messages Sending But Not Saving

**Symptoms**: Console shows "✅ Individual message sent successfully!" but message disappears

**Solutions**:

1. Check for RLS errors in console logs
2. Verify `database/fix-all-messaging-rls.sql` was run successfully
3. Check that `thread_id` matches in both INSERT and SELECT queries
4. Verify you're logged in as the correct user

### Lock Screen Controls Not Showing

**Symptoms**: No controls appear when phone is locked during playback

**Solutions**:

1. Verify you're on a **physical device** (lock screen doesn't work in simulator)
2. Check that audio is actually playing before locking
3. Make sure app is not in foreground restrictions mode
4. Try closing and reopening the app after code changes
5. Check logs for "🔒 Lock screen controls enabled" message

### Messages Not Persisting

**Symptoms**: Messages disappear after navigating away

**Solutions**:

1. Run `database/cleanup-duplicate-threads.sql` to fix thread issues
2. Verify RLS policies allow SELECT operations
3. Check network connection
4. Look for RLS errors in Supabase logs

---

## 📝 Quick Verification SQL

After testing, run `database/test-messages-quick.sql` to see:

- Recent messages
- Messages per thread
- Thread participants

This helps verify messages are being stored correctly.

---

## ✅ Success Criteria

**Messages Working**:

- ✅ Can send messages
- ✅ Messages persist after navigation
- ✅ Messages persist after app restart
- ✅ Real-time updates work
- ✅ All conversations show in Messages tab

**Lock Screen Controls Working**:

- ✅ Controls appear when phone is locked
- ✅ Artwork displays (if available)
- ✅ Track info displays correctly
- ✅ Play/pause works from lock screen
- ✅ Timeline scrubbing works
- ✅ Next/previous work (if applicable)
