#!/usr/bin/env node

/**
 * Setup R/HOOD Community Script
 *
 * This script creates the main R/HOOD community and adds all users as members.
 * Run with: node scripts/setup-rhood-community.js
 */

const { createClient } = require("@supabase/supabase-js");

// Supabase configuration (using hardcoded values from lib/supabase.js)
const supabaseUrl = "https://jsmcduecuxtaqizhmiqo.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbWNkdWVjdXh0YXFpemhtaXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDUwNDIsImV4cCI6MjA3MjkyMTA0Mn0.CxQDVhiWf8qFf0SB0evnqniyMYUttpwF3ThlpB8dfso";

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupRhoodCommunity() {
  try {
    console.log("🏗️  Setting up R/HOOD Community...");

    // Step 1: Create communities table if it doesn't exist
    console.log("\n📋 Creating communities table...");
    const { error: communitiesTableError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS communities (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          image_url TEXT,
          created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `,
    });

    if (communitiesTableError) {
      console.log(
        "ℹ️  Communities table might already exist or RPC not available"
      );
    } else {
      console.log("✅ Communities table created");
    }

    // Step 2: Create community_members table if it doesn't exist
    console.log("\n👥 Creating community_members table...");
    const { error: membersTableError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS community_members (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
          user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
          role VARCHAR(50) DEFAULT 'member',
          joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(community_id, user_id)
        );
      `,
    });

    if (membersTableError) {
      console.log(
        "ℹ️  Community members table might already exist or RPC not available"
      );
    } else {
      console.log("✅ Community members table created");
    }

    // Step 3: Create R/HOOD community
    console.log("\n🎵 Creating R/HOOD community...");
    const { data: existingCommunity, error: findError } = await supabase
      .from("communities")
      .select("id")
      .eq("name", "R/HOOD Group")
      .single();

    let communityId;
    if (existingCommunity) {
      console.log("✅ R/HOOD community already exists");
      communityId = existingCommunity.id;
    } else {
      const { data: newCommunity, error: createError } = await supabase
        .from("communities")
        .insert({
          name: "R/HOOD Group",
          description:
            "The main community chat for all R/HOOD users. Connect, share music, and collaborate!",
          image_url: "rhood_logo.webp",
        })
        .select("id")
        .single();

      if (createError) {
        console.error("❌ Error creating R/HOOD community:", createError);
        return;
      }

      console.log("✅ R/HOOD community created");
      communityId = newCommunity.id;
    }

    // Step 4: Get all users
    console.log("\n👤 Getting all users...");
    const { data: users, error: usersError } = await supabase
      .from("user_profiles")
      .select("id");

    if (usersError) {
      console.error("❌ Error getting users:", usersError);
      return;
    }

    console.log(`📊 Found ${users.length} users`);

    // Step 5: Add all users to R/HOOD community
    console.log("\n➕ Adding users to R/HOOD community...");
    const membersToAdd = users.map((user) => ({
      community_id: communityId,
      user_id: user.id,
      role: "member",
    }));

    const { error: membersError } = await supabase
      .from("community_members")
      .upsert(membersToAdd, {
        onConflict: "community_id,user_id",
        ignoreDuplicates: true,
      });

    if (membersError) {
      console.error("❌ Error adding members:", membersError);
    } else {
      console.log(`✅ Added ${users.length} users to R/HOOD community`);
    }

    // Step 6: Create community posts table if it doesn't exist
    console.log("\n💬 Creating community_posts table...");
    const { error: postsTableError } = await supabase.rpc("exec_sql", {
      sql: `
        CREATE TABLE IF NOT EXISTS community_posts (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
          author_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `,
    });

    if (postsTableError) {
      console.log(
        "ℹ️  Community posts table might already exist or RPC not available"
      );
    } else {
      console.log("✅ Community posts table created");
    }

    console.log("\n🎉 R/HOOD Community setup completed!");
    console.log(`📊 Community ID: ${communityId}`);
    console.log(`👥 Members: ${users.length}`);
  } catch (error) {
    console.error("❌ Unexpected error during setup:", error);
  }
}

// Run the setup
setupRhoodCommunity();
