# send-expo-push

Delivers **remote** Expo push notifications (lock screen / banner) for new message alerts after the `notifications` row is inserted.

## Deploy

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set INTERNAL_PUSH_SECRET="$(openssl rand -hex 32)"
supabase functions deploy send-expo-push
```

`config.toml` sets `verify_jwt = false` so Postgres (`pg_net`) can call the function without a user JWT.

Copy the same secret into the database (see `docs/MESSAGE_PUSH_DELIVERY.md`).

## Required secrets

| Name | Description |
|------|-------------|
| `INTERNAL_PUSH_SECRET` | Shared with Postgres trigger config row; proves caller is your DB. |

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.
