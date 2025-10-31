# Quick Debug Guide for Audio & Messages

## 🎵 Audio Not Playing - Debug Steps

### 1. Reload the App
**Important**: Recent code changes require a full reload.

- **Expo Go**: Shake device → Tap "Reload"
- **Physical Device**: Close app completely, then reopen

### 2. Check Console Logs When Playing Audio

**Good Signs:**
```
🎵 playGlobalAudio called with track: { id: '...', title: '...', ... }
🔄 Sound created: [object Sound]
📊 Initial sound status: { isLoaded: true, durationMillis: 180000, ... }
▶️ Starting playback...
✅ Playback started successfully
🎉 Global audio started successfully: [track title]
```

**Bad Signs:**
```
❌ Error playing global audio: [error message]
❌ Playback failed: [error details]
🎵 Audio loading error, but continuing with playback attempt
```

### 3. Common Audio Issues

#### Issue: "Audio playback not available in Expo Go"
**Fix**: This is normal in Expo Go. Test on a physical device or EAS build.

#### Issue: "Sound failed to load properly"
**Fix**: 
- Check audio URL is valid
- Verify network connection
- Check if audio file exists in Supabase Storage

#### Issue: Audio plays but no sound
**Fix**:
- Check device volume
- Check if device is in silent mode
- Verify `playsInSilentModeIOS: true` is set in audio mode config

---

## 📨 Messages Not Sending - Debug Steps

### 1. Check Console Logs When Sending

**Good Signs:**
```
📤 Sending message: { chatType: 'individual', userId: '...', ... }
🧵 Using thread ID: abc123...
✅ Individual message sent successfully!
✅ Message data saved to database: { id: '...', thread_id: '...', ... }
🎉 Message sent successfully!
📨 New individual message received: [message data]
```

**Bad Signs:**
```
❌ Error sending individual message: [error object]
❌ Error details: { code: '42501', message: 'permission denied', ... }
```

### 2. Common Message Issues

#### Issue: "permission denied for table messages"
**Fix**: Run `database/fix-all-messaging-rls.sql` in Supabase SQL Editor

#### Issue: "Invalid input syntax for type uuid"
**Fix**: Check that `user.id` and `djId` are valid UUIDs

#### Issue: Messages send but don't appear
**Fix**: 
- Check console for "📨 New individual message received" - if missing, real-time subscription issue
- Verify thread IDs match between INSERT and SELECT
- Run `database/cleanup-duplicate-threads.sql`

### 3. Quick SQL Check

Run this in Supabase SQL Editor to see if messages are being saved:

```sql
SELECT * FROM messages 
ORDER BY created_at DESC 
LIMIT 10;
```

If you see messages here but not in app = loading issue
If you don't see messages here = sending issue

---

## 🔍 What to Do Right Now

1. **Reload the app completely** (shake → Reload in Expo Go)

2. **Try to play audio** - Watch console logs carefully
   - Copy the entire log output
   - Look for the patterns above

3. **Try to send a message** - Watch console logs carefully
   - Copy the entire log output  
   - Look for the patterns above

4. **Share the logs** - This will help identify the exact issue

---

## 📋 Quick Fixes to Try

### For Audio:
- Reload app (required after code changes)
- Check network connection
- Verify audio file URL is accessible
- Try different audio source
- Check device volume/silent mode

### For Messages:
- Reload app (required after code changes)
- Verify both users have accepted connections
- Run `database/test-messages-quick.sql` in Supabase
- Check network connection
- Verify RLS policies applied

---

## 🆘 Still Not Working?

**Capture these logs:**
1. Everything from console when opening chat
2. Everything from console when sending message
3. Everything from console when playing audio
4. Output of `database/test-messages-quick.sql`

**With these logs, we can pinpoint the exact issue!**

