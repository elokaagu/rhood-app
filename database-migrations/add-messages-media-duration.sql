-- Optional: persist media duration (milliseconds) for chat attachments.
-- Run in Supabase SQL Editor when you want a dedicated column; the app omits
-- `duration` on insert until this exists (avoids PostgREST schema cache errors).
--
-- After applying, you may add `duration: mediaItem.duration` back to
-- `mapMediaToDirectRow` / `mapMediaToGroupRow` in sendMessagesOperations.js.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS duration BIGINT;

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS duration BIGINT;

COMMENT ON COLUMN public.messages.duration IS 'Attachment duration in ms (audio/video); NULL otherwise.';
COMMENT ON COLUMN public.community_posts.duration IS 'Attachment duration in ms (audio/video); NULL otherwise.';
