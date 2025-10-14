#!/usr/bin/env node

/**
 * Script to check user authentication status and email confirmation
 * This helps debug why users can't log in
 */

const { createClient } = require("@supabase/supabase-js");

// Supabase configuration
const supabaseUrl = "https://jsmcduecuxtaqizhmiqo.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbWNkdWVjdXh0YXFpemhtaXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDUwNDIsImV4cCI6MjA3MjkyMTA0Mn0.CxQDVhiWf8qFf0SB0evnqniyMYUttpwF3ThlpB8dfso";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserAuthStatus(email) {
  try {
    console.log(`🔍 Checking authentication status for: ${email}`);
    
    // Check if user exists in user_profiles table
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Error fetching user profile:', profileError);
      return;
    }

    if (!profile) {
      console.log('❌ No user profile found with that email');
      console.log('💡 This means the user was never created or email is wrong');
      return;
    }

    console.log('✅ User profile found:');
    console.log(`   ID: ${profile.id}`);
    console.log(`   Email: ${profile.email}`);
    console.log(`   Name: ${profile.dj_name || profile.full_name}`);
    console.log(`   Created: ${profile.created_at}`);
    
    // Try to determine auth status by attempting sign in with dummy password
    console.log('\n🔐 Testing authentication status...');
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: 'dummy_password_to_test_confirmation'
    });

    if (authError) {
      if (authError.message?.includes('Email not confirmed')) {
        console.log('❌ Email is NOT confirmed - this is why login fails!');
        console.log('💡 Solution: User needs to click confirmation link in their email');
        console.log('📧 Check their email inbox for confirmation email');
      } else if (authError.message?.includes('Invalid login credentials')) {
        console.log('✅ Email appears to be confirmed (got credential error, not confirmation error)');
        console.log('💡 Login failure is likely due to wrong password');
      } else if (authError.message?.includes('Too many requests')) {
        console.log('⚠️  Rate limited - too many login attempts');
        console.log('💡 Wait before trying again');
      } else {
        console.log('❓ Auth error:', authError.message);
      }
    } else {
      console.log('✅ Authentication successful (unexpected with dummy password)');
    }

    console.log('\n📋 Summary:');
    console.log('   - User profile exists in database');
    console.log('   - Check if email is confirmed in Supabase dashboard');
    console.log('   - If not confirmed, resend confirmation email');
    console.log('   - If confirmed, check password is correct');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.log('Usage: node scripts/confirm-user-email.js <email>');
  console.log('Example: node scripts/confirm-user-email.js johan@rhood.io');
  process.exit(1);
}

checkUserAuthStatus(email);