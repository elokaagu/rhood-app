-- Fix: in-app feedback inserted into product_feedback was invisible on the portal when
-- the portal uses the Supabase client with an admin JWT (not the service role).
-- RLS previously allowed SELECT only for auth.uid() = user_id, so staff only saw their own rows.
--
-- Run in Supabase SQL editor after add-product-feedback.sql.
-- Staff match: @rhood.io profile email or JWT email, OR app_metadata.is_portal_staff = true,
-- OR app_metadata.role in (admin, staff, portal).

CREATE OR REPLACE FUNCTION public.is_rhood_portal_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = (SELECT auth.uid())
        AND lower(trim(up.email)) ~ '^[^@\s]+@rhood\.io$'
    )
    OR lower(coalesce((SELECT auth.jwt()) ->> 'email', '')) ~ '^[^@\s]+@rhood\.io$'
    OR coalesce(
      ((SELECT auth.jwt()) -> 'app_metadata' ->> 'is_portal_staff')::boolean,
      false
    )
    OR (SELECT auth.jwt()) -> 'app_metadata' ->> 'role' IN ('admin', 'staff', 'portal');
$$;

REVOKE ALL ON FUNCTION public.is_rhood_portal_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_rhood_portal_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_rhood_portal_staff() TO service_role;

DROP POLICY IF EXISTS "product_feedback_select_portal_staff" ON public.product_feedback;
CREATE POLICY "product_feedback_select_portal_staff"
  ON public.product_feedback
  FOR SELECT
  TO authenticated
  USING (public.is_rhood_portal_staff());

DROP POLICY IF EXISTS "product_feedback_update_portal_staff" ON public.product_feedback;
CREATE POLICY "product_feedback_update_portal_staff"
  ON public.product_feedback
  FOR UPDATE
  TO authenticated
  USING (public.is_rhood_portal_staff())
  WITH CHECK (public.is_rhood_portal_staff());

COMMENT ON FUNCTION public.is_rhood_portal_staff() IS
  'True for R/HOOD portal users who may read/update all product_feedback rows (RLS).';
