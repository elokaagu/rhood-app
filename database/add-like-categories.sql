-- Add category system for liked mixes
-- Run this in your Supabase SQL Editor

-- Step 1: Create like_categories table
CREATE TABLE IF NOT EXISTS like_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  color VARCHAR(20), -- Optional color for UI (e.g., "#FF5733")
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, name) -- Each user can have unique category names
);

-- Step 2: Add category_id to mix_likes table
ALTER TABLE mix_likes 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES like_categories(id) ON DELETE SET NULL;

-- Step 3: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_like_categories_user_id ON like_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_mix_likes_category_id ON mix_likes(category_id) WHERE category_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mix_likes_user_category ON mix_likes(user_id, category_id);

-- Step 4: Add updated_at trigger for like_categories
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_like_categories_updated_at 
BEFORE UPDATE ON like_categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Step 5: Enable Row Level Security
ALTER TABLE like_categories ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies
-- Users can only see their own categories
CREATE POLICY "Users can view their own categories"
  ON like_categories FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own categories
CREATE POLICY "Users can insert their own categories"
  ON like_categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own categories
CREATE POLICY "Users can update their own categories"
  ON like_categories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own categories
CREATE POLICY "Users can delete their own categories"
  ON like_categories FOR DELETE
  USING (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE like_categories IS 'User-defined categories for organizing liked mixes';
COMMENT ON COLUMN mix_likes.category_id IS 'Optional category assignment for liked mix';
