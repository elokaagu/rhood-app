#!/usr/bin/env node

// Debug script to test getGroupMessages function
const { createClient } = require("@supabase/supabase-js");

// Supabase configuration
const supabaseUrl = "https://jsmcduecuxtaqizhmiqo.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbWNkdWVjdXh0YXFpemhtaXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDUwNDIsImV4cCI6MjA3MjkyMTA0Mn0.CxQDVhiWf8qFf0SB0evnqniyMYUttpwF3ThlpB8dfso";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGetGroupMessages() {
  console.log("🔍 Testing getGroupMessages function...\n");

  try {
    // Test with R/HOOD community ID
    const rhoodCommunityId = "550e8400-e29b-41d4-a716-446655440000";

    console.log(
      `1. Testing getGroupMessages with R/HOOD community ID: ${rhoodCommunityId}`
    );

    const { data, error } = await supabase
      .from("community_posts")
      .select(
        `
        *,
        author:user_profiles!community_posts_author_id_fkey(
          id,
          dj_name,
          full_name,
          profile_image_url
        )
      `
      )
      .eq("community_id", rhoodCommunityId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("❌ Error in getGroupMessages:", error);
    } else {
      console.log(
        `✅ getGroupMessages successful, found ${data?.length || 0} messages`
      );
      if (data?.length > 0) {
        console.log("📋 Sample message:", {
          id: data[0].id,
          content: data[0].content,
          author: data[0].author,
        });
      }
    }

    // Test with other community ID
    console.log("\n2. Testing with other community ID...");
    const { data: otherCommunities } = await supabase
      .from("communities")
      .select("id, name")
      .neq("id", rhoodCommunityId)
      .limit(1);

    if (otherCommunities?.length > 0) {
      const otherCommunityId = otherCommunities[0].id;
      console.log(
        `Testing with community: ${otherCommunities[0].name} (${otherCommunityId})`
      );

      const { data: otherData, error: otherError } = await supabase
        .from("community_posts")
        .select(
          `
          *,
          author:user_profiles!community_posts_author_id_fkey(
            id,
            dj_name,
            full_name,
            profile_image_url
          )
        `
        )
        .eq("community_id", otherCommunityId)
        .order("created_at", { ascending: true });

      if (otherError) {
        console.error("❌ Error with other community:", otherError);
      } else {
        console.log(
          `✅ Other community successful, found ${
            otherData?.length || 0
          } messages`
        );
      }
    }

    // Test with invalid community ID
    console.log("\n3. Testing with invalid community ID...");
    const invalidId = "00000000-0000-0000-0000-000000000000";

    const { data: invalidData, error: invalidError } = await supabase
      .from("community_posts")
      .select(
        `
        *,
        author:user_profiles!community_posts_author_id_fkey(
          id,
          dj_name,
          full_name,
          profile_image_url
        )
      `
      )
      .eq("community_id", invalidId)
      .order("created_at", { ascending: true });

    if (invalidError) {
      console.error("❌ Error with invalid ID:", invalidError);
    } else {
      console.log(
        `✅ Invalid ID test successful, found ${
          invalidData?.length || 0
        } messages (should be 0)`
      );
    }
  } catch (error) {
    console.error("💥 Unexpected error:", error);
  }
}

// Run the test
testGetGroupMessages();
