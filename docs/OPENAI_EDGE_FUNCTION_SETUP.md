# OpenAI Edge Function Setup Guide

This guide explains how to set up the secure OpenAI proxy using Supabase Edge Functions.

## Why Use Edge Functions?

- ✅ **Security**: API key stays on the server, never exposed to client
- ✅ **Cost Control**: Can add rate limiting and usage tracking
- ✅ **Reliability**: Centralized error handling and logging
- ✅ **Scalability**: Supabase handles infrastructure

## Quick Setup

### 1. Install Supabase CLI

```bash
npm install -g supabase
```

### 2. Login and Link Project

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Find your project ref in your Supabase Dashboard URL: `https://app.supabase.com/project/YOUR_PROJECT_REF`

### 3. Set OpenAI API Key as Secret

**Via CLI:**
```bash
supabase secrets set OPENAI_API_KEY=sk-proj-...
```

**Via Dashboard:**
1. Go to **Project Settings** → **Edge Functions** → **Secrets**
2. Add `OPENAI_API_KEY` with your OpenAI API key value
3. (Optional) Add `OPENAI_MODEL` = `gpt-4o-mini`

### 4. Deploy the Function

```bash
supabase functions deploy chat-assistant
```

### 5. Test It

The app will automatically use the Edge Function. To test manually:

```bash
supabase functions serve chat-assistant
```

Then test with curl (replace `YOUR_ANON_KEY`):

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

1. **Mobile App** calls `supabase.functions.invoke("chat-assistant", {...})`
2. **Edge Function**:
   - Verifies user authentication
   - Retrieves `OPENAI_API_KEY` from Supabase secrets
   - Calls OpenAI API with user message + KB context
   - Returns formatted response
3. **Mobile App** displays the response with Markdown rendering

## Fallback Behavior

If the Edge Function is unavailable, the app will:
- Try direct OpenAI (if `EXPO_PUBLIC_OPENAI_API_KEY` is set locally)
- Show a helpful error message asking user to contact support

## Troubleshooting

### Function Not Found (404)
- Ensure you've deployed: `supabase functions deploy chat-assistant`
- Check function name matches exactly: `chat-assistant`

### Unauthorized (401)
- User must be logged in
- Check that Authorization header is being sent from the app

### Service Unavailable (503)
- Verify `OPENAI_API_KEY` is set in Supabase secrets
- Check Dashboard → Edge Functions → Secrets

### Internal Server Error (500)
- Check Edge Function logs in Supabase Dashboard
- Verify OpenAI API key is valid and has credits
- Check function logs: `supabase functions logs chat-assistant`

## Local Development

For local development, you can temporarily use direct OpenAI:

1. Set `USE_EDGE_FUNCTION = false` in `lib/aiChat.js`
2. Set `EXPO_PUBLIC_OPENAI_API_KEY` in your `.env` file
3. Restart the dev server

**⚠️ Never commit API keys to git!**

## Production Checklist

- [ ] Edge Function deployed: `supabase functions deploy chat-assistant`
- [ ] `OPENAI_API_KEY` set in Supabase secrets
- [ ] `USE_EDGE_FUNCTION = true` in `lib/aiChat.js`
- [ ] Tested with real user authentication
- [ ] Error handling verified
- [ ] Rate limiting considered (if needed)

## Security Notes

- ✅ API key is never exposed to client code
- ✅ Function requires authenticated users
- ✅ CORS is properly configured
- ✅ Errors don't leak sensitive information

## Next Steps

- Consider adding rate limiting per user
- Add usage analytics/tracking
- Set up monitoring/alerts for function errors
- Consider caching common responses

