-- R/HOOD Database Schema for Supabase
-- Run these commands in your Supabase SQL editor

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret';

-- Create user_profiles table
CREATE TABLE user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dj_name VARCHAR(50) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  instagram VARCHAR(100),
  soundcloud VARCHAR(200),
  city VARCHAR(50) NOT NULL,
  genres TEXT[] DEFAULT '{}',
  bio TEXT,
  profile_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create opportunities table
CREATE TABLE opportunities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  event_date TIMESTAMP WITH TIME ZONE,
  location VARCHAR(100) NOT NULL,
  payment DECIMAL(10,2),
  genre VARCHAR(50),
  skill_level VARCHAR(20) DEFAULT 'intermediate',
  organizer_name VARCHAR(100) NOT NULL,
  organizer_id UUID REFERENCES user_profiles(id),
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create applications table
CREATE TABLE applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID REFERENCES opportunities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(opportunity_id, user_id)
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('opportunity', 'application', 'message', 'system')),
  is_read BOOLEAN DEFAULT false,
  related_id UUID, -- Can reference opportunities, applications, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create communities table
CREATE TABLE communities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  member_count INTEGER DEFAULT 0,
  image_url TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create community_members table
CREATE TABLE community_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('member', 'admin', 'moderator')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(community_id, user_id)
);

-- Create messages table
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_user_profiles_city ON user_profiles(city);
CREATE INDEX idx_user_profiles_genres ON user_profiles USING GIN(genres);
CREATE INDEX idx_opportunities_location ON opportunities(location);
CREATE INDEX idx_opportunities_genre ON opportunities(genre);
CREATE INDEX idx_opportunities_active ON opportunities(is_active);
CREATE INDEX idx_applications_user ON applications(user_id);
CREATE INDEX idx_applications_opportunity ON applications(opportunity_id);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX idx_community_members_user ON community_members(user_id);
CREATE INDEX idx_community_members_community ON community_members(community_id);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);

-- Enable Row Level Security (RLS)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic - you may want to customize these)
-- User profiles can be read by anyone, but only updated by the owner
CREATE POLICY "User profiles are viewable by everyone" ON user_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON user_profiles
  FOR UPDATE USING (auth.uid()::text = id::text);

-- Opportunities are viewable by everyone
CREATE POLICY "Opportunities are viewable by everyone" ON opportunities
  FOR SELECT USING (true);

-- Applications are viewable by the applicant and opportunity organizer
CREATE POLICY "Users can view their own applications" ON applications
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Notifications are viewable by the recipient
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid()::text = user_id::text);

-- Communities are viewable by everyone
CREATE POLICY "Communities are viewable by everyone" ON communities
  FOR SELECT USING (true);

-- Community members are viewable by everyone
CREATE POLICY "Community members are viewable by everyone" ON community_members
  FOR SELECT USING (true);

-- Messages are viewable by sender and receiver
CREATE POLICY "Users can view their own messages" ON messages
  FOR SELECT USING (auth.uid()::text = sender_id::text OR auth.uid()::text = receiver_id::text);

-- Create functions for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_communities_updated_at BEFORE UPDATE ON communities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO user_profiles (dj_name, full_name, city, genres, bio) VALUES
('DJ Pulse', 'John Smith', 'Miami', ARRAY['House', 'Techno'], 'Underground house DJ from Miami'),
('Luna Beats', 'Sarah Johnson', 'Berlin', ARRAY['Techno', 'Ambient'], 'Techno producer and DJ'),
('Darkside Collective', 'Mike Wilson', 'London', ARRAY['Techno', 'Industrial'], 'Event organizer and DJ');

INSERT INTO opportunities (title, description, event_date, location, payment, genre, skill_level, organizer_name) VALUES
('Underground Warehouse Rave', 'High-energy underground event. Looking for DJs who can bring the heat with hard techno and industrial beats.', '2024-08-15 22:00:00+00', 'East London', 300.00, 'Techno', 'intermediate', 'Darkside Collective'),
('Club Neon Resident DJ', 'Weekly resident DJ position at Club Neon. House music focus.', '2024-07-01 22:00:00+00', 'Miami, FL', 200.00, 'House', 'beginner', 'Club Neon'),
('Berlin Underground Festival', 'Summer festival lineup. Electronic music showcase.', '2024-08-20 20:00:00+00', 'Berlin, Germany', 500.00, 'Electronic', 'advanced', 'Berlin Underground');

INSERT INTO communities (name, description, member_count, created_by) VALUES
('Underground DJs', 'Connect with underground DJs worldwide', 1234, (SELECT id FROM user_profiles WHERE dj_name = 'DJ Pulse')),
('Techno Collective', 'Share techno tracks and collaborate', 856, (SELECT id FROM user_profiles WHERE dj_name = 'Luna Beats')),
('Miami Music Scene', 'Local Miami DJs and producers', 432, (SELECT id FROM user_profiles WHERE dj_name = 'DJ Pulse'));

-- Update community member counts
UPDATE communities SET member_count = (
  SELECT COUNT(*) FROM community_members WHERE community_id = communities.id
);
