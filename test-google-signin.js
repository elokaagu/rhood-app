// Test script to verify Google Sign-In configuration
// Run this with: node test-google-signin.js

const { createClient } = require("@supabase/supabase-js");

// Your Supabase configuration
const supabaseUrl = "https://jsmcduecuxtaqizhmiqo.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbWNkdWVjdXh0YXFpemhtaXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDUwNDIsImV4cCI6MjA3MjkyMTA0Mn0.CxQDVhiWf8qFf0SB0evnqniyMYUttpwF3ThlpB8dfso";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testGoogleSignIn() {
  console.log("🧪 Testing Google Sign-In Configuration...\n");

  try {
    // Test 1: Check Supabase connection
    console.log("1️⃣ Testing Supabase connection...");
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.log("❌ Supabase connection failed:", error.message);
      return;
    }
    console.log("✅ Supabase connection successful");

    // Test 2: Check Google OAuth URL generation
    console.log("\n2️⃣ Testing Google OAuth URL generation...");
    const redirectUrl = "rhoodapp://auth/callback";

    const { data: oauthData, error: oauthError } =
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

    if (oauthError) {
      console.log("❌ OAuth URL generation failed:", oauthError.message);
      console.log(
        "🔧 This usually means Google provider is not configured in Supabase"
      );
      console.log("📋 Please check:");
      console.log("   - Go to Supabase Dashboard → Authentication → Providers");
      console.log("   - Enable Google provider");
      console.log("   - Add your Google OAuth Client ID and Secret");
      return;
    }

    console.log("✅ OAuth URL generation successful");
    console.log("🔗 Generated URL:", oauthData.url);

    // Test 3: Verify redirect URL format
    console.log("\n3️⃣ Verifying redirect URL format...");
    if (oauthData.url.includes(redirectUrl)) {
      console.log("✅ Redirect URL properly configured");
    } else {
      console.log("⚠️  Redirect URL might not be properly configured");
    }

    console.log("\n🎉 Google Sign-In configuration appears to be working!");
    console.log("\n📋 Next steps:");
    console.log("   1. Test in your app by tapping 'Continue with Google'");
    console.log("   2. Check console logs for detailed debugging info");
    console.log("   3. If issues persist, verify Google Cloud Console setup");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Run the test
testGoogleSignIn();
