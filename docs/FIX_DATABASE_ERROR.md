# Fix Database Setup Error

## 🚨 The Error You're Seeing

The error `permission denied to set parameter "app.jwt_secret"` occurs because that command requires superuser permissions that aren't available in Supabase's managed environment.

## ✅ Quick Fix

### Option 1: Use the Simplified Schema (Recommended)

1. **Clear your current SQL editor** in Supabase
2. **Copy the contents** of `database/schema-simple.sql` from your project
3. **Paste and run** the simplified schema
4. This will create all tables without the problematic command

### Option 2: Use the Fixed Original Schema

1. **Clear your current SQL editor** in Supabase
2. **Copy the contents** of `database/schema.sql` (I've already fixed it)
3. **Paste and run** the fixed schema

## 🔧 What I Fixed

- ❌ **Removed**: `ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';`
- ✅ **Added**: Note that JWT secret is automatically configured by Supabase
- ✅ **Kept**: All table creation and data insertion commands

## 📋 Step-by-Step Instructions

1. **In Supabase Dashboard**:

   - Go to **SQL Editor**
   - Click **New Query** (or clear current query)
   - Copy contents from `database/schema-simple.sql`
   - Paste into the editor
   - Click **Run**

2. **Verify Tables Created**:

   - Go to **Table Editor**
   - You should see: `user_profiles`, `opportunities`, `applications`, `notifications`, `communities`, `community_members`, `messages`

3. **Add Sample Data** (Optional):
   - Run this additional SQL to add sample data:

```sql
-- Insert sample user profiles
INSERT INTO user_profiles (dj_name, full_name, city, genres, bio) VALUES
('DJ Pulse', 'John Smith', 'Miami', ARRAY['House', 'Techno'], 'Underground house DJ from Miami'),
('Luna Beats', 'Sarah Johnson', 'Berlin', ARRAY['Techno', 'Ambient'], 'Techno producer and DJ'),
('Darkside Collective', 'Mike Wilson', 'London', ARRAY['Techno', 'Industrial'], 'Event organizer and DJ');

-- Insert sample opportunities
INSERT INTO opportunities (title, description, event_date, location, payment, genre, skill_level, organizer_name) VALUES
('Underground Warehouse Rave', 'High-energy underground event. Looking for DJs who can bring the heat with hard techno and industrial beats.', '2024-08-15 22:00:00+00', 'East London', 300.00, 'Techno', 'intermediate', 'Darkside Collective'),
('Club Neon Resident DJ', 'Weekly resident DJ position at Club Neon. House music focus.', '2024-07-01 22:00:00+00', 'Miami, FL', 200.00, 'House', 'beginner', 'Club Neon'),
('Berlin Underground Festival', 'Summer festival lineup. Electronic music showcase.', '2024-08-20 20:00:00+00', 'Berlin, Germany', 500.00, 'Electronic', 'advanced', 'Berlin Underground');

-- Insert sample communities
INSERT INTO communities (name, description, member_count, created_by) VALUES
('Underground DJs', 'Connect with underground DJs worldwide', 1234, (SELECT id FROM user_profiles WHERE dj_name = 'DJ Pulse')),
('Techno Collective', 'Share techno tracks and collaborate', 856, (SELECT id FROM user_profiles WHERE dj_name = 'Luna Beats')),
('Miami Music Scene', 'Local Miami DJs and producers', 432, (SELECT id FROM user_profiles WHERE dj_name = 'DJ Pulse'));
```

## 🎯 After Setup

Once the database is set up:

1. **Test your app**: `npx expo start`
2. **Create a profile** in the onboarding
3. **Check Opportunities tab** for sample data
4. **Verify in Supabase** that your profile appears in the `user_profiles` table

## 🐛 Still Having Issues?

If you still get errors:

- Make sure you're running the SQL in the **SQL Editor** (not Table Editor)
- Try running the commands one table at a time
- Check that you have the correct project selected in Supabase

---

**The simplified schema will work perfectly! 🎵**
