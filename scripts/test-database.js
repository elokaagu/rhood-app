#!/usr/bin/env node

/**
 * Test Database Connection Script
 *
 * This script tests if the database tables and functions are working properly.
 * Run with: node scripts/test-database.js
 */

const { createClient } = require("@supabase/supabase-js");

// Supabase configuration (using hardcoded values from lib/supabase.js)
const supabaseUrl = "https://jsmcduecuxtaqizhmiqo.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbWNkdWVjdXh0YXFpemhtaXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDUwNDIsImV4cCI6MjA3MjkyMTA0Mn0.CxQDVhiWf8qFf0SB0evnqniyMYUttpwF3ThlpB8dfso";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDatabase() {
  try {
    console.log("🔍 Testing database connection and tables...");

    // Test 1: Check if message_threads table exists
    console.log("\n📋 Testing message_threads table...");
    const { data: threads, error: threadsError } = await supabase
      .from("message_threads")
      .select("*")
      .limit(1);

    if (threadsError) {
      console.error("❌ message_threads table error:", threadsError);
    } else {
      console.log("✅ message_threads table accessible");
    }

    // Test 2: Check if messages table exists
    console.log("\n💬 Testing messages table...");
    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select("*")
      .limit(1);

    if (messagesError) {
      console.error("❌ messages table error:", messagesError);
    } else {
      console.log("✅ messages table accessible");
    }

    // Test 3: Check if user_profiles table exists
    console.log("\n👤 Testing user_profiles table...");
    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("*")
      .limit(1);

    if (profilesError) {
      console.error("❌ user_profiles table error:", profilesError);
    } else {
      console.log("✅ user_profiles table accessible");
    }

    // Test 4: Check if connections table exists
    console.log("\n🔗 Testing connections table...");
    const { data: connections, error: connectionsError } = await supabase
      .from("connections")
      .select("*")
      .limit(1);

    if (connectionsError) {
      console.error("❌ connections table error:", connectionsError);
    } else {
      console.log("✅ connections table accessible");
    }

    // Test 5: Try to create a test message thread
    console.log("\n🧵 Testing message thread creation...");
    const testUserId1 = "00000000-0000-0000-0000-000000000001";
    const testUserId2 = "00000000-0000-0000-0000-000000000002";

    const { data: testThread, error: testThreadError } = await supabase
      .from("message_threads")
      .insert({
        type: "individual",
        user_id_1: testUserId1,
        user_id_2: testUserId2,
      })
      .select("id")
      .single();

    if (testThreadError) {
      console.error("❌ Message thread creation error:", testThreadError);
    } else {
      console.log("✅ Message thread creation works");

      // Clean up test thread
      await supabase.from("message_threads").delete().eq("id", testThread.id);
      console.log("🧹 Cleaned up test thread");
    }

    console.log("\n🎉 Database test completed!");
  } catch (error) {
    console.error("❌ Unexpected error during database test:", error);
  }
}

// Run the test
testDatabase();
