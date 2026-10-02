-- Daily cap for Help chat AI requests. Written and read only by the
-- chat-assistant Edge Function with the service role; clients have no access.

create table if not exists public.ai_chat_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists ai_chat_usage_user_created_idx
  on public.ai_chat_usage (user_id, created_at desc);

alter table public.ai_chat_usage enable row level security;
revoke all on public.ai_chat_usage from anon, authenticated;
