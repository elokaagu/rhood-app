# Security: `user_profiles` RLS lock-down — report

**Date:** 15 Oct 2026 · **Supabase project:** `jsmcduecuxtaqizhmiqo` (shared by the app, Studio, portal.rhood.io)
**Status:** migration written and tested locally. **Nothing has been applied to production.**

Files:
- `database-migrations/audit-rls-exposure-2026-10-15.sql`: read-only audit. **Run first and save the output.**
- `database-migrations/lock-down-user-profiles-rls-2026-10-15.sql`: the fix (one transaction, safe to re-run).

---

## 1. What's exposed today

**Confirmed live (15 Oct):** an unauthenticated REST request using only the anon key, the one
shipped inside the app bundle (`lib/supabase/supabaseConfig.js`), returned a member's full
`user_profiles` row, including **email, role, invite code, membership fields and names**. Anyone
who extracts the key from the IPA/APK can do the same for every member.

**Why, from the repo SQL:**

| Source | Policy | Effect |
| --- | --- | --- |
| Studio `supabase/migrations/20250923194525_….sql` | `"Anyone can view user profiles"`: `FOR SELECT USING (true)`, no `TO` role | Applies to `PUBLIC`, so the **anon key can read every profile** (matches what we saw) |
| Studio `supabase/migrations/RUN_ALL_CREDITS_MIGRATIONS.sql` | `"Admins can view / insert / update / delete user profiles"`: `USING (true)` / `WITH CHECK (true)`, no `TO` role, **no admin check** | If this file was ever run, **anyone with the anon key can edit or delete any profile**: set `credits`, `is_verified`, `role = 'admin'` |
| Same pattern on `opportunities`, `applications`, `mixes`, `messages`, `communities`, `community_members` | `"Admin(s) can …" USING (true)` | Anonymous read of **private messages and applications**, and anonymous edit/delete of listings |
| 4 migrations | `role TEXT DEFAULT 'admin' CHECK (role IN ('admin','brand'))` | If that default is live, **every new member is an admin**, so `is_admin_user()` and every Studio admin check treats DJs as staff. (DJJW's row reads `role = admin`; he may be staff, so verify with the audit.) |
| Studio `protect_dj_membership_columns` (live version) | skips the check when `auth.uid() IS NULL` | Anonymous requests bypass the membership-status guard |

The app repo already has `database-migrations/enable-rls-user-profiles.sql`, written for this
exact problem. The live behaviour shows it was **not applied**, or was overridden by the Studio
policies above. Postgres ORs permissive policies together, so one `USING (true)` policy defeats
every careful one.

**Demonstrated** on a local Postgres reproduction of those policies, using only the anon role:
read all profiles ✅, read private DMs ✅, set another DJ's credits to 999,999 ✅, rename a
listing ✅.

> I did not probe production writes, and the broader read probe of other tables was blocked by
> the safety check. Run the audit (§3) to see exactly which of these policies are live.

## 2. The fix (`lock-down-user-profiles-rls-2026-10-15.sql`)

1. **`is_admin_user()`**: same logic, plus a pinned `search_path` (SECURITY DEFINER hardening).
2. **No more admin-by-default:** drops the `role` column default (DJs = `NULL`, brands = `'brand'`
   via Studio's server routes).
3. **`user_profiles` reset to a known minimal set** (all existing policies dropped):
   - anon: **no access** (no policy + `REVOKE ALL`)
   - authenticated: read all profiles (*unchanged*; see Phase 2)
   - insert / update / delete: own row only, plus **brand teammates on their shared brand
     profile** (preserves Studio's `brand_teammate_access`)
   - admins (`is_admin_user()`): everything
4. **`guard_privileged_profile_columns` trigger:** end users can't set their own `role`,
   `credits`, `is_verified`, `is_rhood_approved_promoter`, `gigs_completed`, `rating` or
   `invite_code`. On insert these are reset to safe defaults; on update they're kept. The service
   role, the SQL editor and `SECURITY DEFINER` functions (credit awards, boosts, `process_referral`,
   membership RPCs) are unaffected.
5. **Every fake-admin policy** (`Admin…` with condition `true`) on the six other tables is rewritten,
   same name and command, as `TO authenticated USING/WITH CHECK (is_admin_user())`.

### Tested (local Postgres 14 with a Supabase-like stub of the current policies)

| Who | Attempt | Before | After |
| --- | --- | --- | --- |
| anon | read profiles | 3 rows | **permission denied** |
| anon | read DMs | 1 row | 0 |
| anon | edit a listing / another DJ's credits | succeeded | blocked |
| DJ (signed in) | load other profiles (Discover) | ✓ | ✓ |
| DJ | edit own bio | ✓ | ✓ |
| DJ | set own credits / role / verified | — | silently kept at old values |
| DJ | edit another DJ | — | blocked |
| DJ | read DMs via fake-admin policy | — | blocked |
| New signup | insert own row as admin / 5000 credits / verified / promoter | — | role null, 0, false, false |
| `SECURITY DEFINER` credit award | +5 credits | ✓ | ✓ |
| Staff admin | verify a DJ, set credits, read DMs | ✓ | ✓ |
| Service role (Studio API) | set role = brand | ✓ | ✓ |

The migration also re-runs cleanly (idempotent).

## 3. How to apply

1. Supabase → SQL Editor → run **`audit-rls-exposure-2026-10-15.sql`**. Export blocks 2 and 6.
2. Read block 4/5. **If `role` defaults to `'admin'`, or the admin list contains ordinary DJs,** fill
   in the allowlist in the commented-out section at the bottom of the migration. Run it straight
   after the migration; otherwise `is_admin_user()` still treats those DJs as admins, and the
   authenticated-side fixes mean little.
3. Run **`lock-down-user-profiles-rls-2026-10-15.sql`** and check its three verify queries
   (5 policies on `user_profiles`; 0 fake-admin policies; no anon grants).
4. Smoke test:
   - App: sign in, open Discover / Connections / a DM thread, edit profile, apply to a gig, boost.
   - App: forgot password and resend confirmation (they do an anonymous email-case lookup that
     now returns nothing and falls back to the typed email, which is expected and fine).
   - Studio: admin members list, edit a member, approve a DJ, brand teammate edits brand profile.
   - Public mix share page (reads `mixes` only, so it's unaffected).

**Rollback:** recreate the policies from your block-2 export, `DROP TRIGGER
guard_privileged_profile_columns ON public.user_profiles`, and
`GRANT SELECT ON public.user_profiles TO anon` only if you really need it.

## 4. Phase 2: still open after this migration

Signed-in members can still read *other* members' `email`, `phone`, `credits`, `invite_code`
and `role` with a crafted query. RLS is row-level, and today's app reads other users straight from
`user_profiles` (Discover, Connections, Messages, the signup duplicate-email check, and the
opportunity `organizer:user_profiles(...)` join).

Fix, in order:
1. Make `user_profiles_public` a **security-definer view** (it's `security_invoker` today, so it
   only works while the base table is fully readable) exposing only public columns, with the
   existing `show_email` / `show_phone` masking.
2. Move every "other user" read in the app and Studio to that view. Replace the signup
   duplicate-email check and the login email-case lookups with one RPC (they're also an
   account-enumeration leak).
3. Ship the app update. Once old versions are rare, change `user_profiles_select_authenticated`
   to `USING (auth.uid() = id OR is_admin_user())`.

## 5. Also noticed

- `opportunities` row 917d5c6b… (Meet me at the Hotel) has `moderation_status = 'pending'` but is
  live in the app, and its description URL has a typo (`meetmeatthehktel.com`).
- The `role` CHECK only allows `admin` / `brand`; consider adding `'dj'` and making it NOT NULL,
  so role intent is explicit.
