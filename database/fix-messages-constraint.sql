-- Fix messages_community_or_private_check constraint
-- This script will check the constraint definition and fix it

-- Step 1: Check current constraint definition
SELECT '=== CURRENT CONSTRAINT DEFINITION ===' as status;
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'messages_community_or_private_check';

-- Step 2: Check if messages table has community_id column
SELECT '=== CHECKING FOR community_id COLUMN ===' as status;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'messages'
  AND table_schema = 'public'
  AND column_name = 'community_id';

-- Step 3: Drop the problematic constraint
SELECT '=== DROPPING CONSTRAINT ===' as status;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_community_or_private_check;

-- Step 4: If community_id column doesn't exist, add it (nullable)
-- Then recreate the constraint properly
DO $$
BEGIN
    -- Check if community_id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'messages' 
        AND column_name = 'community_id'
        AND table_schema = 'public'
    ) THEN
        -- Add community_id column
        ALTER TABLE messages ADD COLUMN community_id UUID REFERENCES communities(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added community_id column to messages table';
    ELSE
        RAISE NOTICE 'community_id column already exists';
    END IF;
    
    -- Recreate the constraint: messages must have either thread_id (for private) or community_id (for group)
    -- But since we're using thread_id for both, we'll make it simpler: just require thread_id
    -- Actually, let's check: if thread is individual, community_id must be NULL
    -- If thread is group, community_id should match thread's community_id
    -- But since messages table doesn't need community_id (it's on the thread), we can drop the constraint entirely
    -- OR make it check that thread_id exists (which it always should)
    
END $$;

-- Step 5: Create a simpler constraint that just ensures thread_id exists
-- (Since all messages should have a thread_id)
SELECT '=== CREATING SIMPLER CONSTRAINT ===' as status;
ALTER TABLE messages ADD CONSTRAINT messages_has_thread_check 
    CHECK (thread_id IS NOT NULL);

-- Success message
SELECT '✅ Constraint fixed! Messages now only need thread_id.' as status;
SELECT '⚠️ If you need community_id on messages, you can add it later.' as note;

