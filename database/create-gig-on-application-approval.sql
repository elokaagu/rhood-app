-- Create a function and trigger to automatically create a gig when an application is approved
-- This connects the application approval process to the gigs system

-- Function to create gig from approved application
CREATE OR REPLACE FUNCTION create_gig_from_approved_application()
RETURNS TRIGGER AS $$
DECLARE
    v_opportunity RECORD;
    v_dj_profile RECORD;
BEGIN
    -- Only proceed if status changed to 'approved'
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        -- Get opportunity details
        SELECT * INTO v_opportunity
        FROM opportunities
        WHERE id = NEW.opportunity_id;
        
        -- Get DJ profile details
        SELECT * INTO v_dj_profile
        FROM user_profiles
        WHERE id = NEW.user_id;
        
        -- Only create gig if opportunity and DJ exist
        IF v_opportunity.id IS NOT NULL AND v_dj_profile.id IS NOT NULL THEN
            -- Check if gig already exists for this application
            IF NOT EXISTS (
                SELECT 1 FROM gigs 
                WHERE opportunity_id = NEW.opportunity_id 
                AND dj_id = NEW.user_id
            ) THEN
                -- Create the gig
                INSERT INTO gigs (
                    dj_id,
                    opportunity_id,
                    name,
                    venue,
                    location,
                    event_date,
                    start_time,
                    end_time,
                    payment,
                    currency,
                    payment_status,
                    status,
                    genre,
                    description,
                    created_at
                ) VALUES (
                    NEW.user_id,
                    NEW.opportunity_id,
                    COALESCE(v_opportunity.title, 'Gig'),
                    COALESCE(v_opportunity.venue, v_opportunity.location, 'Venue TBD'),
                    COALESCE(v_opportunity.location, v_opportunity.city, 'Location TBD'),
                    COALESCE(v_opportunity.event_date, CURRENT_DATE),
                    v_opportunity.event_start_time,
                    v_opportunity.event_end_time,
                    v_opportunity.payment,
                    COALESCE(v_opportunity.payment_currency, 'GBP'),
                    'pending',
                    'upcoming',
                    v_opportunity.genre,
                    v_opportunity.description,
                    NOW()
                );
                
                RAISE NOTICE 'Gig created for approved application: %', NEW.id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function when application status changes
DROP TRIGGER IF EXISTS trigger_create_gig_on_approval ON applications;
CREATE TRIGGER trigger_create_gig_on_approval
AFTER UPDATE OF status ON applications
FOR EACH ROW
WHEN (NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved'))
EXECUTE FUNCTION create_gig_from_approved_application();

-- Add comment
COMMENT ON FUNCTION create_gig_from_approved_application() IS 'Automatically creates a gig when an application is approved';

-- Create RPC function to get gigs for a brand (organizer)
CREATE OR REPLACE FUNCTION get_brand_gigs(brand_user_id UUID)
RETURNS TABLE (
  id UUID,
  dj_id UUID,
  opportunity_id UUID,
  name VARCHAR,
  venue VARCHAR,
  location VARCHAR,
  event_date DATE,
  start_time TIME,
  end_time TIME,
  payment DECIMAL,
  currency VARCHAR,
  payment_status VARCHAR,
  status VARCHAR,
  dj_rating DECIMAL,
  venue_rating DECIMAL,
  description TEXT,
  genre VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  dj_name VARCHAR,
  dj_profile_image_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id,
    g.dj_id,
    g.opportunity_id,
    g.name,
    g.venue,
    g.location,
    g.event_date,
    g.start_time,
    g.end_time,
    g.payment,
    g.currency,
    g.payment_status,
    g.status,
    g.dj_rating,
    g.venue_rating,
    g.description,
    g.genre,
    g.created_at,
    g.updated_at,
    g.completed_at,
    up.dj_name,
    up.profile_image_url as dj_profile_image_url
  FROM gigs g
  INNER JOIN opportunities o ON g.opportunity_id = o.id
  INNER JOIN user_profiles up ON g.dj_id = up.id
  WHERE o.created_by = brand_user_id
  ORDER BY g.event_date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_brand_gigs(UUID) TO authenticated;

COMMENT ON FUNCTION get_brand_gigs(UUID) IS 'Get all gigs for a brand/organizer (gigs from opportunities they created)';

