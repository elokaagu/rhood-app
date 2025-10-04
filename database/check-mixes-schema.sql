-- Check the actual mixes table schema to see all required columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'mixes'
ORDER BY ordinal_position;

