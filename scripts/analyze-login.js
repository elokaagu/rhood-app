#!/usr/bin/env node

/**
 * Comprehensive authentication analysis script
 * Helps debug login issues by checking both database and auth status
 */

const { createClient } = require("@supabase/supabase-js");

// Supabase configuration
const supabaseUrl = "https://jsmcduecuxtaqizhmiqo.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbWNkdWVjdXh0YXFpemhtaXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDUwNDIsImV4cCI6MjA3MjkyMTA0Mn0.CxQDVhiWf8qFf0SB0evnqniyMYUttpwF3ThlpB8dfso";

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeLoginIssue(email) {
  console.log(`🔍 Analyzing login issue for: ${email}`);
  console.log('=' .repeat(50));
  
  // Check case sensitivity
  const emailVariations = [
    email,
    email.toLowerCase(),
    email.toUpperCase(),
    email.charAt(0).toUpperCase() + email.slice(1).toLowerCase()
  ];
  
  console.log('\n📧 Checking email variations:');
  for (const variation of emailVariations) {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('email, dj_name, full_name, created_at')
      .eq('email', variation)
      .single();
    
    if (profile) {
      console.log(`✅ Found: ${variation} - ${profile.dj_name || profile.full_name}`);
    } else {
      console.log(`❌ Not found: ${variation}`);
    }
  }
  
  // Test authentication with the correct email case
  const correctEmail = emailVariations.find(async (variation) => {
    const { data } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('email', variation)
      .single();
    return !!data;
  });
  
  if (correctEmail) {
    console.log(`\n🔐 Testing authentication with: ${correctEmail}`);
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: correctEmail,
      password: 'dummy_password'
    });
    
    if (authError) {
      if (authError.message?.includes('Email not confirmed')) {
        console.log('❌ ISSUE: Email not confirmed');
        console.log('💡 SOLUTION: User needs to click confirmation link in email');
      } else if (authError.message?.includes('Invalid login credentials')) {
        console.log('✅ Email is confirmed');
        console.log('❌ ISSUE: Wrong password');
        console.log('💡 SOLUTION: User needs to reset password or use correct password');
      } else {
        console.log('❓ Other auth error:', authError.message);
      }
    }
  }
  
  console.log('\n📋 Summary of possible login issues:');
  console.log('1. Case sensitivity in email address');
  console.log('2. Email not confirmed (need to click confirmation link)');
  console.log('3. Wrong password');
  console.log('4. User profile exists but auth user doesn\'t exist');
  console.log('5. Rate limiting from too many attempts');
}

// Get email from command line arguments
const email = process.argv[2];

if (!email) {
  console.log('Usage: node scripts/analyze-login.js <email>');
  console.log('Example: node scripts/analyze-login.js johan@rhood.io');
  process.exit(1);
}

analyzeLoginIssue(email);
