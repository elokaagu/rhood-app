#!/usr/bin/env node

/**
 * Test Message Sending Script
 * 
 * This script tests if messages can be sent to the database properly.
 * Run with: node scripts/test-message-sending.js
 */

const { createClient } = require("@supabase/supabase-js");

// Supabase configuration (using hardcoded values from lib/supabase.js)
const supabaseUrl = "https://jsmcduecuxtaqizhmiqo.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbWNkdWVjdXh0YXFpemhtaXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDUwNDIsImV4cCI6MjA3MjkyMTA0Mn0.CxQDVhiWf8qFf0SB0evnqniyMYUttpwF3ThlpB8dfso";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMessageSending() {
  try {
    console.log("🧪 Testing message sending functionality...");

    // Step 1: Get two test users
    console.log("\n👤 Getting test users...");
    const { data: users, error: usersError } = await supabase
      .from("user_profiles")
      .select("id")
      .limit(2);

    if (usersError) {
      console.error("❌ Error getting users:", usersError);
      return;
    }

    if (users.length < 2) {
      console.error("❌ Need at least 2 users to test messaging");
      return;
    }

    const user1Id = users[0].id;
    const user2Id = users[1].id;

    console.log(`✅ Found users: ${user1Id} and ${user2Id}`);

    // Step 2: Create a message thread
    console.log("\n🧵 Creating message thread...");
    const { data: thread, error: threadError } = await supabase
      .from("message_threads")
      .insert({
        type: "individual",
        user_id_1: user1Id,
        user_id_2: user2Id,
      })
      .select("id")
      .single();

    if (threadError) {
      console.error("❌ Error creating message thread:", threadError);
      return;
    }

    console.log(`✅ Created thread: ${thread.id}`);

    // Step 3: Send a test message
    console.log("\n💬 Sending test message...");
    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        thread_id: thread.id,
        sender_id: user1Id,
        content: "Hello! This is a test message from the script.",
      })
      .select("*")
      .single();

    if (messageError) {
      console.error("❌ Error sending message:", messageError);
      return;
    }

    console.log(`✅ Message sent: ${message.id}`);
    console.log(`📝 Content: "${message.content}"`);

    // Step 4: Retrieve the message
    console.log("\n📖 Retrieving message...");
    const { data: retrievedMessage, error: retrieveError } = await supabase
      .from("messages")
      .select(`
        *,
        sender:user_profiles!messages_sender_id_fkey(
          id,
          dj_name,
          full_name,
          profile_image_url
        )
      `)
      .eq("id", message.id)
      .single();

    if (retrieveError) {
      console.error("❌ Error retrieving message:", retrieveError);
      return;
    }

    console.log("✅ Message retrieved successfully:");
    console.log(`   ID: ${retrievedMessage.id}`);
    console.log(`   Content: "${retrievedMessage.content}"`);
    console.log(`   Thread ID: ${retrievedMessage.thread_id}`);
    console.log(`   Sender ID: ${retrievedMessage.sender_id}`);
    console.log(`   Created: ${retrievedMessage.created_at}`);

    // Step 5: Clean up test data
    console.log("\n🧹 Cleaning up test data...");
    await supabase.from("messages").delete().eq("id", message.id);
    await supabase.from("message_threads").delete().eq("id", thread.id);
    console.log("✅ Test data cleaned up");

    console.log("\n🎉 Message sending test completed successfully!");
    console.log("📊 Summary:");
    console.log("   • Message thread creation: ✅");
    console.log("   • Message sending: ✅");
    console.log("   • Message retrieval: ✅");
    console.log("   • Database persistence: ✅");

  } catch (error) {
    console.error("❌ Unexpected error during test:", error);
  }
}

// Run the test
testMessageSending();
