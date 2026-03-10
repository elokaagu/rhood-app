-- Add pinned mixes feature (DJs can pin up to 3 top mixes)
-- Run this in your Supabase SQL Editor

-- Step 1: Add is_pinned column to mixes table
ALTER TABLE mixes 
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Step 2: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_mixes_is_pinned ON mixes(user_id, is_pinned) WHERE is_pinned = true;

-- Step 3: Add comment for documentation
COMMENT ON COLUMN mixes.is_pinned IS 'Indicates if this mix is pinned as one of the DJs top 3 mixes (max 3 per user)';

-- Step 4: Create function to enforce max 3 pinned mixes per user
CREATE OR REPLACE FUNCTION enforce_max_pinned_mixes()
RETURNS TRIGGER AS $$
DECLARE
  pinned_count INTEGER;
BEGIN
  -- Only check if we're setting is_pinned to true
  IF NEW.is_pinned = true THEN
    -- Count current pinned mixes for this user
    SELECT COUNT(*) INTO pinned_count
    FROM mixes
    WHERE user_id = NEW.user_id
      AND is_pinned = true
      AND id != NEW.id; -- Exclude the current mix
    
    -- If already at max (3), prevent pinning
    IF pinned_count >= 3 THEN
      RAISE EXCEPTION 'Maximum of 3 pinned mixes allowed per user. Please unpin another mix first.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create trigger to enforce the limit
DROP TRIGGER IF EXISTS check_max_pinned_mixes ON mixes;
CREATE TRIGGER check_max_pinned_mixes
BEFORE INSERT OR UPDATE ON mixes
FOR EACH ROW
WHEN (NEW.is_pinned = true)
EXECUTE FUNCTION enforce_max_pinned_mixes();

-- Step 6: Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'mixes' 
  AND column_name = 'is_pinned';
