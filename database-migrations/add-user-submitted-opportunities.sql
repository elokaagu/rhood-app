-- ============================================================================
-- User-submitted opportunities (Create tab → "Create an opportunity")
-- ----------------------------------------------------------------------------
-- DJs can now submit gigs from the app. Submissions are HELD FOR REVIEW: they
-- insert with is_active = false, so the swipe deck (which filters on
-- is_active = true) never shows them until a reviewer approves.
--
-- This means NO change is needed to any fetch path, and no existing row is
-- affected — moderation_status backfills to 'approved' for everything that is
-- already live.
--
-- Run in Supabase SQL Editor. Safe to run multiple times (idempotent).
-- ============================================================================

-- ── 0. Schema discovery — READ THE OUTPUT OF THIS FIRST ─────────────────────
-- docs/DATABASE_SCHEMA.md is out of date (it predates venue / event_start_time /
-- payment_currency / organizer_name), and three names for the organiser FK are
-- in circulation across the repo: created_by, posted_by, organizer_id.
-- These two queries show what this database ACTUALLY has. If `created_by` is
-- absent below but `posted_by`/`organizer_id` is present, tell the app which to
-- use before submitting a real opportunity (lib/opportunitySubmission.js writes
-- created_by).

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'opportunities'
ORDER BY ordinal_position;

-- Any CHECK constraint that could reject a submitted value (e.g. on skill_level).
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.opportunities'::regclass AND contype = 'c';

-- ── 1. Columns ──────────────────────────────────────────────────────────────

-- Existing rows backfill to 'approved' (they are already published).
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'approved';

-- Who submitted it from the app. NULL for rows created via R/HOOD Studio.
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Review bookkeeping.
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- The app writes created_by; add it if this project doesn't have it yet.
-- (The repo has three names in circulation for this concept — created_by is the
-- one used by the live create_gig_from_approved_application trigger and by
-- BrandGigsPortal, so it is the canonical one.)
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'opportunities_moderation_status_check'
  ) THEN
    ALTER TABLE public.opportunities
      ADD CONSTRAINT opportunities_moderation_status_check
      CHECK (moderation_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

COMMENT ON COLUMN public.opportunities.moderation_status IS
  'pending = awaiting review (never shown in the deck), approved = live, rejected = declined. Gating for the deck is is_active; this column is the review audit trail.';

-- Review queue lookup.
CREATE INDEX IF NOT EXISTS idx_opportunities_moderation_status
  ON public.opportunities (moderation_status)
  WHERE moderation_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_opportunities_submitted_by
  ON public.opportunities (submitted_by);

-- ── 2. Review helpers ───────────────────────────────────────────────────────
-- Approving publishes the row to the deck; rejecting leaves it invisible.

CREATE OR REPLACE FUNCTION public.approve_opportunity(opportunity_id UUID)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.opportunities
  SET moderation_status = 'approved',
      is_active = true,
      reviewed_at = now(),
      rejection_reason = NULL
  WHERE id = opportunity_id;
$$;

CREATE OR REPLACE FUNCTION public.reject_opportunity(opportunity_id UUID, reason TEXT DEFAULT NULL)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.opportunities
  SET moderation_status = 'rejected',
      is_active = false,
      reviewed_at = now(),
      rejection_reason = reason
  WHERE id = opportunity_id;
$$;

-- Only the service role / SQL Editor should approve. Do NOT grant to authenticated.
REVOKE ALL ON FUNCTION public.approve_opportunity(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_opportunity(UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- ── 3. Your review queue ────────────────────────────────────────────────────
-- Run this to see what's waiting:
--
--   SELECT id, title, venue, city, event_date, payment, payment_currency,
--          organizer_name, submitted_by, created_at
--   FROM public.opportunities
--   WHERE moderation_status = 'pending'
--   ORDER BY created_at DESC;
--
-- Then publish one with:
--   SELECT public.approve_opportunity('<uuid>');
-- Or decline it with:
--   SELECT public.reject_opportunity('<uuid>', 'Not enough detail');

-- Verify the migration applied.
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'opportunities'
  AND column_name IN ('moderation_status', 'submitted_by', 'reviewed_at', 'rejection_reason', 'created_by')
ORDER BY column_name;
