#!/usr/bin/env node

// Debug script to check social media handles in user profiles
const { createClient } = require("@supabase/supabase-js");

// Supabase configuration
const supabaseUrl = "https://jsmcduecuxtaqizhmiqo.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbWNkdWVjdXh0YXFpemhtaXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDUwNDIsImV4cCI6MjA3MjkyMTA0Mn0.CxQDVhiWf8qFf0SB0evnqniyMYUttpwF3ThlpB8dfso";

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSocialMediaHandles() {
  console.log("🔍 Debugging Social Media Handles...\n");

  try {
    // 1. Check all user profiles for social media handles
    console.log("1. Checking all user profiles...");
    const { data: profiles, error: profilesError } = await supabase
      .from("user_profiles")
      .select("id, dj_name, full_name, instagram, soundcloud")
      .order("created_at", { ascending: false })
      .limit(10);

    if (profilesError) {
      console.error("❌ Error fetching profiles:", profilesError);
      return;
    }

    console.log(`✅ Found ${profiles?.length || 0} user profiles`);
    
    if (profiles?.length > 0) {
      console.log("\n📋 Social Media Handles:");
      profiles.forEach((profile, index) => {
        console.log(`${index + 1}. ${profile.dj_name || profile.full_name || "Unknown"}:`);
        console.log(`   Instagram: ${profile.instagram || "Not set"}`);
        console.log(`   SoundCloud: ${profile.soundcloud || "Not set"}`);
        console.log("");
      });
    }

    // 2. Check if instagram and soundcloud columns exist
    console.log("2. Checking column structure...");
    const { data: columns, error: columnsError } = await supabase
      .from("information_schema.columns")
      .select("column_name, data_type")
      .eq("table_name", "user_profiles")
      .in("column_name", ["instagram", "soundcloud"]);

    if (columnsError) {
      console.error("❌ Error checking columns:", columnsError);
    } else {
      console.log("✅ Column structure:");
      columns?.forEach((col) => {
        console.log(`   ${col.column_name}: ${col.data_type}`);
      });
    }

    // 3. Test updating a profile with social media handles
    console.log("\n3. Testing profile update...");
    if (profiles?.length > 0) {
      const testProfile = profiles[0];
      console.log(`Testing update for: ${testProfile.dj_name || testProfile.full_name}`);
      
      const testUpdate = {
        instagram: "https://instagram.com/testhandle",
        soundcloud: "https://soundcloud.com/testuser",
        updated_at: new Date().toISOString()
      };

      const { data: updatedProfile, error: updateError } = await supabase
        .from("user_profiles")
        .update(testUpdate)
        .eq("id", testProfile.id)
        .select("id, dj_name, instagram, soundcloud");

      if (updateError) {
        console.error("❌ Error updating profile:", updateError);
      } else {
        console.log("✅ Profile updated successfully:");
        console.log(`   Instagram: ${updatedProfile[0]?.instagram || "Not set"}`);
        console.log(`   SoundCloud: ${updatedProfile[0]?.soundcloud || "Not set"}`);
      }
    }

  } catch (error) {
    console.error("💥 Unexpected error:", error);
  }
}

// Run the debug
debugSocialMediaHandles();
