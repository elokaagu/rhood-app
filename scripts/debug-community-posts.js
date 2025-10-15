#!/usr/bin/env node

// Debug script to check community_posts table structure
const { createClient } = require("@supabase/supabase-js");

// Supabase configuration
const supabaseUrl = "https://jsmcduecuxtaqizhmiqo.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbWNkdWVjdXh0YXFpemhtaXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDUwNDIsImV4cCI6MjA3MjkyMTA0Mn0.CxQDVhiWf8qFf0SB0evnqniyMYUttpwF3ThlpB8dfso";

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugCommunityPosts() {
  console.log("🔍 Debugging Community Posts...\n");

  try {
    // 1. Check community_posts table structure
    console.log("1. Checking community_posts table...");
    const { data: posts, error: postsError } = await supabase
      .from("community_posts")
      .select("*");

    if (postsError) {
      console.error("❌ Error fetching community posts:", postsError);
      return;
    }

    console.log(`✅ Found ${posts?.length || 0} community posts`);
    if (posts?.length > 0) {
      console.log("📋 Sample post:", posts[0]);
    }

    // 2. Check if the author_id exists in user_profiles
    if (posts?.length > 0) {
      const post = posts[0];
      console.log(
        `\n2. Checking author_id ${post.author_id} in user_profiles...`
      );

      const { data: author, error: authorError } = await supabase
        .from("user_profiles")
        .select("id, dj_name, full_name")
        .eq("id", post.author_id)
        .single();

      if (authorError) {
        console.error("❌ Error fetching author:", authorError);
      } else {
        console.log("✅ Author found:", author);
      }
    }

    // 3. Test the foreign key relationship manually
    if (posts?.length > 0) {
      const post = posts[0];
      console.log(
        `\n3. Testing foreign key relationship for post ${post.id}...`
      );

      const { data: postWithAuthor, error: fkError } = await supabase
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
        .eq("id", post.id)
        .single();

      if (fkError) {
        console.error("❌ Foreign key relationship failed:", fkError);
      } else {
        console.log("✅ Foreign key relationship works:", {
          postId: postWithAuthor.id,
          content: postWithAuthor.content,
          author: postWithAuthor.author,
        });
      }
    }
  } catch (error) {
    console.error("💥 Unexpected error:", error);
  }
}

// Run the debug
debugCommunityPosts();
