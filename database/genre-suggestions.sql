-- ============================================================================
-- Genre suggestions (user-contributed genres)
-- ----------------------------------------------------------------------------
-- When a DJ types a custom genre during onboarding (or anywhere a genre picker
-- allows free text), we record it here. Two behaviours:
--   1. The genre is immediately available to everyone as a selectable option
--      (the "general mix options" pool) — see db.getGlobalGenres().
--   2. Each time the same genre is submitted we increment submission_count.
--      Once it crosses the escalation threshold it is flagged
--      status = 'submitted_to_portal' so the R/HOOD admin portal can review it
--      for official inclusion in the curated preset list.
--
-- Safe to run multiple times (idempotent).
-- ============================================================================

create table if not exists public.genre_suggestions (
  id                    uuid primary key default gen_random_uuid(),
  -- normalized key (lowercase, trimmed) used for de-duplication
  name_key              text not null unique,
  -- the display name as first submitted (Title Case preserved)
  display_name          text not null,
  submission_count      integer not null default 1,
  status                text not null default 'pending'
                          check (status in ('pending', 'submitted_to_portal', 'approved', 'rejected')),
  submitted_to_portal_at timestamptz,
  first_submitted_by    uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists idx_genre_suggestions_status
  on public.genre_suggestions (status);
create index if not exists idx_genre_suggestions_count
  on public.genre_suggestions (submission_count desc);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.genre_suggestions enable row level security;

-- Anyone authenticated can read the contributed-genre pool (to show options).
drop policy if exists "genre_suggestions_read" on public.genre_suggestions;
create policy "genre_suggestions_read"
  on public.genre_suggestions for select
  to authenticated
  using (true);

-- Writes go exclusively through the SECURITY DEFINER rpc below, so no direct
-- insert/update policy is granted to clients.

-- ── Submission RPC ──────────────────────────────────────────────────────────
-- Upserts a genre by normalized key, increments the counter, and escalates to
-- the portal once it reaches the threshold. Returns the resulting row.
create or replace function public.submit_genre_suggestion(p_name text)
returns public.genre_suggestions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_threshold constant integer := 5;  -- submissions needed to escalate to portal
  v_key       text;
  v_display   text;
  v_row       public.genre_suggestions;
begin
  -- Sanitize: collapse whitespace, trim, cap length.
  v_display := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  if length(v_display) = 0 or length(v_display) > 40 then
    return null;  -- ignore empty or absurdly long input
  end if;
  v_key := lower(v_display);

  insert into public.genre_suggestions (name_key, display_name, first_submitted_by)
  values (v_key, v_display, auth.uid())
  on conflict (name_key) do update
    set submission_count = public.genre_suggestions.submission_count + 1,
        updated_at = now()
  returning * into v_row;

  -- Escalate to the portal the moment it reaches the threshold (once).
  if v_row.submission_count >= v_threshold
     and v_row.status = 'pending' then
    update public.genre_suggestions
      set status = 'submitted_to_portal',
          submitted_to_portal_at = now(),
          updated_at = now()
      where id = v_row.id
      returning * into v_row;
  end if;

  return v_row;
end;
$$;

grant execute on function public.submit_genre_suggestion(text) to authenticated;
