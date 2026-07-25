-- ============================================================================
-- OPTIONAL HARDENING — enable RLS on public.opportunities
-- ----------------------------------------------------------------------------
-- ⚠️  READ THIS BEFORE RUNNING. Do not run it blind.
--
-- WHY: public.opportunities currently has NO row level security and NO policies.
-- Anyone holding the anon key (which ships inside the mobile app and is
-- therefore public) can INSERT, UPDATE or DELETE any opportunity — including
-- publishing one straight into every DJ's swipe deck with is_active = true.
-- scripts/seed-opportunities.js demonstrates exactly this working today.
--
-- The in-app submission form holds submissions for review, but that gate is
-- CLIENT-SIDE ONLY until this file is applied.
--
-- ⚠️  RISK: R/HOOD Studio (the separate web admin) also writes to this table.
-- If Studio writes using the ANON key rather than the service role key,
-- enabling RLS WILL BREAK opportunity creation in Studio.
--
-- BEFORE RUNNING:
--   1. Confirm R/HOOD Studio uses the SERVICE ROLE key for writes (service role
--      bypasses RLS entirely, so it is unaffected).
--   2. If Studio uses the anon key, either switch it to the service role key
--      first, or add a policy for its account below.
--   3. Note scripts/seed-opportunities.js will stop working (it uses anon).
--
-- ROLLBACK (instant, if anything breaks):
--   ALTER TABLE public.opportunities DISABLE ROW LEVEL SECURITY;
--
-- Safe to run multiple times (idempotent).
-- ============================================================================

-- ── Reads: unchanged behaviour ──────────────────────────────────────────────
-- The deck must keep working, so reading stays open exactly as it is today.
-- Pending submissions are still invisible because the deck filters is_active.

DROP POLICY IF EXISTS "opportunities_select_all" ON public.opportunities;
CREATE POLICY "opportunities_select_all" ON public.opportunities
  FOR SELECT
  USING (true);

-- ── Writes: users may only submit unpublished rows for themselves ───────────
-- WITH CHECK enforces the moderation gate in the database, so a crafted client
-- cannot publish straight to the deck.

DROP POLICY IF EXISTS "opportunities_insert_own_pending" ON public.opportunities;
CREATE POLICY "opportunities_insert_own_pending" ON public.opportunities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    submitted_by = (select auth.uid())
    AND is_active = false
    AND moderation_status = 'pending'
  );

-- Users can edit their own submission only while it is still pending, and
-- cannot flip it live or reassign it.
DROP POLICY IF EXISTS "opportunities_update_own_pending" ON public.opportunities;
CREATE POLICY "opportunities_update_own_pending" ON public.opportunities
  FOR UPDATE
  TO authenticated
  USING (
    submitted_by = (select auth.uid())
    AND moderation_status = 'pending'
  )
  WITH CHECK (
    submitted_by = (select auth.uid())
    AND is_active = false
    AND moderation_status = 'pending'
  );

DROP POLICY IF EXISTS "opportunities_delete_own_pending" ON public.opportunities;
CREATE POLICY "opportunities_delete_own_pending" ON public.opportunities
  FOR DELETE
  TO authenticated
  USING (
    submitted_by = (select auth.uid())
    AND moderation_status = 'pending'
  );

-- ── Flip it on ──────────────────────────────────────────────────────────────
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

-- Verify: rowsecurity should be true, and four policies listed.
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'opportunities';

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'opportunities'
ORDER BY policyname;

-- Smoke test after running — the deck must still return rows:
--   SELECT count(*) FROM public.opportunities WHERE is_active = true;
