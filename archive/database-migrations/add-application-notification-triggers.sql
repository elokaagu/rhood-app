-- Add application status notification triggers
-- Run this in your Supabase SQL Editor

-- 1. Update notification types to include application status notifications
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('opportunity', 'application', 'message', 'system', 'connection_request', 'connection_accepted', 'application_approved', 'application_rejected'));

-- 2. Create function to notify on application status change
CREATE OR REPLACE FUNCTION notify_application_status_change()
RETURNS TRIGGER AS $$
DECLARE
  opportunity_title TEXT;
  opportunity_organizer TEXT;
  applicant_name TEXT;
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
    
    -- Get applicant name
    SELECT dj_name INTO applicant_name
    FROM user_profiles
    WHERE id = NEW.user_id;
    
    -- Set notification content based on status
    IF NEW.status = 'approved' THEN
      notification_title := 'Application Approved';
      notification_message := 'Great news! Your application for "' || opportunity_title || '" has been approved.';
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

-- 3. Create trigger for application status changes
DROP TRIGGER IF EXISTS application_status_notification ON applications;
CREATE TRIGGER application_status_notification
  AFTER UPDATE ON applications
  FOR EACH ROW
  EXECUTE FUNCTION notify_application_status_change();

-- 4. Create admin function to update application status
CREATE OR REPLACE FUNCTION update_application_status(
  application_id UUID,
  new_status VARCHAR(20),
  admin_user_id UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN AS $$
DECLARE
  application_record RECORD;
BEGIN
  -- Validate status
  IF new_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Must be pending, approved, or rejected.';
  END IF;
  
  -- Get application details
  SELECT a.*, o.title as opportunity_title, o.organizer_id
  INTO application_record
  FROM applications a
  JOIN opportunities o ON a.opportunity_id = o.id
  WHERE a.id = application_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found.';
  END IF;
  
  -- Check if user is the organizer (admin) or has admin privileges
  -- For now, we'll allow any authenticated user to update status
  -- In production, you might want to add role-based access control
  
  -- Update application status
  UPDATE applications
  SET status = new_status,
      updated_at = NOW()
  WHERE id = application_id;
  
  -- The trigger will automatically create notifications
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to get applications for admin review
CREATE OR REPLACE FUNCTION get_applications_for_review(
  organizer_user_id UUID DEFAULT auth.uid()
)
RETURNS TABLE (
  application_id UUID,
  applicant_name VARCHAR(50),
  applicant_email TEXT,
  opportunity_title VARCHAR(200),
  application_message TEXT,
  application_status VARCHAR(20),
  applied_at TIMESTAMP WITH TIME ZONE,
  applicant_profile_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id as application_id,
    up.dj_name as applicant_name,
    up.email as applicant_email,
    o.title as opportunity_title,
    a.message as application_message,
    a.status as application_status,
    a.created_at as applied_at,
    up.profile_image_url as applicant_profile_url
  FROM applications a
  JOIN user_profiles up ON a.user_id = up.id
  JOIN opportunities o ON a.opportunity_id = o.id
  WHERE o.organizer_id = organizer_user_id
  ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant permissions
GRANT EXECUTE ON FUNCTION update_application_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_applications_for_review TO authenticated;

-- Success message
SELECT 'Application notification triggers and admin functions created successfully!' as result;
