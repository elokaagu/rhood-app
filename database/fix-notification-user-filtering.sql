-- Fix notification filtering to ensure users only see their own notifications
-- This adds RLS policies and fixes the application approval trigger

-- Step 1: Ensure RLS is enabled on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;

-- Step 3: Create RLS policies for notifications
-- Users can only SELECT notifications where user_id matches their auth.uid()
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can INSERT notifications (for triggers/system), but only for themselves
-- Note: Triggers run with SECURITY DEFINER, so they can insert for any user
-- But regular users can only insert for themselves
CREATE POLICY "Users can insert their own notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can UPDATE their own notifications (e.g., mark as read)
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can DELETE their own notifications
CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- Step 4: Fix the application approval trigger to ONLY notify the applicant
-- Remove the organizer notification (organizers don't need to be notified about approvals)
CREATE OR REPLACE FUNCTION notify_application_status_change()
RETURNS TRIGGER AS $$
DECLARE
  opportunity_title TEXT;
  applicant_name TEXT;
  applicant_email TEXT;
  notification_title TEXT;
  notification_message TEXT;
BEGIN
  -- Only trigger on status change from pending to approved/rejected
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    
    -- Get opportunity details
    SELECT o.title INTO opportunity_title
    FROM opportunities o
    WHERE o.id = NEW.opportunity_id;
    
    -- Get applicant details (name and email)
    SELECT dj_name, email INTO applicant_name, applicant_email
    FROM user_profiles
    WHERE id = NEW.user_id;
    
    -- Set notification content based on status
    IF NEW.status = 'approved' THEN
      notification_title := 'Application Approved';
      notification_message := 'Great news! Your application for "' || opportunity_title || '" has been approved.';
      
      -- Send email notification for approved applications (if email function exists)
      IF applicant_email IS NOT NULL AND applicant_name IS NOT NULL THEN
        -- Only send email if the function exists (graceful fallback)
        BEGIN
          PERFORM send_application_approval_email(
            applicant_email,
            applicant_name,
            opportunity_title
          );
        EXCEPTION
          WHEN OTHERS THEN
            -- Email function might not exist, that's okay
            NULL;
        END;
      END IF;
    ELSE
      notification_title := 'Application Update';
      notification_message := 'Your application for "' || opportunity_title || '" was not selected this time.';
    END IF;
    
    -- Create notification ONLY for the applicant (not the organizer)
    INSERT INTO notifications (user_id, title, message, type, related_id, is_read)
    VALUES (
      NEW.user_id,  -- Only notify the applicant
      notification_title,
      notification_message,
      CASE WHEN NEW.status = 'approved' THEN 'application_approved' ELSE 'application_rejected' END,
      NEW.id,
      false
    );
    
    -- REMOVED: Organizer notification - organizers don't need notifications about approvals
    -- They can see approved applications in their opportunities screen
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Grant execute permission
GRANT EXECUTE ON FUNCTION notify_application_status_change TO authenticated;

-- Step 6: Verify the trigger exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'application_status_notification'
  ) THEN
    CREATE TRIGGER application_status_notification
      AFTER UPDATE ON applications
      FOR EACH ROW
      EXECUTE FUNCTION notify_application_status_change();
  END IF;
END $$;

-- Step 7: Success message
SELECT '✅ Notification filtering fixed! Users will now only see their own notifications.' as status;
SELECT '✅ Application approval notifications now only go to applicants, not organizers.' as status;
SELECT '✅ RLS policies ensure users can only view/update/delete their own notifications.' as status;
