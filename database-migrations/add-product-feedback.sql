-- Product feedback from the mobile app; same rows power the R/HOOD admin portal.
-- Run in Supabase SQL editor (or your migration pipeline).
-- Portal: SELECT * FROM product_feedback ORDER BY created_at DESC;

CREATE TABLE IF NOT EXISTS public.product_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(trim(body)) > 0),
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('idea', 'bug', 'general', 'other')),
  app_version TEXT,
  platform TEXT,
  status TEXT NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'reviewed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_feedback_created_at
  ON public.product_feedback (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_feedback_status
  ON public.product_feedback (status);

ALTER TABLE public.product_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "product_feedback_insert_own"
  ON public.product_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "product_feedback_select_own"
  ON public.product_feedback
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE public.product_feedback IS
  'In-app product feedback; visible to full admins via service role in the R/HOOD portal.';
