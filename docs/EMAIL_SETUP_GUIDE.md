# Email Setup Guide for Application Notifications

This guide explains how to set up email notifications when applications are approved or rejected.

## Overview

When an application is approved or rejected, the system will:
1. ✅ Send an in-app notification (already working)
2. ✅ Send a push notification (already working)
3. ✅ Send an email notification (requires setup)

## Setup Options

### Option 1: Supabase Edge Function (Recommended)

This is the recommended approach as it keeps your API keys secure and server-side.

#### Step 1: Create Edge Function

1. Install Supabase CLI (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. Initialize Supabase in your project (if not already done):
   ```bash
   supabase init
   ```

3. Create the email Edge Function:
   ```bash
   supabase functions new send-email
   ```

4. Create the function code at `supabase/functions/send-email/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'R/HOOD <noreply@rhood.app>'

serve(async (req) => {
  try {
    const { to, subject, html, text } = await req.json()

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: to,
        subject: subject,
        html: html || text,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Failed to send email')
    }

    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  }
})
```

#### Step 2: Set Up Resend Account

1. Go to [resend.com](https://resend.com) and create an account
2. Get your API key from the dashboard
3. Verify your domain (or use Resend's test domain for development)

#### Step 3: Configure Supabase Secrets

1. Set the Resend API key in Supabase:
   ```bash
   supabase secrets set RESEND_API_KEY=your_resend_api_key_here
   supabase secrets set FROM_EMAIL="R/HOOD <noreply@rhood.app>"
   ```

2. Or set them in the Supabase Dashboard:
   - Go to Project Settings → Edge Functions → Secrets
   - Add `RESEND_API_KEY` and `FROM_EMAIL`

#### Step 4: Deploy Edge Function

```bash
supabase functions deploy send-email
```

### Option 2: Direct API Call (Alternative)

If you prefer not to use Edge Functions, you can modify `lib/emailService.js` to call Resend directly:

1. Get your Resend API key
2. Update `lib/emailService.js` to uncomment and configure the direct API call section
3. Store the API key securely (use environment variables or Supabase Vault)

**Note:** This approach exposes your API key in the client code, which is less secure. Use Edge Functions for production.

### Option 3: Other Email Services

You can use other email services like:
- **SendGrid**: Similar setup, replace Resend API with SendGrid
- **Mailgun**: Similar setup, replace Resend API with Mailgun
- **AWS SES**: More complex but very scalable

## Testing

After setup, test the email functionality:

1. Go to the Admin Applications screen
2. Approve or reject an application
3. Check the applicant's email inbox
4. Verify the email was sent successfully

## Database Migration

Run the database migration to update the trigger:

```sql
-- Run this in Supabase SQL Editor
-- File: database/add-application-email-notifications.sql
```

This migration:
- Updates the application status change trigger
- Adds email sending functionality (placeholder for now)
- Maintains backward compatibility with existing notifications

## Troubleshooting

### Emails not sending

1. **Check Edge Function logs**: Go to Supabase Dashboard → Edge Functions → Logs
2. **Verify API key**: Make sure `RESEND_API_KEY` is set correctly
3. **Check email address**: Ensure the applicant has a valid email in their profile
4. **Check Resend dashboard**: Look for any errors or rate limits

### Edge Function not found

If you see "Edge Function not found" errors:
1. Make sure you've deployed the function: `supabase functions deploy send-email`
2. Check the function name matches exactly: `send-email`
3. Verify you're calling it from the correct Supabase project

### API Key errors

1. Verify your Resend API key is valid
2. Check that the key has permission to send emails
3. Make sure the key is set in Supabase secrets (not hardcoded)

## Current Implementation

The current implementation:
- ✅ Sends emails when applications are approved
- ✅ Sends emails when applications are rejected
- ✅ Includes applicant name and opportunity title
- ✅ Has HTML and plain text versions
- ✅ Gracefully handles email failures (won't break the approval process)

## Next Steps

1. Set up Resend account (or another email service)
2. Create and deploy the Edge Function
3. Configure API keys in Supabase
4. Test with a real application approval
5. Monitor email delivery rates













