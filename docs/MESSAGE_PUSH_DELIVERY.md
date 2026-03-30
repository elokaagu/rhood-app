# Lock-screen push for new messages

New direct-message alerts are stored in `notifications` (existing trigger). This path adds a **server-side** Expo push so alerts appear on the **lock screen** when the app is backgrounded.

## Architecture

1. `INSERT` into `notifications` with `type = 'message'` (after your `notify_new_message` trigger runs).
2. Trigger `queue_expo_push_after_message_notification` calls `net.http_post` (async, after commit).
3. Edge Function `send-expo-push` verifies `x-internal-secret`, checks `user_settings.push_notifications` and `message_notifications`, loads `user_expo_tokens`, posts to Expo’s Push API, and prunes dead tokens.

## One-time setup

### 1. Enable `pg_net`

Supabase Dashboard → **Database** → **Extensions** → enable **pg_net**.

### 2. Run the SQL migration

In the SQL editor, run:

`database/queue-expo-push-on-message-notification.sql`

If you use a different Supabase project than the default in this repo, update the row:

```sql
UPDATE public.expo_push_delivery_config
SET edge_function_url = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-expo-push'
WHERE id = 1;
```

### 3. Deploy the Edge Function

```bash
cd /path/to/rhoodapp
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set INTERNAL_PUSH_SECRET="$(openssl rand -hex 32)"
supabase functions deploy send-expo-push
```

`config.toml` sets `verify_jwt = false` because Postgres does not send a user JWT.

### 4. Store the same secret in Postgres

The trigger must send the same value the function expects:

```sql
UPDATE public.expo_push_delivery_config
SET internal_secret = 'paste-the-exact-INTERNAL_PUSH_SECRET-value'
WHERE id = 1;
```

Keep this secret private. Do not commit it to git.

### 5. Confirm `notify_new_message` respects message opt-in

Your database should use a `notify_new_message` implementation that only inserts a `notifications` row when the receiver has **`message_notifications`** enabled (see `database-migrations/update-message-notification-preference-check.sql`). If an older trigger inserts message notifications for everyone, they would all get push as well.

## Verification

- Send a DM to a user who has **Push** and **Message** toggles on, with a **development/production** build (not Expo Go), on a **physical device**, app **backgrounded**.
- Inspect `net._http_response` in the SQL editor for failed HTTP calls (status ≥ 400 or `error_msg` set).
- Edge Function logs: Dashboard → Edge Functions → `send-expo-push` → Logs.

## Tap → open chat

The Edge Function loads `sender_id` from `messages` using `related_id` and attaches it to the push `data` payload so `App.js` can open the correct DM.

## Related docs

- `docs/PUSH_NOTIFICATIONS_GUIDE.md` — tokens, client registration, application-status pushes.
