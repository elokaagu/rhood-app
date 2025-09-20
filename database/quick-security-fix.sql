-- Quick Security Fix for Supabase
-- Run this in your Supabase SQL Editor to fix the immediate security issues

-- ==============================================
-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ==============================================

-- Enable RLS on all public tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Enable RLS on additional tables if they exist
ALTER TABLE IF EXISTS public.ai_matching_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.ai_feedback_analysis ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 2. CREATE BASIC RLS POLICIES
-- ==============================================

-- USER_PROFILES - Anyone can view, users can manage their own
CREATE POLICY "user_profiles_select" ON public.user_profiles
  FOR SELECT USING (true);

CREATE POLICY "user_profiles_insert" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid()::text = id::text);

CREATE POLICY "user_profiles_update" ON public.user_profiles
  FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "user_profiles_delete" ON public.user_profiles
  FOR DELETE USING (auth.uid()::text = id::text);

-- OPPORTUNITIES - Anyone can view, authenticated users can create
CREATE POLICY "opportunities_select" ON public.opportunities
  FOR SELECT USING (true);

CREATE POLICY "opportunities_insert" ON public.opportunities
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "opportunities_update" ON public.opportunities
  FOR UPDATE USING (auth.uid()::text = organizer_id::text);

CREATE POLICY "opportunities_delete" ON public.opportunities
  FOR DELETE USING (auth.uid()::text = organizer_id::text);

-- APPLICATIONS - Users can only see their own
CREATE POLICY "applications_select" ON public.applications
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "applications_insert" ON public.applications
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "applications_update" ON public.applications
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "applications_delete" ON public.applications
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- NOTIFICATIONS - Users can only see their own
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "notifications_insert" ON public.notifications
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "notifications_delete" ON public.notifications
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- COMMUNITIES - Anyone can view, authenticated users can create
CREATE POLICY "communities_select" ON public.communities
  FOR SELECT USING (true);

CREATE POLICY "communities_insert" ON public.communities
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "communities_update" ON public.communities
  FOR UPDATE USING (auth.uid()::text = created_by::text);

CREATE POLICY "communities_delete" ON public.communities
  FOR DELETE USING (auth.uid()::text = created_by::text);

-- COMMUNITY_MEMBERS - Anyone can view, users can manage their own
CREATE POLICY "community_members_select" ON public.community_members
  FOR SELECT USING (true);

CREATE POLICY "community_members_insert" ON public.community_members
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "community_members_update" ON public.community_members
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "community_members_delete" ON public.community_members
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- MESSAGES - Users can only see messages they sent/received
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT USING (
    auth.uid()::text = sender_id::text OR 
    auth.uid()::text = receiver_id::text
  );

CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT WITH CHECK (auth.uid()::text = sender_id::text);

CREATE POLICY "messages_update" ON public.messages
  FOR UPDATE USING (auth.uid()::text = sender_id::text);

CREATE POLICY "messages_delete" ON public.messages
  FOR DELETE USING (auth.uid()::text = sender_id::text);

-- ==============================================
-- 3. GRANT PERMISSIONS
-- ==============================================

-- Grant table permissions to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ==============================================
-- SUCCESS MESSAGE
-- ==============================================

SELECT '✅ Security fixes applied! RLS enabled on all tables.' as status;
