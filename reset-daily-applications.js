// Quick script to reset daily applications for the current user
// Run this with: node reset-daily-applications.js

const { createClient } = require('@supabase/supabase-js');

// Replace with your actual Supabase URL and anon key
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'your-supabase-url';
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-supabase-anon-key';

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetDailyApplications() {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error('❌ No authenticated user found');
      return;
    }

    console.log(`🔄 Resetting daily applications for user: ${user.id}`);

    // Delete applications made today
    const { error } = await supabase
      .from('applications')
      .delete()
      .eq('user_id', user.id)
      .gte('created_at', new Date().toISOString().split('T')[0]);

    if (error) {
      console.error('❌ Error resetting applications:', error);
      return;
    }

    console.log('✅ Daily applications reset successfully!');
    console.log('📊 User now has 5 applications remaining today.');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

// Run the reset
resetDailyApplications();
