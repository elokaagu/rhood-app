-- Fix or remove the update_messages_updated_at_column trigger
-- This trigger is causing errors because the messages table doesn't have an updated_at column

-- Step 1: Check if updated_at column exists in messages table
SELECT '=== MESSAGES TABLE COLUMNS ===' as status;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;

-- Step 2: Check for any triggers on the messages table
SELECT '=== TRIGGERS ON MESSAGES TABLE ===' as status;
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'messages';

-- Step 3: Drop the problematic trigger if it exists
DROP TRIGGER IF EXISTS update_messages_updated_at ON messages;

-- Step 4: Drop the function if it exists (but keep the generic one for other tables)
-- Note: We're only dropping the messages-specific version, not the generic update_updated_at_column()
DROP FUNCTION IF EXISTS update_messages_updated_at_column();

-- Success message
SELECT '✅ Fixed messages trigger issue!' as status;

