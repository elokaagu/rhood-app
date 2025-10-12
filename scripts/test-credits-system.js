#!/usr/bin/env node

/**
 * Test script for the R/HOOD credits system
 *
 * This script tests the credits functionality:
 * - Award credits for gig completion
 * - Award credits for achievement unlock
 * - Get user credits
 */

const { createClient } = require("@supabase/supabase-js");

// Supabase configuration
const supabaseUrl = "https://jsmcduecuxtaqizhmiqo.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbWNkdWVjdXh0YXFpemhtaXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDUwNDIsImV4cCI6MjA3MjkyMTA0Mn0.CxQDVhiWf8qFf0SB0evnqniyMYUttpwF3ThlpB8dfso";

const supabase = createClient(supabaseUrl, supabaseKey);

async function testCreditsSystem() {
  console.log("\n🎯 Testing R/HOOD Credits System\n");
  console.log("═══════════════════════════════════════════════════════════\n");

  try {
    // Test 1: Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log("❌ No authenticated user found");
      console.log(
        "💡 Please make sure you're logged in to test the credits system"
      );
      return;
    }

    console.log(`✅ Testing with user: ${user.email} (${user.id})`);

    // Test 2: Get current credits
    console.log("\n📊 Current Credits Status:");
    const { data: credits, error: creditsError } = await supabase.rpc(
      "get_user_credits",
      {
        user_uuid: user.id,
      }
    );

    if (creditsError) {
      console.error("❌ Error getting credits:", creditsError);
    } else {
      console.log(`💰 Current credits: ${credits || 0}`);
    }

    // Test 3: Create a test gig (if none exists)
    console.log("\n🎵 Testing Gig Credits:");
    const { data: existingGigs, error: gigsError } = await supabase
      .from("gigs")
      .select("id, title, status, credits_awarded")
      .eq("dj_id", user.id)
      .limit(1);

    if (gigsError) {
      console.error("❌ Error checking gigs:", gigsError);
    } else if (existingGigs.length === 0) {
      console.log("📝 Creating test gig...");
      const { data: newGig, error: createGigError } = await supabase
        .from("gigs")
        .insert([
          {
            dj_id: user.id,
            title: "Test Gig for Credits",
            venue: "Test Venue",
            event_date: new Date().toISOString(),
            status: "pending",
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      if (createGigError) {
        console.error("❌ Error creating test gig:", createGigError);
      } else {
        console.log("✅ Test gig created:", newGig[0].title);

        // Award credits for the gig
        const { data: gigCredits, error: awardGigError } = await supabase.rpc(
          "award_gig_credits",
          {
            gig_id: newGig[0].id,
          }
        );

        if (awardGigError) {
          console.error("❌ Error awarding gig credits:", awardGigError);
        } else {
          console.log("🎉 Gig credits awarded successfully!");
        }
      }
    } else {
      console.log("📋 Found existing gigs:");
      existingGigs.forEach((gig) => {
        console.log(
          `   - ${gig.title} (Status: ${gig.status}, Credits Awarded: ${gig.credits_awarded})`
        );
      });
    }

    // Test 4: Check achievements
    console.log("\n🏆 Testing Achievement Credits:");
    const { data: achievements, error: achievementsError } = await supabase
      .from("achievements")
      .select("id, name, credits_value")
      .limit(3);

    if (achievementsError) {
      console.error("❌ Error getting achievements:", achievementsError);
    } else {
      console.log("📜 Available achievements:");
      achievements.forEach((achievement) => {
        console.log(
          `   - ${achievement.name} (${achievement.credits_value} credits)`
        );
      });
    }

    // Test 5: Get updated credits
    console.log("\n💰 Final Credits Status:");
    const { data: finalCredits, error: finalCreditsError } = await supabase.rpc(
      "get_user_credits",
      {
        user_uuid: user.id,
      }
    );

    if (finalCreditsError) {
      console.error("❌ Error getting final credits:", finalCreditsError);
    } else {
      console.log(`🎯 Final credits: ${finalCredits || 0}`);
    }

    console.log(
      "\n═══════════════════════════════════════════════════════════\n"
    );
    console.log("✅ Credits system test completed!");
    console.log("\n💡 Next steps:");
    console.log("   1. Run the database migration to add the credits system");
    console.log("   2. Test gig completion in the app");
    console.log("   3. Test achievement unlocking in the app");
    console.log("   4. Check your profile to see credits displayed\n");
  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

// Run the test
testCreditsSystem();
