# Chat Assistant Edge Function

This Supabase Edge Function proxies OpenAI API requests for the R/HOOD help chat assistant, keeping the API key secure on the server.

## Setup Instructions

### 1. Install Supabase CLI (if not already installed)

```bash
npm install -g supabase
```

### 2. Login to Supabase

```bash
supabase login
```

### 3. Link Your Project

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

You can find your project ref in the Supabase Dashboard URL: `https://app.supabase.com/project/YOUR_PROJECT_REF`

### 4. Set Environment Variables (Secrets)

Set the OpenAI API key as a Supabase secret:

```bash
supabase secrets set OPENAI_API_KEY=sk-proj-...
```

Optionally set a custom model:

```bash
supabase secrets set OPENAI_MODEL=gpt-4o-mini
```

**Or via Dashboard:**
1. Go to your Supabase Dashboard
2. Navigate to **Project Settings** → **Edge Functions** → **Secrets**
3. Add:
   - `OPENAI_API_KEY` = your OpenAI API key
   - `OPENAI_MODEL` = `gpt-4o-mini` (optional, defaults to this)

### 5. Deploy the Function

```bash
supabase functions deploy chat-assistant
```

### 6. Test the Function

You can test it locally first:

```bash
supabase functions serve chat-assistant
```

Then test with:

```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/chat-assistant' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{
    "userMessage": "How do credits work?",
    "history": []
  }'
```

## How It Works

1. The mobile app calls `supabase.functions.invoke("chat-assistant", {...})`
2. The Edge Function:
   - Verifies the user is authenticated
   - Retrieves the OpenAI API key from Supabase secrets
   - Calls OpenAI API with the user's message and context
   - Returns the assistant's response

## Security

- ✅ API key is stored securely in Supabase secrets (never exposed to client)
- ✅ Function requires user authentication
- ✅ CORS is properly configured
- ✅ Errors are handled gracefully

## Troubleshooting

**Function not found:**
- Make sure you've deployed: `supabase functions deploy chat-assistant`
- Check the function name matches exactly: `chat-assistant`

**401 Unauthorized:**
- Ensure the user is logged in
- Check that the Authorization header is being sent

**503 Service Unavailable:**
- Verify `OPENAI_API_KEY` is set in Supabase secrets
- Check Supabase Dashboard → Edge Functions → Secrets

**500 Internal Server Error:**
- Check Supabase Edge Function logs in the Dashboard
- Verify OpenAI API key is valid and has credits

