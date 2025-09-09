const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://jsmcduecuxtaqizhmiqo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbWNkdWVjdXh0YXFpemhtaXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDUwNDIsImV4cCI6MjA3MjkyMTA0Mn0.CxQDVhiWf8qFf0SB0evnqniyMYUttpwF3ThlpB8dfso';

const supabase = createClient(supabaseUrl, supabaseKey);

// Sample opportunities data
const opportunities = [
  {
    title: 'Underground Warehouse Rave',
    description: 'High-energy underground event in East London. Looking for DJs who can bring the heat with hard techno and industrial beats. 500+ capacity venue with world-class sound system.',
    event_date: '2024-08-15T22:00:00.000Z',
    location: 'East London, UK',
    payment: 300.00,
    genre: 'Techno',
    skill_level: 'intermediate',
    organizer_name: 'Darkside Collective',
    is_active: true
  },
  {
    title: 'Club Neon Resident DJ',
    description: 'Weekly resident DJ position at Club Neon in Miami. House music focus with a vibrant crowd. Perfect for DJs looking to build their reputation in the Miami scene.',
    event_date: '2024-07-01T22:00:00.000Z',
    location: 'Miami, FL',
    payment: 200.00,
    genre: 'House',
    skill_level: 'beginner',
    organizer_name: 'Club Neon',
    is_active: true
  },
  {
    title: 'Berlin Underground Festival',
    description: 'Summer festival lineup in Berlin. Electronic music showcase with international artists. 3-day event with multiple stages and 10,000+ attendees.',
    event_date: '2024-08-20T20:00:00.000Z',
    location: 'Berlin, Germany',
    payment: 500.00,
    genre: 'Electronic',
    skill_level: 'advanced',
    organizer_name: 'Berlin Underground',
    is_active: true
  },
  {
    title: 'Ibiza Beach Party',
    description: 'Sunset beach party with world-class sound system. Progressive house and trance focus. Iconic location with stunning views.',
    event_date: '2024-09-10T18:00:00.000Z',
    location: 'Ibiza, Spain',
    payment: 400.00,
    genre: 'Progressive',
    skill_level: 'intermediate',
    organizer_name: 'Ibiza Events',
    is_active: true
  },
  {
    title: 'NYC Rooftop Sessions',
    description: 'Intimate rooftop DJ sessions in Manhattan. Deep house and minimal techno. Small capacity venue for quality over quantity.',
    event_date: '2024-07-25T19:00:00.000Z',
    location: 'New York, NY',
    payment: 250.00,
    genre: 'Deep House',
    skill_level: 'intermediate',
    organizer_name: 'NYC Underground',
    is_active: true
  },
  {
    title: 'Amsterdam Canal Festival',
    description: 'Unique canal-side event in Amsterdam. Electronic music with a focus on innovation and creativity. Floating stage setup.',
    event_date: '2024-08-30T21:00:00.000Z',
    location: 'Amsterdam, Netherlands',
    payment: 350.00,
    genre: 'Electronic',
    skill_level: 'advanced',
    organizer_name: 'Canal Events',
    is_active: true
  },
  {
    title: 'Tokyo Underground',
    description: 'Late-night underground event in Shibuya. Hard techno and industrial focus. 24-hour venue with international crowd.',
    event_date: '2024-09-15T23:00:00.000Z',
    location: 'Tokyo, Japan',
    payment: 450.00,
    genre: 'Techno',
    skill_level: 'advanced',
    organizer_name: 'Tokyo Underground',
    is_active: true
  },
  {
    title: 'Barcelona Beach Club',
    description: 'Beachfront club event in Barcelona. House and tech house focus. Summer vibes with international DJs.',
    event_date: '2024-08-05T20:00:00.000Z',
    location: 'Barcelona, Spain',
    payment: 300.00,
    genre: 'House',
    skill_level: 'intermediate',
    organizer_name: 'Barcelona Beats',
    is_active: true
  },
  {
    title: 'London Bridge Sessions',
    description: 'Underground venue under London Bridge. Drum & Bass and Jungle focus. Intimate setting with serious music lovers.',
    event_date: '2024-07-20T22:00:00.000Z',
    location: 'London, UK',
    payment: 200.00,
    genre: 'Drum & Bass',
    skill_level: 'intermediate',
    organizer_name: 'Bridge Events',
    is_active: true
  },
  {
    title: 'Miami Winter Music',
    description: 'Winter music conference showcase. Various electronic genres. Industry networking opportunity.',
    event_date: '2024-12-15T19:00:00.000Z',
    location: 'Miami, FL',
    payment: 400.00,
    genre: 'Electronic',
    skill_level: 'advanced',
    organizer_name: 'Winter Music Conference',
    is_active: true
  }
];

async function seedOpportunities() {
  try {
    console.log('🌱 Starting to seed opportunities...');
    
    // First, let's check if opportunities already exist
    const { data: existingOpportunities, error: checkError } = await supabase
      .from('opportunities')
      .select('id')
      .limit(1);
    
    if (checkError) {
      console.error('❌ Error checking existing opportunities:', checkError);
      return;
    }
    
    if (existingOpportunities && existingOpportunities.length > 0) {
      console.log('ℹ️  Opportunities already exist in the database.');
      console.log('📊 Current opportunities count:', existingOpportunities.length);
      return;
    }
    
    // Insert opportunities
    const { data, error } = await supabase
      .from('opportunities')
      .insert(opportunities)
      .select();
    
    if (error) {
      console.error('❌ Error inserting opportunities:', error);
      return;
    }
    
    console.log('✅ Successfully seeded opportunities!');
    console.log(`📊 Inserted ${data.length} opportunities:`);
    
    data.forEach((opp, index) => {
      console.log(`${index + 1}. ${opp.title} - ${opp.location} - £${opp.payment}`);
    });
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the seeding function
seedOpportunities();
