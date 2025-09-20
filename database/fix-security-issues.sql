-- Fix Supabase Security Issues
-- Run this script in your Supabase SQL Editor to resolve all security warnings

-- ==============================================
-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ==============================================

-- Enable RLS on all public tables
ALTER TABLE IF EXISTS public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.messages ENABLE ROW LEVEL SECURITY;

-- Enable RLS on any additional tables that might exist

ALTER TABLE IF EXISTS public.ai_matching_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_feedback_analysis ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 2. DROP EXISTING POLICIES (to avoid conflicts)
-- ==============================================

-- Drop existing policies for user_profiles
DROP POLICY IF EXISTS "User profiles are viewable by everyone" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;

-- Drop existing policies for opportunities
DROP POLICY IF EXISTS "Opportunities are viewable by everyone" ON public.opportunities;
DROP POLICY IF EXISTS "Users can create opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Users can update their own opportunities" ON public.opportunities;

-- Drop existing policies for applications
DROP POLICY IF EXISTS "Users can view their own applications" ON public.applications;
DROP POLICY IF EXISTS "Users can create applications" ON public.applications;
DROP POLICY IF EXISTS "Users can update their own applications" ON public.applications;

-- Drop existing policies for notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

-- Drop existing policies for communities
DROP POLICY IF EXISTS "Communities are viewable by everyone" ON public.communities;
DROP POLICY IF EXISTS "Users can create communities" ON public.communities;
DROP POLICY IF EXISTS "Users can update their own communities" ON public.communities;

-- Drop existing policies for community_members
DROP POLICY IF EXISTS "Community members are viewable by everyone" ON public.community_members;
DROP POLICY IF EXISTS "Users can join communities" ON public.community_members;
DROP POLICY IF EXISTS "Users can leave communities" ON public.community_members;

-- Drop existing policies for messages
DROP POLICY IF EXISTS "Users can view their own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.messages;

-- ==============================================
-- 3. CREATE COMPREHENSIVE RLS POLICIES
-- ==============================================

-- USER_PROFILES POLICIES
-- Anyone can view profiles (for discovery)
CREATE POLICY "user_profiles_select_policy" ON public.user_profiles
  FOR SELECT USING (true);

-- Users can insert their own profile
CREATE POLICY "user_profiles_insert_policy" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- Users can update their own profile
CREATE POLICY "user_profiles_update_policy" ON public.user_profiles
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Users can delete their own profile
CREATE POLICY "user_profiles_delete_policy" ON public.user_profiles
  FOR DELETE USING (auth.uid()::text = id::text);

-- OPPORTUNITIES POLICIES
-- Anyone can view opportunities
CREATE POLICY "opportunities_select_policy" ON public.opportunities
  FOR SELECT USING (true);

-- Authenticated users can create opportunities
CREATE POLICY "opportunities_insert_policy" ON public.opportunities
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own opportunities
CREATE POLICY "opportunities_update_policy" ON public.opportunities
  FOR UPDATE USING (auth.uid()::text = organizer_id::text);

-- Users can delete their own opportunities
CREATE POLICY "opportunities_delete_policy" ON public.opportunities
  FOR DELETE USING (auth.uid()::text = organizer_id::text);

-- APPLICATIONS POLICIES
-- Users can view their own applications
CREATE POLICY "applications_select_policy" ON public.applications
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Authenticated users can create applications
CREATE POLICY "applications_insert_policy" ON public.applications
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Users can update their own applications
CREATE POLICY "applications_update_policy" ON public.applications
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Users can delete their own applications
CREATE POLICY "applications_delete_policy" ON public.applications
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- NOTIFICATIONS POLICIES
-- Users can view their own notifications
CREATE POLICY "notifications_select_policy" ON public.notifications
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Authenticated users can create notifications
CREATE POLICY "notifications_insert_policy" ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own notifications
CREATE POLICY "notifications_update_policy" ON public.notifications
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Users can delete their own notifications
CREATE POLICY "notifications_delete_policy" ON public.notifications
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- COMMUNITIES POLICIES
-- Anyone can view communities
CREATE POLICY "communities_select_policy" ON public.communities
  FOR SELECT USING (true);

-- Authenticated users can create communities
CREATE POLICY "communities_insert_policy" ON public.communities
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can update communities they created
CREATE POLICY "communities_update_policy" ON public.communities
  FOR UPDATE USING (auth.uid()::text = created_by::text);

-- Users can delete communities they created
CREATE POLICY "communities_delete_policy" ON public.communities
  FOR DELETE USING (auth.uid()::text = created_by::text);

-- COMMUNITY_MEMBERS POLICIES
-- Anyone can view community members
CREATE POLICY "community_members_select_policy" ON public.community_members
  FOR SELECT USING (true);

-- Authenticated users can join communities
CREATE POLICY "community_members_insert_policy" ON public.community_members
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Users can update their own membership
CREATE POLICY "community_members_update_policy" ON public.community_members
  FOR UPDATE USING (auth.uid()::text = user_id::text);

-- Users can leave communities
CREATE POLICY "community_members_delete_policy" ON public.community_members
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- MESSAGES POLICIES
-- Users can view messages they sent or received
CREATE POLICY "messages_select_policy" ON public.messages
  FOR SELECT USING (
    auth.uid()::text = sender_id::text OR 
    auth.uid()::text = receiver_id::text
  );

-- Authenticated users can send messages
CREATE POLICY "messages_insert_policy" ON public.messages
  FOR INSERT WITH CHECK (auth.uid()::text = sender_id::text);

-- Users can update messages they sent
CREATE POLICY "messages_update_policy" ON public.messages
  FOR UPDATE USING (auth.uid()::text = sender_id::text);

-- Users can delete messages they sent
CREATE POLICY "messages_delete_policy" ON public.messages
  FOR DELETE USING (auth.uid()::text = sender_id::text);

-- ==============================================
-- 4. CREATE POLICIES FOR ADDITIONAL TABLES
-- ==============================================

-- AI_MATCHING_SUMMARY POLICIES (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_matching_summary' AND table_schema = 'public') THEN
    -- Users can view their own matching summaries
    EXECUTE 'CREATE POLICY "ai_matching_summary_select_policy" ON public.ai_matching_summary
      FOR SELECT USING (auth.uid()::text = user_id::text)';
    
    -- Authenticated users can create matching summaries
    EXECUTE 'CREATE POLICY "ai_matching_summary_insert_policy" ON public.ai_matching_summary
      FOR INSERT WITH CHECK (auth.uid()::text = user_id::text)';
    
    -- Users can update their own matching summaries
    EXECUTE 'CREATE POLICY "ai_matching_summary_update_policy" ON public.ai_matching_summary
      FOR UPDATE USING (auth.uid()::text = user_id::text)';
    
    -- Users can delete their own matching summaries
    EXECUTE 'CREATE POLICY "ai_matching_summary_delete_policy" ON public.ai_matching_summary
      FOR DELETE USING (auth.uid()::text = user_id::text)';
  END IF;
END $$;

-- AI_FEEDBACK_ANALYSIS POLICIES (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_feedback_analysis' AND table_schema = 'public') THEN
    -- Users can view their own feedback analysis
    EXECUTE 'CREATE POLICY "ai_feedback_analysis_select_policy" ON public.ai_feedback_analysis
      FOR SELECT USING (auth.uid()::text = user_id::text)';
    
    -- Authenticated users can create feedback analysis
    EXECUTE 'CREATE POLICY "ai_feedback_analysis_insert_policy" ON public.ai_feedback_analysis
      FOR INSERT WITH CHECK (auth.uid()::text = user_id::text)';
    
    -- Users can update their own feedback analysis
    EXECUTE 'CREATE POLICY "ai_feedback_analysis_update_policy" ON public.ai_feedback_analysis
      FOR UPDATE USING (auth.uid()::text = user_id::text)';
    
    -- Users can delete their own feedback analysis
    EXECUTE 'CREATE POLICY "ai_feedback_analysis_delete_policy" ON public.ai_feedback_analysis
      FOR DELETE USING (auth.uid()::text = user_id::text)';
  END IF;
END $$;

-- ==============================================
-- 5. VERIFY RLS IS ENABLED
-- ==============================================

-- Check which tables have RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;

-- ==============================================
-- 6. CREATE HELPER FUNCTIONS
-- ==============================================

-- Function to check if user is authenticated
CREATE OR REPLACE FUNCTION auth.is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.role() = 'authenticated';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user ID
CREATE OR REPLACE FUNCTION auth.current_user_id()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================
-- 7. GRANT NECESSARY PERMISSIONS
-- ==============================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant table permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ==============================================
-- 8. CREATE SECURITY VIEWS (Optional)
-- ==============================================

-- Create a view for public user profiles (limited data)
CREATE OR REPLACE VIEW public.user_profiles_public AS
SELECT 
  id,
  dj_name,
  city,
  genres,
  bio,
  profile_image_url,
  created_at
FROM public.user_profiles;

-- Grant access to the view
GRANT SELECT ON public.user_profiles_public TO authenticated;
GRANT SELECT ON public.user_profiles_public TO anon;

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Security fixes applied successfully!';
  RAISE NOTICE '🔒 Row Level Security enabled on all tables';
  RAISE NOTICE '🛡️ Comprehensive RLS policies created';
  RAISE NOTICE '👤 User permissions configured';
  RAISE NOTICE '🔍 Run the Security Advisor again to verify fixes';
END $$;
