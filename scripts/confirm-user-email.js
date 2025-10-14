#!/usr/bin/env node

/**
 * Script to manually confirm user emails in Supabase
 * This can be used to help users who are having email confirmation issues
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://jsmcduecuxtaqizhmiqo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbWNkdWVjdXh0YXFpemhtaXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE0NzQ5MzQsImV4cCI6MjA0NzA1MDkzNH0.8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K8K';

const supabase = createClient(supabaseUrl, supabaseKey);

async function confirmUserEmail(email) {
  try {
    console.log(`🔍 Looking for user with email: ${email}`);
    
    // Get user by email
    const { data: users, error: fetchError } = await supabase
      .from('auth.users')
      .select('*')
      .eq('email', email)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching user:', fetchError);
      return;
    }

    if (!users) {
      console.log('❌ No user found with that email');
      return;
    }

    console.log('✅ User found:', users.id);
    console.log('📧 Email confirmed:', users.email_confirmed_at ? 'Yes' : 'No');
    
    if (users.email_confirmed_at) {
      console.log('✅ Email is already confirmed');
      return;
    }

    // Note: In production, you would need admin privileges to update auth.users
    // This is just for demonstration - actual confirmation should be done through Supabase dashboard
    console.log('⚠️  To confirm this email, use the Supabase dashboard:');
    console.log('   1. Go to Authentication > Users');
    console.log('   2. Find the user by email');
    console.log('   3. Click "Confirm" button');
    console.log('   4. Or resend confirmation email');

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

confirmUserEmail(email);
