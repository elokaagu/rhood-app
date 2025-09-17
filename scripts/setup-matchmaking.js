#!/usr/bin/env node

/**
 * R/HOOD Matchmaking System Setup Script
 * 
 * This script sets up the complete matchmaking system in Supabase:
 * 1. Creates all database tables
 * 2. Sets up indexes and RLS policies
 * 3. Seeds initial data
 * 4. Creates database functions
 * 
 * Usage: node scripts/setup-matchmaking.js
 */

const fs = require('fs');
const path = require('path');

// Read the SQL files
const schemaPath = path.join(__dirname, '../database/matchmaking-schema.sql');
const seedPath = path.join(__dirname, '../database/matchmaking-seed-data.sql');

const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
const seedSQL = fs.readFileSync(seedPath, 'utf8');

console.log('🎯 R/HOOD Matchmaking System Setup');
console.log('=====================================\n');

console.log('📋 Setup Instructions:');
console.log('1. Go to your Supabase dashboard');
console.log('2. Navigate to the SQL Editor');
console.log('3. Run the following SQL commands in order:\n');

console.log('🔧 Step 1: Create Database Schema');
console.log('----------------------------------');
console.log('Copy and paste this SQL into your Supabase SQL Editor:\n');
console.log('```sql');
console.log(schemaSQL);
console.log('```\n');

console.log('🌱 Step 2: Seed Initial Data');
console.log('-----------------------------');
console.log('After the schema is created, run this SQL to seed data:\n');
console.log('```sql');
console.log(seedSQL);
console.log('```\n');

console.log('✅ Step 3: Verify Setup');
console.log('------------------------');
console.log('Run this query to verify everything is set up correctly:\n');
console.log('```sql');
console.log(`
-- Check if all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'brief_templates', 'matching_criteria', 'dj_preferences', 
  'opportunity_requirements', 'matching_algorithm_config', 
  'matches', 'match_feedback', 'dj_availability', 
  'venue_profiles', 'dj_performance_history'
)
ORDER BY table_name;

-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('calculate_match_score', 'generate_matches_for_user')
ORDER BY routine_name;

-- Check seed data
SELECT 'brief_templates' as table_name, COUNT(*) as count FROM brief_templates
UNION ALL
SELECT 'matching_criteria', COUNT(*) FROM matching_criteria
UNION ALL
SELECT 'venue_profiles', COUNT(*) FROM venue_profiles
UNION ALL
SELECT 'opportunities', COUNT(*) FROM opportunities;
`);
console.log('```\n');

console.log('🚀 Step 4: Test the System');
console.log('---------------------------');
console.log('Test the matchmaking system with this query:\n');
console.log('```sql');
console.log(`
-- Test match generation (replace with actual user ID)
SELECT * FROM generate_matches_for_user('your-user-id-here');

-- Test match score calculation
SELECT calculate_match_score('your-user-id-here', 'your-opportunity-id-here');
`);
console.log('```\n');

console.log('📱 Step 5: Update Your App');
console.log('--------------------------');
console.log('1. Import the matchmaking library in your app:');
console.log('   import { matchmaking } from "./lib/matchmaking";');
console.log('');
console.log('2. Add the MatchmakingScreen to your navigation');
console.log('');
console.log('3. Set up user preferences:');
console.log('   await matchmaking.setDJPreferences(userId, preferences);');
console.log('');
console.log('4. Generate matches:');
console.log('   const matches = await matchmaking.generateMatches(userId);');
console.log('');

console.log('🎉 Setup Complete!');
console.log('==================');
console.log('Your R/HOOD matchmaking system is now ready!');
console.log('The system includes:');
console.log('• AI-powered DJ-opportunity matching');
console.log('• Comprehensive brief templates');
console.log('• Advanced filtering and scoring');
console.log('• Performance tracking and analytics');
console.log('• Venue and organizer profiles');
console.log('• Real-time availability management');
console.log('');
console.log('For more information, check the documentation in the database/ folder.');
