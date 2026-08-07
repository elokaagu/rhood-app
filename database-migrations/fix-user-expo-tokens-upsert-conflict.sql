-- ============================================================================
-- Fix: registerExpoToken's upsert has no conflict target, so it always
-- INSERTs a new row instead of updating the existing one for that device
-- ----------------------------------------------------------------------------
-- lib/notificationService.js's registerExpoToken() does:
--   supabase.from("user_expo_tokens").upsert({ user_id, expo_token,
--     device_id, platform, updated_at })
-- with no `onConflict`. Supabase's default upsert conflict target is the
-- primary key — `id`, an auto-generated UUID never included in the payload
-- — so it can never match an existing row. Every app launch/auth init calls
-- this (App.js's push setup), so every launch adds a brand-new row for the
-- same user+device instead of refreshing the existing one.
--
-- This doesn't cause duplicate pushes today (both send paths dedupe tokens
-- before sending), but it grows the table unboundedly and defeats the
-- intended "keep one row per device, freshen its timestamp" semantics.
--
-- Fix has two parts:
--   1. De-duplicate existing rows per (user_id, device_id), keeping the
--      most recently updated one — a UNIQUE constraint can't be added over
--      existing duplicates.
--   2. Add that UNIQUE constraint, so a future `onConflict: "user_id,
--      device_id"` upsert (see the paired app-code change) actually matches.
--
-- device_id is nullable (older app versions before installId existed, or
-- environments where it can't be read) — Postgres treats every NULL as
-- distinct for uniqueness purposes, so legacy NULL-device_id rows are left
-- as-is rather than merged; they're a fixed, non-growing set since every
-- current call site always supplies a real device_id.
--
-- Run in Supabase SQL Editor. Safe to run multiple times (idempotent).
-- ============================================================================

-- ── 1. De-duplicate ──────────────────────────────────────────────────────
DELETE FROM public.user_expo_tokens t
WHERE t.device_id IS NOT NULL
  AND t.id NOT IN (
    SELECT DISTINCT ON (user_id, device_id) id
    FROM public.user_expo_tokens
    WHERE device_id IS NOT NULL
    ORDER BY user_id, device_id, updated_at DESC NULLS LAST, id DESC
  );

-- ── 2. Add the unique constraint the app-code fix relies on ────────────────
DO $$
BEGIN
  ALTER TABLE public.user_expo_tokens
    ADD CONSTRAINT user_expo_tokens_user_device_key UNIQUE (user_id, device_id);
EXCEPTION WHEN duplicate_object THEN
  NULL; -- already added — fine
END;
$$;

-- Verify: should show the new constraint.
SELECT conname, contype
FROM pg_constraint
WHERE conname = 'user_expo_tokens_user_device_key';

-- Verify: should return 0 rows (no remaining duplicates on non-null device_id).
SELECT user_id, device_id, COUNT(*)
FROM public.user_expo_tokens
WHERE device_id IS NOT NULL
GROUP BY user_id, device_id
HAVING COUNT(*) > 1;
