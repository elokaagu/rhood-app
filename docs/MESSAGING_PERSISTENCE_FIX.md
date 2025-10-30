# Messaging Persistence Issue - Fix Guide

## 🐛 Problem

Messages are not persisting when sent from the app. The issue is likely related to Row Level Security (RLS) policies on the `messages` table that are out of sync with the current database schema.

## 🔍 Root Cause

The `messages` table was originally created with a `receiver_id` column, but the current implementation uses a `thread_id` approach for organizing messages. The RLS policies may still be referencing the old `receiver_id` column, or they may not exist at all.

Additionally, there may be a schema mismatch in the `message_threads` table:
- **Production schema**: Uses `user_id_1` and `user_id_2` columns
- **Legacy schema**: Uses `participant_1` and `participant_2` columns

## ✅ Solution

Run the comprehensive fix script in your Supabase SQL Editor:

**File**: `database/fix-all-messaging-rls.sql`

This script will:

1. ✅ Check the current table structures
2. ✅ Add any missing columns (`thread_id`, `message_type`, multimedia fields)
3. ✅ Drop all old RLS policies on the `messages` table
4. ✅ Create new RLS policies that work with your current schema (automatically detects `user_id` vs `participant` columns)
5. ✅ Update the notification trigger to work with both schemas
6. ✅ Enable Realtime subscriptions for the `messages` table
7. ✅ Grant necessary permissions
8. ✅ Verify the setup

## 📋 Steps to Fix

1. Open your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file `database/fix-all-messaging-rls.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run**
7. Review the output to see:
   - Current table structures
   - Which RLS policies were created
   - Whether Realtime is enabled

## 🔍 Verification

After running the fix script, you should see output like:

```
=== CURRENT MESSAGES TABLE STRUCTURE ===
=== CURRENT MESSAGE_THREADS TABLE STRUCTURE ===
=== MESSAGES RLS POLICIES ===
=== REALTIME ENABLED TABLES ===
✅ Message RLS policies updated successfully!
```

### Expected RLS Policies on `messages`:

- `Users can view thread messages` (SELECT)
- `Users can insert thread messages` (INSERT)
- `Users can update their own messages` (UPDATE)
- `Users can delete their own messages` (DELETE)

## 🧪 Testing

After applying the fix:

1. Open the app and navigate to a chat
2. Send a text message
3. Close the app completely
4. Reopen the app and navigate to the same chat
5. **Expected**: The message should still be there

## 📝 Additional Files

If you want to verify the database state before running the fix:

**File**: `database/verify-message-setup.sql`

This diagnostic script will show you:
- Table structures
- Current RLS policies
- Realtime status
- Recent threads and messages

## 🔗 Related Documentation

- [Messaging Flow](MESSAGING_FLOW.md) - Complete messaging system flow
- [Database Schema](DATABASE_SCHEMA.md) - Full database documentation
- [Platform Documentation](PLATFORM_DOCUMENTATION.md) - General platform overview

## 🆘 Troubleshooting

### "Duplicate policy name" error

The script uses `DROP POLICY IF EXISTS`, so this should not occur. If it does, manually drop the conflicting policy first.

### Messages still not persisting after fix

1. Check that RLS is enabled on the `messages` table:
   ```sql
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename = 'messages';
   ```

2. Verify the RLS policies were created:
   ```sql
   SELECT policyname, cmd 
   FROM pg_policies 
   WHERE tablename = 'messages';
   ```

3. Check that you're authenticated:
   ```sql
   SELECT auth.uid();
   ```

4. Review the app logs for specific error messages

### "Function already exists" error

The script recreates the `notify_new_message` function. This is expected and the error can be ignored.

## 📞 Need Help?

If issues persist after running the fix script:

1. Share the output from `verify-message-setup.sql`
2. Check app logs for specific error messages
3. Verify your authentication state in Supabase

