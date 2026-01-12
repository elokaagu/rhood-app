-- Check the messages_community_or_private_check constraint definition
-- This will help us understand what the constraint is checking

SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'messages_community_or_private_check';

-- Also check if messages table has community_id column
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'messages'
  AND table_schema = 'public'
ORDER BY ordinal_position;

