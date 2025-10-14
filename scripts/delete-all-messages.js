#!/usr/bin/env node

/**
 * Delete All Messages Script
 *
 * This script deletes all messages from the database to clean up test data.
 * Run with: node scripts/delete-all-messages.js
 */

const { createClient } = require("@supabase/supabase-js");

// Supabase configuration (using hardcoded values from lib/supabase.js)
const supabaseUrl = "https://jsmcduecuxtaqizhmiqo.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbWNkdWVjdXh0YXFpemhtaXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDUwNDIsImV4cCI6MjA3MjkyMTA0Mn0.CxQDVhiWf8qFf0SB0evnqniyMYUttpwF3ThlpB8dfso";

const supabase = createClient(supabaseUrl, supabaseKey);

async function deleteAllMessages() {
  try {
    console.log("🗑️  Starting message cleanup...");

    // Delete all individual messages
    console.log("📱 Deleting individual messages...");
    const { error: messagesError, count: messagesCount } = await supabase
      .from("messages")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all (using a condition that's always true)

    if (messagesError) {
      console.error("❌ Error deleting individual messages:", messagesError);
    } else {
      console.log(`✅ Deleted ${messagesCount || 0} individual messages`);
    }

    // Delete all community posts (group messages)
    console.log("👥 Deleting community posts...");
    const { error: postsError, count: postsCount } = await supabase
      .from("community_posts")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (postsError) {
      console.error("❌ Error deleting community posts:", postsError);
    } else {
      console.log(`✅ Deleted ${postsCount || 0} community posts`);
    }

    // Delete all message threads (optional - this will also delete the threads)
    console.log("🧵 Deleting message threads...");
    const { error: threadsError, count: threadsCount } = await supabase
      .from("message_threads")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (threadsError) {
      console.error("❌ Error deleting message threads:", threadsError);
    } else {
      console.log(`✅ Deleted ${threadsCount || 0} message threads`);
    }

    // Delete all notifications (optional - clean up notification history)
    console.log("🔔 Deleting notifications...");
    const { error: notificationsError, count: notificationsCount } =
      await supabase
        .from("notifications")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (notificationsError) {
      console.error("❌ Error deleting notifications:", notificationsError);
    } else {
      console.log(`✅ Deleted ${notificationsCount || 0} notifications`);
    }

    console.log("\n🎉 Message cleanup completed successfully!");
    console.log("📊 Summary:");
    console.log(`   • Individual messages: ${messagesCount || 0}`);
    console.log(`   • Community posts: ${postsCount || 0}`);
    console.log(`   • Message threads: ${threadsCount || 0}`);
    console.log(`   • Notifications: ${notificationsCount || 0}`);
  } catch (error) {
    console.error("❌ Unexpected error during cleanup:", error);
    process.exit(1);
  }
}

// Run the cleanup
deleteAllMessages();
