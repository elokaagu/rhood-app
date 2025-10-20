-- R/HOOD Matchmaking System Seed Data
-- Comprehensive seed data for testing and development

-- =============================================
-- 1. BRIEF TEMPLATES
-- =============================================

INSERT INTO brief_templates (name, description, category, template_data) VALUES
-- Venue Templates
('Underground Club Night', 'Template for underground club events', 'venue', '{
  "title": "Underground Club Night at {venue_name}",
  "description": "We are looking for a DJ to headline our underground club night featuring {genre} music. The event will take place at {venue_name} on {date} from {start_time} to {end_time}.",
  "requirements": {
    "genres": ["{primary_genre}", "{secondary_genre}"],
    "skill_level": "intermediate",
    "equipment": ["CDJ-3000", "DJM-900NXS2", "Professional Sound System"],
    "experience": "2+ years",
    "set_duration": "2-3 hours"
  },
  "compensation": {
    "type": "fixed",
    "amount": "{payment_amount}",
    "currency": "USD"
  },
  "venue_info": {
    "capacity": "{venue_capacity}",
    "atmosphere": "underground",
    "sound_system": "professional"
  }
}'),

('Warehouse Rave', 'Template for warehouse rave events', 'venue', '{
  "title": "Warehouse Rave: {event_name}",
  "description": "Join us for an epic warehouse rave featuring the best in {genre} music. This is a {event_type} event with {expected_attendance} people expected.",
  "requirements": {
    "genres": ["{primary_genre}", "techno", "house"],
    "skill_level": "advanced",
    "equipment": ["CDJ-2000NXS2", "DJM-900NXS2", "Massive Sound System"],
    "experience": "3+ years",
    "set_duration": "3-4 hours"
  },
  "compensation": {
    "type": "fixed",
    "amount": "{payment_amount}",
    "currency": "USD"
  },
  "venue_info": {
    "capacity": "500+",
    "atmosphere": "warehouse",
    "sound_system": "massive"
  }
}'),

('Bar/Lounge DJ', 'Template for bar and lounge DJ sets', 'venue', '{
  "title": "Weekly DJ Residency at {venue_name}",
  "description": "We are seeking a resident DJ for our weekly {day_of_week} night at {venue_name}. The ideal candidate will have experience with {genre} and be able to read the crowd.",
  "requirements": {
    "genres": ["{primary_genre}", "house", "deep house"],
    "skill_level": "intermediate",
    "equipment": ["CDJ-2000NXS2", "DJM-800", "Sound System"],
    "experience": "1+ years",
    "set_duration": "4-6 hours"
  },
  "compensation": {
    "type": "fixed",
    "amount": "{payment_amount}",
    "currency": "USD"
  },
  "venue_info": {
    "capacity": "100-200",
    "atmosphere": "intimate",
    "sound_system": "standard"
  }
}'),

-- Event Templates
('Music Festival', 'Template for music festival bookings', 'event', '{
  "title": "{festival_name} - {stage_name} Stage",
  "description": "We are looking for DJs to perform at {festival_name} on the {stage_name} stage. This is a {festival_type} festival with {expected_attendance} attendees.",
  "requirements": {
    "genres": ["{primary_genre}", "{secondary_genre}"],
    "skill_level": "advanced",
    "equipment": ["CDJ-3000", "DJM-900NXS2", "Festival Sound System"],
    "experience": "5+ years",
    "set_duration": "1-2 hours"
  },
  "compensation": {
    "type": "fixed",
    "amount": "{payment_amount}",
    "currency": "USD"
  },
  "venue_info": {
    "capacity": "1000+",
    "atmosphere": "festival",
    "sound_system": "festival_grade"
  }
}'),

('Corporate Event', 'Template for corporate events', 'corporate', '{
  "title": "Corporate Event DJ - {company_name}",
  "description": "We need a professional DJ for our corporate event at {venue_name}. The event will include {event_elements} and requires a DJ who can handle various music styles.",
  "requirements": {
    "genres": ["house", "pop", "electronic", "top_40"],
    "skill_level": "intermediate",
    "equipment": ["CDJ-2000NXS2", "DJM-800", "Professional Sound System"],
    "experience": "2+ years",
    "set_duration": "3-4 hours"
  },
  "compensation": {
    "type": "fixed",
    "amount": "{payment_amount}",
    "currency": "USD"
  },
  "venue_info": {
    "capacity": "200-500",
    "atmosphere": "corporate",
    "sound_system": "professional"
  }
}'),

-- Brand Templates
('Brand Launch Party', 'Template for brand launch events', 'brand', '{
  "title": "{brand_name} Launch Party",
  "description": "Join us for the exclusive launch of {brand_name} at {venue_name}. We are looking for a DJ who can create the perfect atmosphere for our brand launch.",
  "requirements": {
    "genres": ["{brand_genre}", "house", "electronic"],
    "skill_level": "advanced",
    "equipment": ["CDJ-3000", "DJM-900NXS2", "Premium Sound System"],
    "experience": "3+ years",
    "set_duration": "2-3 hours"
  },
  "compensation": {
    "type": "fixed",
    "amount": "{payment_amount}",
    "currency": "USD"
  },
  "venue_info": {
    "capacity": "300-800",
    "atmosphere": "exclusive",
    "sound_system": "premium"
  }
}');

-- =============================================
-- 2. MATCHING CRITERIA
-- =============================================

INSERT INTO matching_criteria (name, type, weight, is_required) VALUES
('Genre Compatibility', 'genre', 0.30, true),
('Skill Level Match', 'skill_level', 0.25, true),
('Location Proximity', 'location', 0.20, false),
('Availability', 'availability', 0.15, true),
('Equipment Requirements', 'equipment', 0.10, false);

-- =============================================
-- 3. VENUE PROFILES
-- =============================================

INSERT INTO venue_profiles (name, description, address, city, country, capacity, venue_type, equipment_provided, contact_email, website_url, social_media, rating, total_reviews) VALUES
('The Underground', 'Premier underground club in the heart of the city', '123 Underground St, London, UK', 'London', 'United Kingdom', 300, 'club', '["CDJ-3000", "DJM-900NXS2", "Professional Sound System", "LED Lighting"]', 'bookings@theunderground.com', 'https://theunderground.com', '{"instagram": "@theunderground", "facebook": "TheUndergroundClub"}', 4.8, 156),
('Warehouse 7', 'Massive warehouse space for raves and events', '456 Industrial Ave, Manchester, UK', 'Manchester', 'United Kingdom', 800, 'warehouse', '["CDJ-2000NXS2", "DJM-900NXS2", "Massive Sound System", "Laser Show"]', 'events@warehouse7.com', 'https://warehouse7.com', '{"instagram": "@warehouse7", "facebook": "Warehouse7Events"}', 4.6, 89),
('Neon Lounge', 'Intimate bar with electronic music focus', '789 Neon St, Birmingham, UK', 'Birmingham', 'United Kingdom', 150, 'bar', '["CDJ-2000NXS2", "DJM-800", "Sound System"]', 'music@neonlounge.com', 'https://neonlounge.com', '{"instagram": "@neonlounge", "facebook": "NeonLounge"}', 4.4, 67),
('Skyline Rooftop', 'Rooftop venue with city views', '321 Skyline Blvd, London, UK', 'London', 'United Kingdom', 200, 'outdoor', '["CDJ-3000", "DJM-900NXS2", "Outdoor Sound System"]', 'rooftop@skyline.com', 'https://skyline.com', '{"instagram": "@skyline_rooftop", "facebook": "SkylineRooftop"}', 4.7, 134),
('Corporate Events Hall', 'Professional venue for corporate events', '654 Business Park, London, UK', 'London', 'United Kingdom', 500, 'corporate', '["CDJ-2000NXS2", "DJM-800", "Professional Sound System", "Projector"]', 'events@corporatehall.com', 'https://corporatehall.com', '{"instagram": "@corporate_events", "facebook": "CorporateEventsHall"}', 4.5, 45);

-- =============================================
-- 4. SAMPLE OPPORTUNITIES
-- =============================================

INSERT INTO opportunities (title, description, event_date, location, payment, genre, skill_level, organizer_name, organizer_id, image_url, is_active) VALUES
('Underground Techno Night', 'Join us for an epic underground techno night featuring the best local and international DJs. This is a 18+ event with professional sound system and lighting.', NOW() + INTERVAL '7 days', 'London', 300.00, 'techno', 'intermediate', 'The Underground', (SELECT id FROM user_profiles LIMIT 1), 'https://example.com/techno-night.jpg', true),
('Warehouse Rave Experience', 'Massive warehouse rave with multiple rooms and world-class sound systems. Expect 12+ hours of non-stop music across techno, house, and trance.', NOW() + INTERVAL '14 days', 'Manchester', 500.00, 'techno', 'advanced', 'Warehouse 7', (SELECT id FROM user_profiles LIMIT 1), 'https://example.com/warehouse-rave.jpg', true),
('Deep House Sessions', 'Intimate deep house night at our premium lounge. Perfect for DJs who love to take the crowd on a musical journey.', NOW() + INTERVAL '3 days', 'Birmingham', 200.00, 'deep house', 'intermediate', 'Neon Lounge', (SELECT id FROM user_profiles LIMIT 1), 'https://example.com/deep-house.jpg', true),
('Rooftop Electronic', 'Sunset to sunrise electronic music experience on our stunning rooftop venue with panoramic city views.', NOW() + INTERVAL '10 days', 'London', 400.00, 'electronic', 'advanced', 'Skyline Rooftop', (SELECT id FROM user_profiles LIMIT 1), 'https://example.com/rooftop.jpg', true),
('Corporate Gala DJ', 'Professional DJ needed for corporate gala event. Must be able to handle various music styles and read the corporate crowd.', NOW() + INTERVAL '5 days', 'London', 600.00, 'house', 'intermediate', 'Corporate Events Hall', (SELECT id FROM user_profiles LIMIT 1), 'https://example.com/corporate.jpg', true);

-- =============================================
-- 5. OPPORTUNITY REQUIREMENTS
-- =============================================

INSERT INTO opportunity_requirements (opportunity_id, requirement_type, requirement_value, is_mandatory, weight) VALUES
-- Underground Techno Night
((SELECT id FROM opportunities WHERE title = 'Underground Techno Night'), 'genre', '["techno", "minimal techno"]', true, 1.0),
((SELECT id FROM opportunities WHERE title = 'Underground Techno Night'), 'skill_level', 'intermediate', true, 1.0),
((SELECT id FROM opportunities WHERE title = 'Underground Techno Night'), 'experience', '2+ years', true, 0.8),
((SELECT id FROM opportunities WHERE title = 'Underground Techno Night'), 'equipment', '["CDJ-3000", "DJM-900NXS2"]', false, 0.6),

-- Warehouse Rave Experience
((SELECT id FROM opportunities WHERE title = 'Warehouse Rave Experience'), 'genre', '["techno", "house", "trance"]', true, 1.0),
((SELECT id FROM opportunities WHERE title = 'Warehouse Rave Experience'), 'skill_level', 'advanced', true, 1.0),
((SELECT id FROM opportunities WHERE title = 'Warehouse Rave Experience'), 'experience', '5+ years', true, 1.0),
((SELECT id FROM opportunities WHERE title = 'Warehouse Rave Experience'), 'equipment', '["CDJ-2000NXS2", "DJM-900NXS2"]', false, 0.7),

-- Deep House Sessions
((SELECT id FROM opportunities WHERE title = 'Deep House Sessions'), 'genre', '["deep house", "progressive house"]', true, 1.0),
((SELECT id FROM opportunities WHERE title = 'Deep House Sessions'), 'skill_level', 'intermediate', true, 1.0),
((SELECT id FROM opportunities WHERE title = 'Deep House Sessions'), 'experience', '1+ years', true, 0.6),

-- Rooftop Electronic
((SELECT id FROM opportunities WHERE title = 'Rooftop Electronic'), 'genre', '["electronic", "ambient", "downtempo"]', true, 1.0),
((SELECT id FROM opportunities WHERE title = 'Rooftop Electronic'), 'skill_level', 'advanced', true, 1.0),
((SELECT id FROM opportunities WHERE title = 'Rooftop Electronic'), 'experience', '3+ years', true, 0.8),

-- Corporate Gala DJ
((SELECT id FROM opportunities WHERE title = 'Corporate Gala DJ'), 'genre', '["house", "pop", "electronic", "top_40"]', true, 1.0),
((SELECT id FROM opportunities WHERE title = 'Corporate Gala DJ'), 'skill_level', 'intermediate', true, 1.0),
((SELECT id FROM opportunities WHERE title = 'Corporate Gala DJ'), 'experience', '2+ years', true, 0.9);

-- =============================================
-- 6. MATCHING ALGORITHM CONFIG
-- =============================================

INSERT INTO matching_algorithm_config (algorithm_name, version, config_data, is_active) VALUES
('R/HOOD Matchmaking v1.0', '1.0', '{
  "weights": {
    "genre_compatibility": 0.30,
    "skill_level_match": 0.25,
    "location_proximity": 0.20,
    "availability": 0.15,
    "equipment_match": 0.10
  },
  "thresholds": {
    "minimum_score": 50,
    "premium_score": 80,
    "exact_genre_bonus": 10,
    "same_city_bonus": 5
  },
  "filters": {
    "max_distance_km": 100,
    "max_days_ahead": 30,
    "min_experience_years": 1
  }
}', true);

-- =============================================
-- 7. SAMPLE DJ PREFERENCES (for existing users)
-- =============================================

-- Note: These will be created when users set up their preferences
-- This is just an example of what the data structure looks like

-- =============================================
-- 8. SAMPLE DJ AVAILABILITY
-- =============================================

-- Note: These will be created when users set their availability
-- This is just an example of what the data structure looks like

-- =============================================
-- 9. SAMPLE PERFORMANCE HISTORY
-- =============================================

-- Note: These will be created as users complete gigs
-- This is just an example of what the data structure looks like
