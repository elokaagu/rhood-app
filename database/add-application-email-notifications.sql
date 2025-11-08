-- Add email notifications for application approvals
-- This migration adds email sending functionality when applications are approved
-- Run this in your Supabase SQL Editor

-- 1. Enable pg_net extension if not already enabled (for HTTP requests)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Create function to send email notification
CREATE OR REPLACE FUNCTION send_application_approval_email(
  applicant_email TEXT,
  applicant_name TEXT,
  opportunity_title TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  email_subject TEXT;
  email_body TEXT;
  email_api_url TEXT;
  email_api_key TEXT;
  response_status INT;
BEGIN
  -- Get email API configuration from secrets (you'll need to set these in Supabase)
  -- For now, we'll use environment variables or you can hardcode for testing
  -- In production, use Supabase Vault to store API keys securely
  
  -- Set email content
  email_subject := 'Application Approved - ' || opportunity_title;
  email_body := 
    'Hi ' || applicant_name || ',
    
Great news! Your application for "' || opportunity_title || '" has been approved.

We''re excited to have you on board. You should receive additional details about next steps soon.

Thank you for applying to R/HOOD.

Best regards,
The R/HOOD Team';

  -- Try to send email using Supabase's built-in email (if configured)
  -- Or use an external email service via HTTP
  
  -- Option 1: Use Supabase's email service (if you have it configured)
  -- This requires Supabase to have email configured in project settings
  
  -- Option 2: Use external email service (Resend, SendGrid, etc.)
  -- For now, we'll create a placeholder that can be called from Edge Functions
  
  -- Log the email attempt (you can check this in Supabase logs)
  RAISE NOTICE 'Email notification prepared for %: %', applicant_email, email_subject;
  
  -- For now, return true (email sending will be handled by Edge Function or client)
  -- In production, you would make an HTTP request here using pg_net
  RETURN TRUE;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error preparing email notification: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update the application status change trigger to send emails
CREATE OR REPLACE FUNCTION notify_application_status_change()
RETURNS TRIGGER AS $$
DECLARE
  opportunity_title TEXT;
  opportunity_organizer TEXT;
  applicant_name TEXT;
  applicant_email TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Only trigger on status change from pending to approved/rejected
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    
    -- Get opportunity details
    SELECT o.title, up.dj_name INTO opportunity_title, opportunity_organizer
    FROM opportunities o
    LEFT JOIN user_profiles up ON o.organizer_id = up.id
    WHERE o.id = NEW.opportunity_id;
    
    -- Get applicant details (name and email)
    SELECT dj_name, email INTO applicant_name, applicant_email
    FROM user_profiles
    WHERE id = NEW.user_id;
    
    -- Set notification content based on status
    IF NEW.status = 'approved' THEN
      notification_title := 'Application Approved';
      notification_message := 'Great news! Your application for "' || opportunity_title || '" has been approved.';
      
      -- Send email notification for approved applications
      IF applicant_email IS NOT NULL AND applicant_name IS NOT NULL THEN
        PERFORM send_application_approval_email(
          applicant_email,
          applicant_name,
          opportunity_title
        );
      END IF;
    ELSE
      notification_title := 'Application Update';
      notification_message := 'Your application for "' || opportunity_title || '" was not selected this time.';
    END IF;
    
    -- Create notification for the applicant
    INSERT INTO notifications (user_id, title, message, type, related_id, is_read)
    VALUES (
      NEW.user_id,
      notification_title,
      notification_message,
      CASE WHEN NEW.status = 'approved' THEN 'application_approved' ELSE 'application_rejected' END,
      NEW.id,
      false
    );
    
    -- Also notify the organizer about the status change
    IF opportunity_organizer IS NOT NULL THEN
      INSERT INTO notifications (user_id, title, message, type, related_id, is_read)
      VALUES (
        (SELECT organizer_id FROM opportunities WHERE id = NEW.opportunity_id),
        CASE WHEN NEW.status = 'approved' THEN 'Application Approved' ELSE 'Application Rejected' END,
        CASE WHEN NEW.status = 'approved' 
          THEN applicant_name || ' has been approved for "' || opportunity_title || '"'
          ELSE applicant_name || ' has been rejected for "' || opportunity_title || '"'
        END,
        'system',
        NEW.id,
        false
      );
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Grant permissions
GRANT EXECUTE ON FUNCTION send_application_approval_email TO authenticated;
GRANT EXECUTE ON FUNCTION notify_application_status_change TO authenticated;

-- Success message
SELECT 'Application email notification functions created successfully! 
Note: You will need to configure an email service (Resend, SendGrid, etc.) 
and create a Supabase Edge Function to actually send the emails.' as result;




