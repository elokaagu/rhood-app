-- Drop the problematic messages_community_or_private_check constraint
-- Since the messages table doesn't have a community_id column,
-- this constraint is invalid and causing insert failures

-- Step 1: Check if constraint exists
SELECT '=== CHECKING CONSTRAINT ===' as status;
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'messages_community_or_private_check';

-- Step 2: Drop the constraint
SELECT '=== DROPPING CONSTRAINT ===' as status;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_community_or_private_check;

-- Step 3: Verify it's gone
SELECT '=== VERIFICATION ===' as status;
SELECT 
    conname AS constraint_name
FROM pg_constrainty
WHERE conname = 'messages_community_or_private_check';

-- Success message
SELECT '✅ Constraint dropped! Messages can now be inserted with just thread_id and sender_id.' as status;

