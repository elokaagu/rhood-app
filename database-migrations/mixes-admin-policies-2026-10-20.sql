-- The "Admins can … mixes" policies used USING (true) / WITH CHECK (true) for
-- role public, so anyone holding the anon key could read private mixes and
-- insert, edit or delete any mix. Require an admin profile instead. DJs keep
-- full control of their own mixes through the *_own policies.

DROP POLICY IF EXISTS "Admins can view all mixes" ON public.mixes;
CREATE POLICY "Admins can view all mixes" ON public.mixes
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS "Admins can insert mixes" ON public.mixes;
CREATE POLICY "Admins can insert mixes" ON public.mixes
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS "Admins can update mixes" ON public.mixes;
CREATE POLICY "Admins can update mixes" ON public.mixes
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

DROP POLICY IF EXISTS "Admins can delete mixes" ON public.mixes;
CREATE POLICY "Admins can delete mixes" ON public.mixes
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles p
    WHERE p.id = auth.uid() AND p.role = 'admin'
  ));
