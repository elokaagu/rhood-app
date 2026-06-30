-- ============================================================================
-- Fix CRITICAL Supabase security advisor findings (Security Definer View)
-- ----------------------------------------------------------------------------
-- v_opportunity, ai_matching_summary, ai_feedback_analysis currently run with
-- the view owner's privileges for every querying user, bypassing that user's
-- own RLS. Switching to security_invoker makes each view run with the
-- privileges of whoever is querying it, so RLS applies normally.
--
-- None of these views are queried directly by app code (grep across
-- lib/ + components/ found no references), so this should be safe. If any of
-- the three is used by a service-role-only backend job, this change has no
-- effect there since the service role bypasses RLS regardless of this flag.
--
-- Run in Supabase SQL Editor. Safe to run multiple times (idempotent).
-- After running, spot-check anything that reads these views still works.
-- ============================================================================

ALTER VIEW public.v_opportunity SET (security_invoker = true);
ALTER VIEW public.ai_matching_summary SET (security_invoker = true);
ALTER VIEW public.ai_feedback_analysis SET (security_invoker = true);

-- Verify: security_invoker should be "true" for all three.
SELECT
  c.relname AS view_name,
  c.reloptions
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('v_opportunity', 'ai_matching_summary', 'ai_feedback_analysis');
