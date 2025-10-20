-- Seed opportunities with mock data for R/HOOD prototype
-- Run this in your Supabase SQL editor after setting up the basic schema

-- Insert sample opportunities
INSERT INTO opportunities (title, description, event_date, location, payment, genre, skill_level, organizer_name, organizer_id, is_active) VALUES
('Underground Warehouse Rave', 'High-energy underground event in East London. Looking for DJs who can bring the heat with hard techno and industrial beats. 500+ capacity venue with world-class sound system.', '2024-08-15 22:00:00+00', 'East London, UK', 300.00, 'Techno', 'intermediate', 'Darkside Collective', (SELECT id FROM user_profiles WHERE dj_name = 'Darkside Collective' LIMIT 1), true),

('Club Neon Resident DJ', 'Weekly resident DJ position at Club Neon in Miami. House music focus with a vibrant crowd. Perfect for DJs looking to build their reputation in the Miami scene.', '2024-07-01 22:00:00+00', 'Miami, FL', 200.00, 'House', 'beginner', 'Club Neon', (SELECT id FROM user_profiles WHERE dj_name = 'DJ Pulse' LIMIT 1), true),

('Berlin Underground Festival', 'Summer festival lineup in Berlin. Electronic music showcase with international artists. 3-day event with multiple stages and 10,000+ attendees.', '2024-08-20 20:00:00+00', 'Berlin, Germany', 500.00, 'Electronic', 'advanced', 'Berlin Underground', (SELECT id FROM user_profiles WHERE dj_name = 'Luna Beats' LIMIT 1), true),

('Ibiza Beach Party', 'Sunset beach party with world-class sound system. Progressive house and trance focus. Iconic location with stunning views.', '2024-09-10 18:00:00+00', 'Ibiza, Spain', 400.00, 'Progressive', 'intermediate', 'Ibiza Events', (SELECT id FROM user_profiles WHERE dj_name = 'DJ Pulse' LIMIT 1), true),

('NYC Rooftop Sessions', 'Intimate rooftop DJ sessions in Manhattan. Deep house and minimal techno. Small capacity venue for quality over quantity.', '2024-07-25 19:00:00+00', 'New York, NY', 250.00, 'Deep House', 'intermediate', 'NYC Underground', (SELECT id FROM user_profiles WHERE dj_name = 'Darkside Collective' LIMIT 1), true),

('Amsterdam Canal Festival', 'Unique canal-side event in Amsterdam. Electronic music with a focus on innovation and creativity. Floating stage setup.', '2024-08-30 21:00:00+00', 'Amsterdam, Netherlands', 350.00, 'Electronic', 'advanced', 'Canal Events', (SELECT id FROM user_profiles WHERE dj_name = 'Luna Beats' LIMIT 1), true),

('Tokyo Underground', 'Late-night underground event in Shibuya. Hard techno and industrial focus. 24-hour venue with international crowd.', '2024-09-15 23:00:00+00', 'Tokyo, Japan', 450.00, 'Techno', 'advanced', 'Tokyo Underground', (SELECT id FROM user_profiles WHERE dj_name = 'Darkside Collective' LIMIT 1), true),

('Barcelona Beach Club', 'Beachfront club event in Barcelona. House and tech house focus. Summer vibes with international DJs.', '2024-08-05 20:00:00+00', 'Barcelona, Spain', 300.00, 'House', 'intermediate', 'Barcelona Beats', (SELECT id FROM user_profiles WHERE dj_name = 'DJ Pulse' LIMIT 1), true),

('London Bridge Sessions', 'Underground venue under London Bridge. Drum & Bass and Jungle focus. Intimate setting with serious music lovers.', '2024-07-20 22:00:00+00', 'London, UK', 200.00, 'Drum & Bass', 'intermediate', 'Bridge Events', (SELECT id FROM user_profiles WHERE dj_name = 'Luna Beats' LIMIT 1), true),

('Miami Winter Music', 'Winter music conference showcase. Various electronic genres. Industry networking opportunity.', '2024-12-15 19:00:00+00', 'Miami, FL', 400.00, 'Electronic', 'advanced', 'Winter Music Conference', (SELECT id FROM user_profiles WHERE dj_name = 'DJ Pulse' LIMIT 1), true);

-- Insert some sample applications to show activity
INSERT INTO applications (opportunity_id, user_id, status, message) VALUES
((SELECT id FROM opportunities WHERE title = 'Underground Warehouse Rave' LIMIT 1), (SELECT id FROM user_profiles WHERE dj_name = 'DJ Pulse' LIMIT 1), 'pending', 'I have 5+ years experience with techno and industrial. Would love to be part of this event!'),
((SELECT id FROM opportunities WHERE title = 'Club Neon Resident DJ' LIMIT 1), (SELECT id FROM user_profiles WHERE dj_name = 'Luna Beats' LIMIT 1), 'accepted', 'Perfect fit for my house music style. Ready to start immediately.'),
((SELECT id FROM opportunities WHERE title = 'Berlin Underground Festival' LIMIT 1), (SELECT id FROM user_profiles WHERE dj_name = 'Darkside Collective' LIMIT 1), 'pending', 'Berlin is my home base. I know the scene well and can bring authentic underground vibes.');

-- Insert some sample notifications
INSERT INTO notifications (user_id, title, message, type, related_id) VALUES
((SELECT id FROM user_profiles WHERE dj_name = 'DJ Pulse' LIMIT 1), 'New Opportunity Available', 'Underground Warehouse Rave is looking for DJs in your area!', 'opportunity', (SELECT id FROM opportunities WHERE title = 'Underground Warehouse Rave' LIMIT 1)),
((SELECT id FROM user_profiles WHERE dj_name = 'Luna Beats' LIMIT 1), 'Application Accepted', 'Congratulations! Your application to Club Neon Resident DJ has been accepted.', 'application', (SELECT id FROM applications WHERE status = 'accepted' LIMIT 1)),
((SELECT id FROM user_profiles WHERE dj_name = 'Darkside Collective' LIMIT 1), 'New Message', 'You have a new message from Berlin Underground.', 'message', NULL);

-- Update community member counts
UPDATE communities SET member_count = (
  SELECT COUNT(*) FROM community_members WHERE community_id = communities.id
) WHERE member_count = 0;
