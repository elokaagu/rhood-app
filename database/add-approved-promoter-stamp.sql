-- R/HOOD approved promoters: profile flag + notification metadata for trust UI.
-- Run in Supabase SQL Editor. Replaces notify_new_message / notify_connection_request bodies;
-- existing triggers on messages / connections keep working.

-- 1) Mark vetted promoter accounts (set true in Table Editor or admin update)
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_rhood_approved_promoter BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN user_profiles.is_rhood_approved_promoter IS
  'When true, this user is an R/HOOD–approved promoter; show stamp on contact surfaces.';

-- 2) JSON payload on notifications
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 3) Connection request notification (matches update-connection-request-title.sql + metadata)
CREATE OR REPLACE FUNCTION notify_connection_request()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
  requester_name TEXT;
  is_promoter BOOLEAN := false;
BEGIN
  IF NEW.user_id_1 = NEW.initiated_by THEN
    target_user_id := NEW.user_id_2;
  ELSE
    target_user_id := NEW.user_id_1;
  END IF;

  SELECT dj_name INTO requester_name
  FROM user_profiles
  WHERE id = NEW.initiated_by;

  SELECT COALESCE(is_rhood_approved_promoter, false) INTO is_promoter
  FROM user_profiles
  WHERE id = NEW.initiated_by;

  INSERT INTO notifications (user_id, title, message, type, related_id, is_read, metadata)
  VALUES (
    target_user_id,
    'Connection Request',
    COALESCE(requester_name, 'Someone') || ' wants to connect with you',
    'connection_request',
    NEW.id,
    false,
    jsonb_build_object('approved_promoter', is_promoter)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4) New message notification (matches fix-all-messaging-rls thread resolution + metadata)
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  receiver_id UUID;
  thread_record RECORD;
  has_user_id_1 BOOLEAN;
  is_promoter BOOLEAN := false;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'message_threads'
      AND column_name = 'user_id_1'
  ) INTO has_user_id_1;

  SELECT dj_name INTO sender_name
  FROM user_profiles
  WHERE id = NEW.sender_id;

  SELECT COALESCE(is_rhood_approved_promoter, false) INTO is_promoter
  FROM user_profiles
  WHERE id = NEW.sender_id;

  IF has_user_id_1 THEN
    SELECT user_id_1, user_id_2 INTO thread_record
    FROM message_threads
    WHERE id = NEW.thread_id;

    IF thread_record.user_id_1 = NEW.sender_id THEN
      receiver_id := thread_record.user_id_2;
    ELSE
      receiver_id := thread_record.user_id_1;
    END IF;
  ELSE
    SELECT participant_1, participant_2 INTO thread_record
    FROM message_threads
    WHERE id = NEW.thread_id;

    IF thread_record.participant_1 = NEW.sender_id THEN
      receiver_id := thread_record.participant_2;
    ELSE
      receiver_id := thread_record.participant_1;
    END IF;
  END IF;

  INSERT INTO notifications (user_id, title, message, type, related_id, is_read, metadata)
  VALUES (
    receiver_id,
    'New Message',
    COALESCE(sender_name, 'Someone') || ': ' || LEFT(COALESCE(NEW.content, ''), 50) ||
      CASE WHEN LENGTH(COALESCE(NEW.content, '')) > 50 THEN '...' ELSE '' END,
    'message',
    NEW.id,
    false,
    jsonb_build_object('approved_promoter', is_promoter)
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5) Application status → applicant sees stamp if opportunity organizer is an approved promoter
CREATE OR REPLACE FUNCTION notify_application_status_change()
RETURNS TRIGGER AS $$
DECLARE
  opportunity_title TEXT;
  applicant_name TEXT;
  applicant_email TEXT;
  notification_title TEXT;
  notification_message TEXT;
  organizer_id UUID;
  is_promoter BOOLEAN := false;
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN

    -- Opportunity organizer: use the column your DB has (created_by, organizer_id, or posted_by).
    SELECT o.title, o.created_by
    INTO opportunity_title, organizer_id
    FROM opportunities o
    WHERE o.id = NEW.opportunity_id;

    SELECT dj_name, email INTO applicant_name, applicant_email
    FROM user_profiles
    WHERE id = NEW.user_id;

    IF organizer_id IS NOT NULL THEN
      SELECT COALESCE(is_rhood_approved_promoter, false) INTO is_promoter
      FROM user_profiles
      WHERE id = organizer_id;
    END IF;

    IF NEW.status = 'approved' THEN
      notification_title := 'Application Approved';
      notification_message := 'Great news! Your application for "' || opportunity_title || '" has been approved.';

      IF applicant_email IS NOT NULL AND applicant_name IS NOT NULL THEN
        BEGIN
          PERFORM send_application_approval_email(
            applicant_email,
            applicant_name,
            opportunity_title
          );
        EXCEPTION
          WHEN OTHERS THEN
            NULL;
        END;
      END IF;
    ELSE
      notification_title := 'Application Update';
      notification_message := 'Your application for "' || opportunity_title || '" was not selected this time.';
    END IF;

    INSERT INTO notifications (user_id, title, message, type, related_id, is_read, metadata)
    VALUES (
      NEW.user_id,
      notification_title,
      notification_message,
      CASE WHEN NEW.status = 'approved' THEN 'application_approved' ELSE 'application_rejected' END,
      NEW.id,
      false,
      jsonb_build_object('approved_promoter', is_promoter)
    );

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION notify_application_status_change TO authenticated;

SELECT '✅ is_rhood_approved_promoter + notifications.metadata + notify_connection_request, notify_new_message, notify_application_status_change.' AS status;
