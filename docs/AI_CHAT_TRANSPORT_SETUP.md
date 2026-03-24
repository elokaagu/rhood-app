# AI Chat Transport Setup

This app supports two transport modes for `lib/aiChat.js`:

- `edge_function` / `backend_endpoint` (recommended for production)
- `openai_direct` (development-only fallback)

## App Config Keys (`app.json` -> `expo.extra`)

```json
{
  "aiChatTransport": "edge_function",
  "aiChatEndpoint": "https://<your-project>.functions.supabase.co/chat-assistant",
  "aiChatEndpointAuthToken": "",
  "aiChatAllowDirectFallback": false,
  "aiChatAllowClientDirectInProduction": false
}
```

## Key Behavior

- `aiChatTransport`
  - `edge_function` or `backend_endpoint`: app calls your backend URL.
  - `openai_direct`: app calls OpenAI directly (avoid in production).

- `aiChatEndpoint`
  - Required for backend/edge modes.
  - If missing, the assistant returns a safe user-facing support message.

- `aiChatEndpointAuthToken`
  - Optional bearer token sent as `Authorization: Bearer <token>`.

- `aiChatAllowDirectFallback`
  - If `true`, backend/edge failures can fall back to direct OpenAI.
  - Keep `false` in production for security.

- `aiChatAllowClientDirectInProduction`
  - If `false`, direct OpenAI is blocked in production builds even if transport is set to `openai_direct`.
  - Keep `false` unless you explicitly accept client-side key exposure risk.

## Expected Endpoint Contract

`POST` JSON body:

```json
{
  "model": "gpt-4o-mini",
  "messages": [{ "role": "system", "content": "..." }],
  "max_tokens": 500,
  "temperature": 0.7
}
```

Response can be any of:

- `{ "text": "..." }`
- `{ "content": "..." }`
- `{ "reply": "..." }`
- OpenAI-like shape with `choices[0].message.content`

## Production Recommendation

- Use `edge_function` transport.
- Keep `aiChatAllowDirectFallback` set to `false`.
- Keep `aiChatAllowClientDirectInProduction` set to `false`.
- Do not ship `EXPO_PUBLIC_OPENAI_API_KEY` in production builds.
