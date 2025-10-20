-- Check the status constraint on mixes table
-- Run this in your Supabase SQL Editor

-- Check what check constraints exist on the mixes table
-- Updated for newer PostgreSQL versions
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'mixes'::regclass 
AND contype = 'c';

-- If the above doesn't work, try this simpler approach:
SELECT 
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'mixes'
AND tc.constraint_type = 'CHECK';

-- Alternative query to check constraints
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc 
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'mixes'
AND tc.constraint_type = 'CHECK';

-- Simple query to check what status values exist
SELECT DISTINCT status, COUNT(*) as count
FROM mixes 
GROUP BY status
ORDER BY status;

-- Check the table definition to see status column details
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'mixes' AND column_name = 'status';
