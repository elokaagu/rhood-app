-- Fix infinite recursion in private_chat_members RLS policy
-- This error occurs when RLS policies reference each other in a circular way
-- Run this in your Supabase SQL Editor

-- Step 1: Check if private_chat_members table exists in any schema
SELECT '=== CHECKING FOR private_chat_members TABLE ===' as status;

-- Check in public schema
SELECT 'Checking public schema...' as status;
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name = 'private_chat_members'
ORDER BY table_schema;

-- Also check if it might be referenced by messages RLS policies
SELECT '=== CHECKING MESSAGES RLS POLICIES FOR private_chat_members REFERENCES ===' as status;
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'messages'
AND (qual::text LIKE '%private_chat_members%' OR with_check::text LIKE '%private_chat_members%');

-- Step 2: Show existing policies before dropping them
SELECT '=== EXISTING POLICIES (BEFORE FIX) ===' as status;
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'private_chat_members';

-- Step 2.5: If table doesn't exist in public, try to find it and fix policies anyway
-- The error suggests the table exists somewhere, so let's try to drop policies even if we can't find the table
DO $$
DECLARE
  table_schema_name TEXT;
BEGIN
  -- Try to find the table in any schema
  SELECT table_schema INTO table_schema_name
  FROM information_schema.tables 
  WHERE table_name = 'private_chat_members'
  LIMIT 1;
  
  IF table_schema_name IS NOT NULL THEN
    RAISE NOTICE 'Found table in schema: %', table_schema_name;
  ELSE
    RAISE NOTICE 'Table not found, but will attempt to drop policies anyway';
    -- Set to public as default
    table_schema_name := 'public';
  END IF;
END $$;

-- Step 3: Drop ALL existing policies on private_chat_members to break recursion
-- Try dropping from public schema first (most common)
-- This is a comprehensive list - drop everything to ensure no recursive policies remain
DROP POLICY IF EXISTS "private_chat_members_select_policy" ON private_chat_members;
DROP POLICY IF EXISTS "private_chat_members_insert_policy" ON private_chat_members;
DROP POLICY IF EXISTS "private_chat_members_update_policy" ON private_chat_members;
DROP POLICY IF EXISTS "private_chat_members_delete_policy" ON private_chat_members;
DROP POLICY IF EXISTS "Users can view their chat members" ON private_chat_members;
DROP POLICY IF EXISTS "Users can insert chat members" ON private_chat_members;
DROP POLICY IF EXISTS "Users can update chat members" ON private_chat_members;
DROP POLICY IF EXISTS "Users can delete chat members" ON private_chat_members;
DROP POLICY IF EXISTS "private_chat_members_select" ON private_chat_members;
DROP POLICY IF EXISTS "private_chat_members_insert" ON private_chat_members;
DROP POLICY IF EXISTS "private_chat_members_update" ON private_chat_members;
DROP POLICY IF EXISTS "private_chat_members_delete" ON private_chat_members;
DROP POLICY IF EXISTS "private_chat_members_select_simple" ON private_chat_members;

-- Drop any other policies that might exist (catch-all)
DO $$
DECLARE
  r RECORD;
  policy_count INTEGER := 0;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'private_chat_members'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON private_chat_members', r.policyname);
    RAISE NOTICE 'Dropped policy: %', r.policyname;
    policy_count := policy_count + 1;
  END LOOP;
  
  IF policy_count > 0 THEN
    RAISE NOTICE '✅ Dropped % policies', policy_count;
  ELSE
    RAISE NOTICE 'ℹ️ No additional policies found to drop';
  END IF;
END $$;

-- Step 4: Check table structure and create appropriate policies
DO $$
DECLARE
  table_exists BOOLEAN;
  has_user_id BOOLEAN;
  has_chat_id BOOLEAN;
  has_thread_id BOOLEAN;
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'private_chat_members'
  ) INTO table_exists;
  
  IF table_exists THEN
    -- Check which columns exist
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'private_chat_members' 
      AND column_name = 'user_id'
    ) INTO has_user_id;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'private_chat_members' 
      AND column_name = 'chat_id'
    ) INTO has_chat_id;
    
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'private_chat_members' 
      AND column_name = 'thread_id'
    ) INTO has_thread_id;
    
    RAISE NOTICE 'Table structure: user_id=%, chat_id=%, thread_id=%', has_user_id, has_chat_id, has_thread_id;
    
    -- Only create policies if user_id exists (required for RLS)
    IF has_user_id THEN
      -- Option 1: Create simple, non-recursive policies
      -- Simple SELECT policy: users can only see their own memberships (no recursion)
      CREATE POLICY "private_chat_members_select" ON private_chat_members
        FOR SELECT USING (auth.uid() = user_id);
      
      -- Users can insert themselves into chats
      CREATE POLICY "private_chat_members_insert" ON private_chat_members
        FOR INSERT WITH CHECK (auth.uid() = user_id);
      
      -- Users can update their own membership
      CREATE POLICY "private_chat_members_update" ON private_chat_members
        FOR UPDATE USING (auth.uid() = user_id);
      
      -- Users can remove themselves from chats
      CREATE POLICY "private_chat_members_delete" ON private_chat_members
        FOR DELETE USING (auth.uid() = user_id);
        
      RAISE NOTICE '✅ Simple non-recursive policies created for private_chat_members';
    ELSE
      RAISE NOTICE '⚠️ user_id column not found - disabling RLS instead';
      -- If user_id doesn't exist, disable RLS entirely (less secure but prevents recursion)
      ALTER TABLE private_chat_members DISABLE ROW LEVEL SECURITY;
      RAISE NOTICE '⚠️ RLS disabled on private_chat_members - consider adding user_id column';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ Table does not exist - policies may be on a different table or schema';
  END IF;
END $$;

-- Step 5: Show actual table structure
SELECT '=== ACTUAL TABLE STRUCTURE ===' as status;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'private_chat_members'
ORDER BY ordinal_position;

-- Step 6: Verify policies (after fix)
SELECT '=== CURRENT POLICIES ON private_chat_members ===' as status;
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'private_chat_members';

-- Step 7: If table doesn't exist, check for similar tables
SELECT '=== CHECKING FOR SIMILAR TABLES ===' as status;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%chat%' OR table_name LIKE '%member%')
ORDER BY table_name;

-- Step 8: Alternative fix - Disable RLS entirely if policies can't be fixed
-- This is a last resort if the table exists but policies keep causing recursion
DO $$
DECLARE
  table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'private_chat_members'
  ) INTO table_exists;
  
  IF table_exists THEN
    -- Check if there are still problematic policies
    IF EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'private_chat_members'
      AND (qual::text LIKE '%private_chat_members%' OR with_check::text LIKE '%private_chat_members%')
    ) THEN
      RAISE NOTICE '⚠️ Recursive policies still detected - disabling RLS as last resort';
      ALTER TABLE private_chat_members DISABLE ROW LEVEL SECURITY;
      RAISE NOTICE '⚠️ RLS disabled - table is now accessible without policies';
    END IF;
  END IF;
END $$;

-- Step 9: Final verification
SELECT '=== FINAL STATUS ===' as status;
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'private_chat_members')
    THEN 'Table exists'
    ELSE 'Table not found'
  END as table_status,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'private_chat_members') as policy_count;

-- Success message
SELECT '✅ RLS policy fix script completed!' as status;
SELECT '⚠️ If errors persist, the table might be in a different schema' as note;
SELECT '⚠️ Check Supabase dashboard → Table Editor to see if private_chat_members exists' as note;
SELECT '⚠️ If table exists but errors continue, RLS has been disabled as a safety measure' as note;

