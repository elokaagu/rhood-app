-- ============================================================================
-- Award credits to the DJ who submitted an opportunity, once someone else's
-- application through it turns into a completed gig
-- ----------------------------------------------------------------------------
-- Flow this hooks into:
--   1. A DJ submits an opportunity from the app (lib/opportunitySubmission.js)
--      → opportunities.submitted_by = that DJ's id.
--      (Brand/Studio-created rows leave submitted_by NULL — see
--      add-user-submitted-opportunities.sql's own comment on that column —
--      so this migration never fires for portal-posted opportunities.)
--   2. Another DJ applies and the brand approves them → the existing
--      create_gig_from_approved_application() trigger
--      (database/create-gig-on-application-approval.sql) creates a `gigs`
--      row with status='upcoming'.
--   3. The brand marks the gig completed from BrandGigsPortal
--      (`db.updateGig(gigId, { status: 'completed', dj_rating })`).
--
-- Step 3 previously had zero server-side side effects. This adds a trigger
-- on that exact transition that credits the ORIGINAL SUBMITTER (not the DJ
-- who performed the gig — they don't need crediting for their own gig) with
-- CREDITS_TO_AWARD credits, exactly once per gig (guarded by a boolean flag,
-- same dedup shape as process_referral's UNIQUE(referred_id) guard).
--
-- Run in Supabase SQL Editor.
-- ============================================================================

-- ── 1. Idempotency guard column ─────────────────────────────────────────────
ALTER TABLE public.gigs
  ADD COLUMN IF NOT EXISTS submitter_credit_awarded BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 2. Trigger function ──────────────────────────────────────────────────────
-- BEFORE (not AFTER) so it can stamp submitter_credit_awarded and
-- completed_at onto NEW as part of the same row write, instead of issuing a
-- second UPDATE that would re-fire this same trigger.
CREATE OR REPLACE FUNCTION public.award_opportunity_submitter_credit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submitter_id UUID;
  v_credits_to_award CONSTANT INTEGER := 15;
BEGIN
  -- completed_at was already part of the gigs schema (see
  -- create-gig-on-application-approval.sql) but nothing ever set it —
  -- BrandGigsPortal's completion update only touches status/dj_rating.
  IF NEW.completed_at IS NULL THEN
    NEW.completed_at := NOW();
  END IF;

  IF NEW.submitter_credit_awarded THEN
    RETURN NEW;
  END IF;

  SELECT o.submitted_by INTO v_submitter_id
  FROM public.opportunities o
  WHERE o.id = NEW.opportunity_id;

  -- Only award when: someone submitted it via the app (not a brand/Studio
  -- row), and it wasn't the performing DJ crediting themselves for their
  -- own gig.
  IF v_submitter_id IS NOT NULL AND v_submitter_id IS DISTINCT FROM NEW.dj_id THEN
    UPDATE public.user_profiles
    SET credits = COALESCE(credits, 0) + v_credits_to_award,
        updated_at = NOW()
    WHERE id = v_submitter_id;

    INSERT INTO public.notifications (user_id, title, message, type, related_id, is_read)
    VALUES (
      v_submitter_id,
      'You earned credits!',
      'A DJ completed a gig through an opportunity you posted — you earned ' ||
        v_credits_to_award || ' credits.',
      'credit_earned',
      NEW.id,
      false
    );

    NEW.submitter_credit_awarded := TRUE;
  END IF;

  RETURN NEW;
END;
$$;

-- ── 3. Trigger ────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trigger_award_opportunity_submitter_credit ON public.gigs;
CREATE TRIGGER trigger_award_opportunity_submitter_credit
BEFORE UPDATE OF status ON public.gigs
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
EXECUTE FUNCTION public.award_opportunity_submitter_credit();

COMMENT ON FUNCTION public.award_opportunity_submitter_credit() IS
  'Credits the DJ who submitted an opportunity (opportunities.submitted_by) when a gig created from it is marked completed, once per gig.';

-- ── 4. Verify ────────────────────────────────────────────────────────────
-- Should show the new trigger:
--   SELECT tgname, tgrelid::regclass, tgenabled
--   FROM pg_trigger
--   WHERE tgname = 'trigger_award_opportunity_submitter_credit';
--
-- To manually test end-to-end against a real row (replace the id):
--   UPDATE public.gigs SET status = 'completed' WHERE id = '<some upcoming gig id>';
--   -- then check the submitter's balance went up by 15:
--   SELECT credits FROM public.user_profiles WHERE id = (
--     SELECT submitted_by FROM public.opportunities WHERE id = (
--       SELECT opportunity_id FROM public.gigs WHERE id = '<same gig id>'
--     )
--   );
