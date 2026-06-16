-- Set the internal secret in expo_push_delivery_config so the pg_net trigger
-- (queue_expo_push_after_message_notification) can authenticate to send-expo-push.
--
-- Replace <INTERNAL_PUSH_SECRET> with the value from:
--   Supabase Dashboard → Edge Functions → Secrets → INTERNAL_PUSH_SECRET
-- Run in Supabase SQL Editor (requires service role / postgres role).

UPDATE public.expo_push_delivery_config
SET internal_secret = '<INTERNAL_PUSH_SECRET>'
WHERE id = 1;

-- Verify
SELECT
  edge_function_url,
  CASE WHEN length(trim(internal_secret)) > 0 THEN 'set ✓' ELSE 'MISSING ✗' END AS secret_status
FROM public.expo_push_delivery_config
WHERE id = 1;
