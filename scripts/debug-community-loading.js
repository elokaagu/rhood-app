#!/usr/bin/env node

// Debug script to test community loading and group chat functionality
const { createClient } = require("@supabase/supabase-js");

// Supabase configuration
const supabaseUrl = "https://jsmcduecuxtaqizhmiqo.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbWNkdWVjdXh0YXFpemhtaXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDUwNDIsImV4cCI6MjA3MjkyMTA0Mn0.CxQDVhiWf8qFf0SB0evnqniyMYUttpwF3ThlpB8dfso";

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCommunityLoading() {
  console.log("🔍 Debugging Community Loading...\n");

  try {
    // 1. Check if communities table exists and has data
    console.log("1. Checking communities table...");
    const { data: communities, error: communitiesError } = await supabase
      .from("communities")
      .select("*")
      .limit(5);

    if (communitiesError) {
      console.error("❌ Error fetching communities:", communitiesError);
      return;
    }

    console.log(`✅ Found ${communities?.length || 0} communities`);
    if (communities?.length > 0) {
      console.log("📋 Sample community:", {
        id: communities[0].id,
        name: communities[0].name,
        member_count: communities[0].member_count,
        image_url: communities[0].image_url,
      });
    }

    // 2. Check community_members table
    console.log("\n2. Checking community_members table...");
    const { data: members, error: membersError } = await supabase
      .from("community_members")
      .select("*")
      .limit(5);

    if (membersError) {
      console.error("❌ Error fetching community members:", membersError);
    } else {
      console.log(`✅ Found ${members?.length || 0} community members`);
    }

    // 3. Check community_posts table
    console.log("\n3. Checking community_posts table...");
    const { data: posts, error: postsError } = await supabase
      .from("community_posts")
      .select("*")
      .limit(5);

    if (postsError) {
      console.error("❌ Error fetching community posts:", postsError);
    } else {
      console.log(`✅ Found ${posts?.length || 0} community posts`);
    }

    // 4. Test the foreign key relationship
    console.log("\n4. Testing foreign key relationships...");
    if (communities?.length > 0) {
      const communityId = communities[0].id;

      const { data: postsWithAuthor, error: postsWithAuthorError } =
        await supabase
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
          .eq("community_id", communityId)
          .limit(3);

      if (postsWithAuthorError) {
        console.error(
          "❌ Error testing foreign key relationship:",
          postsWithAuthorError
        );
      } else {
        console.log(
          `✅ Found ${postsWithAuthor?.length || 0} posts with author data`
        );
        if (postsWithAuthor?.length > 0) {
          console.log("📋 Sample post with author:", {
            id: postsWithAuthor[0].id,
            content: postsWithAuthor[0].content,
            author: postsWithAuthor[0].author,
          });
        }
      }
    }

    // 5. Test the getAllCommunities query
    console.log("\n5. Testing getAllCommunities query...");
    const { data: allCommunities, error: allCommunitiesError } = await supabase
      .from("communities")
      .select(
        `
        id,
        name,
        description,
        member_count,
        created_at,
        created_by,
        user_profiles!communities_created_by_fkey (
          dj_name,
          profile_image_url
        )
      `
      )
      .order("member_count", { ascending: false })
      .limit(3);

    if (allCommunitiesError) {
      console.error(
        "❌ Error testing getAllCommunities query:",
        allCommunitiesError
      );
    } else {
      console.log(
        `✅ getAllCommunities query successful, found ${
          allCommunities?.length || 0
        } communities`
      );
      if (allCommunities?.length > 0) {
        console.log("📋 Sample community with creator:", {
          id: allCommunities[0].id,
          name: allCommunities[0].name,
          creator: allCommunities[0].user_profiles,
        });
      }
    }

    console.log("\n🎯 Debug Summary:");
    console.log(`- Communities: ${communities?.length || 0}`);
    console.log(`- Members: ${members?.length || 0}`);
    console.log(`- Posts: ${posts?.length || 0}`);
    console.log(
      `- Foreign key test: ${
        typeof postsWithAuthorError !== "undefined" && postsWithAuthorError
          ? "FAILED"
          : "PASSED"
      }`
    );
    console.log(
      `- getAllCommunities test: ${allCommunitiesError ? "FAILED" : "PASSED"}`
    );
  } catch (error) {
    console.error("💥 Unexpected error:", error);
  }
}

// Run the debug
debugCommunityLoading();
