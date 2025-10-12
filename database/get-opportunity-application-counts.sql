-- Function to get application counts for opportunities
-- Run this in your Supabase SQL editor

-- Create a function to get application counts for all opportunities
CREATE OR REPLACE FUNCTION get_opportunity_application_counts()
RETURNS TABLE (
  opportunity_id UUID,
  application_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id as opportunity_id,
    COALESCE(COUNT(a.id), 0)::INTEGER as application_count
  FROM opportunities o
  LEFT JOIN applications a ON o.id = a.opportunity_id
  WHERE o.is_active = true
  GROUP BY o.id
  ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_opportunity_application_counts() TO authenticated;

-- Test the function
SELECT * FROM get_opportunity_application_counts();
