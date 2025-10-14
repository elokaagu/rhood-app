const { createClient } = require("@supabase/supabase-js");

// Supabase configuration
const supabaseUrl = "https://jsmcduecuxtaqizhmiqo.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbWNkdWVjdXh0YXFpemhtaXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDUwNDIsImV4cCI6MjA3MjkyMTA0Mn0.CxQDVhiWf8qFf0SB0evnqniyMYUttpwF3ThlpB8dfso";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRhoodCommunity() {
  console.log("🔍 Checking R/HOOD community in database...\n");

  try {
    // Check if communities table exists and get all communities
    console.log("📋 Fetching all communities...");
    const { data: communities, error: communitiesError } = await supabase
      .from("communities")
      .select("*")
      .order("created_at", { ascending: false });

    if (communitiesError) {
      console.error("❌ Error fetching communities:", communitiesError);
      return;
    }

    console.log(`✅ Found ${communities?.length || 0} communities:`);

    if (communities && communities.length > 0) {
      communities.forEach((community, index) => {
        console.log(`\n${index + 1}. Community:`);
        console.log(`   ID: ${community.id}`);
        console.log(`   Name: ${community.name}`);
        console.log(
          `   Description: ${community.description || "No description"}`
        );
        console.log(`   Image URL: ${community.image_url || "No image"}`);
        console.log(`   Member Count: ${community.member_count || 0}`);
        console.log(`   Created: ${community.created_at}`);
      });
    } else {
      console.log("📭 No communities found in database");
    }

    // Check specifically for R/HOOD community
    const rhoodCommunityId = "550e8400-e29b-41d4-a716-446655440000";
    console.log(
      `\n🎯 Looking for R/HOOD community with ID: ${rhoodCommunityId}`
    );

    const { data: rhoodCommunity, error: rhoodError } = await supabase
      .from("communities")
      .select("*")
      .eq("id", rhoodCommunityId)
      .single();

    if (rhoodError) {
      if (rhoodError.code === "PGRST116") {
        console.log("❌ R/HOOD community not found with that ID");
      } else {
        console.error("❌ Error fetching R/HOOD community:", rhoodError);
      }
    } else {
      console.log("✅ R/HOOD community found:");
      console.log(`   ID: ${rhoodCommunity.id}`);
      console.log(`   Name: ${rhoodCommunity.name}`);
      console.log(
        `   Description: ${rhoodCommunity.description || "No description"}`
      );
      console.log(`   Image URL: ${rhoodCommunity.image_url || "No image"}`);
      console.log(`   Member Count: ${rhoodCommunity.member_count || 0}`);
      console.log(`   Created: ${rhoodCommunity.created_at}`);
    }

    // Check community_members table
    console.log("\n👥 Checking community_members table...");
    const { data: members, error: membersError } = await supabase
      .from("community_members")
      .select("*")
      .limit(5);

    if (membersError) {
      console.error("❌ Error fetching community members:", membersError);
    } else {
      console.log(
        `✅ Found ${members?.length || 0} community members (showing first 5):`
      );
      if (members && members.length > 0) {
        members.forEach((member, index) => {
          console.log(
            `   ${index + 1}. Community: ${member.community_id}, User: ${
              member.user_id
            }`
          );
        });
      }
    }

    // Check community_posts table
    console.log("\n💬 Checking community_posts table...");
    const { data: posts, error: postsError } = await supabase
      .from("community_posts")
      .select("*")
      .limit(5);

    if (postsError) {
      console.error("❌ Error fetching community posts:", postsError);
    } else {
      console.log(
        `✅ Found ${posts?.length || 0} community posts (showing first 5):`
      );
      if (posts && posts.length > 0) {
        posts.forEach((post, index) => {
          console.log(
            `   ${index + 1}. Community: ${post.community_id}, Author: ${
              post.author_id
            }, Content: ${post.content?.substring(0, 50)}...`
          );
        });
      }
    }
  } catch (error) {
    console.error("💥 Unexpected error:", error);
  }
}

// Run the check
checkRhoodCommunity();
