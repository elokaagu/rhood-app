# Check Existing Database Schema

Quick guide to check what's already set up in your Supabase database.

## 🔍 Check if Mixes Table Exists

Run this query in Supabase SQL Editor:

```sql
-- Check if mixes table exists
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'mixes'
) AS mixes_table_exists;
```

**Result:**
- `true` = Table already exists ✅
- `false` = Table needs to be created ❌

## 📋 Check Mixes Table Structure

If the table exists, check its structure:

```sql
-- View mixes table columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'mixes'
ORDER BY ordinal_position;
```

## 🔐 Check RLS Policies

Check if Row Level Security policies are set up:

```sql
-- Check RLS policies on mixes table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'mixes';
```

## 🗂️ Check Storage Bucket

Check if the mixes storage bucket exists:

```sql
-- Check storage buckets
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'mixes';
```

## 📊 View All Tables

See all tables in your database:

```sql
-- List all tables
SELECT 
  table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_type = 'PRIMARY KEY' 
      AND table_name = tables.table_name
    )
    THEN '✅'
    ELSE '❌'
  END AS has_primary_key
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

## 🚀 Quick Setup Paths

### Path 1: Mixes Table Already Exists
If the mixes table exists:
1. ✅ Skip table creation
2. ✅ Check if storage bucket exists
3. ✅ Create storage bucket if needed (see guide below)
4. ✅ Test upload functionality

### Path 2: Mixes Table Doesn't Exist
If the mixes table doesn't exist:
1. ❌ Run migration script: `database/check-and-create-mixes.sql`
2. ✅ Create storage bucket
3. ✅ Test upload functionality

## 🪣 Create Storage Bucket

If storage bucket doesn't exist:

### Via Supabase Dashboard:
1. Go to **Storage** section
2. Click **"New Bucket"**
3. Settings:
   - Name: `mixes`
   - Public: ✅ Yes
   - File size limit: 500 MB
   - MIME types: `audio/*`

### Via SQL (Alternative):
```sql
-- Create storage bucket via SQL
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'mixes',
  'mixes',
  true,
  524288000, -- 500 MB in bytes
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/m4a', 'audio/aac']
)
ON CONFLICT (id) DO NOTHING;
```

Then run storage policies from: `database/create-mixes-storage-bucket.sql`

## 🧪 Test Query

After setup, test if everything works:

```sql
-- Test query: Check if you can insert a test mix
-- (This won't actually insert, just checks permissions)
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_name = 'mixes'
    )
    AND EXISTS (
      SELECT 1 FROM storage.buckets 
      WHERE name = 'mixes'
    )
    THEN '✅ Ready to upload mixes!'
    ELSE '⚠️ Setup incomplete'
  END AS setup_status;
```

## 📝 Summary Checklist

Before using mix upload feature:

- [ ] **Mixes table exists** (run check query)
- [ ] **RLS policies configured** (run policies check)
- [ ] **Storage bucket created** (check via dashboard or SQL)
- [ ] **Storage policies set** (run storage policies script)
- [ ] **Test upload works** (try from app)

## 🔧 Migration Scripts

Use these scripts based on your needs:

1. **Fresh setup**: `database/schema.sql` (creates everything)
2. **Safe migration**: `database/check-and-create-mixes.sql` (only adds mixes table)
3. **Individual table**: `database/create-mixes-table.sql` (mixes table only)
4. **Storage setup**: `database/create-mixes-storage-bucket.sql` (storage policies)

## ⚡ Quick Test Upload

After setup, test with this data:

```sql
-- Insert a test mix (only if you're logged in as a user)
INSERT INTO mixes (
  user_id, 
  title, 
  file_url, 
  genre, 
  is_public
) VALUES (
  auth.uid(), -- Your user ID
  'Test Mix',
  'https://example.com/test.mp3',
  'House',
  true
);

-- View your mixes
SELECT * FROM mixes WHERE user_id = auth.uid();

-- Clean up test data
DELETE FROM mixes WHERE title = 'Test Mix';
```

---

**Need Help?**
- Full setup guide: `docs/MIX_UPLOAD_GUIDE.md`
- Quick checklist: `docs/MIX_UPLOAD_SETUP_CHECKLIST.md`
- Main schema: `database/schema.sql`

