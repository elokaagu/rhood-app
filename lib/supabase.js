import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { APPLICATION_LIMITS } from "./performanceConstants";

// Initialize Supabase client
const supabaseUrl = "https://jsmcduecuxtaqizhmiqo.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbWNkdWVjdXh0YXFpemhtaXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDUwNDIsImV4cCI6MjA3MjkyMTA0Mn0.CxQDVhiWf8qFf0SB0evnqniyMYUttpwF3ThlpB8dfso";

const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Authentication helper functions
export const auth = {
  // Sign up with email and password
  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: "exp+rhoodapp://expo-development-client/auth/callback",
      },
    });

    if (error) throw error;
    return data;
  },

  // Sign in with email and password
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  // Sign in with Google (Simple OAuth implementation)
  async signInWithGoogle(isSignupFlow = false) {
    try {
      console.log("🔐 Starting Google Sign-In...");

      // Create a redirect URL for the OAuth flow
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: "rhoodapp",
        path: "auth/callback",
      });

      console.log("🔗 Using redirect URL:", redirectUrl);

      // Check if we're in development mode
      if (__DEV__ || redirectUrl.includes("localhost")) {
        console.log("🔧 Development mode detected - using localhost redirect");
      }

      // Create the OAuth URL with account selection
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            prompt: "select_account", // Force account selection
          },
        },
      });

      if (error) throw error;

      console.log("🔐 Opening Google OAuth URL in browser...");

      // Open the OAuth URL in the browser
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl,
        {
          showInRecents: false,
          preferEphemeralSession: true, // Forces account selection
        }
      );

      console.log("🔍 OAuth result:", result.type);

      if (result.type === "success") {
        console.log("✅ OAuth success, processing result...");
        console.log("🔗 Callback URL:", result.url);

        // Extract tokens and errors from URL
        const url = new URL(result.url);

        // Check for errors first
        const error =
          url.searchParams.get("error") ||
          (url.hash
            ? new URLSearchParams(url.hash.substring(1)).get("error")
            : null);
        const errorDescription =
          url.searchParams.get("error_description") ||
          (url.hash
            ? new URLSearchParams(url.hash.substring(1)).get(
                "error_description"
              )
            : null);

        if (error) {
          const decodedError = decodeURIComponent(errorDescription || error);
          console.error("❌ OAuth error from provider:", decodedError);
          throw new Error(`Google Sign-In failed: ${decodedError}`);
        }

        // Try to get tokens from query parameters first
        let accessToken = url.searchParams.get("access_token");
        let refreshToken = url.searchParams.get("refresh_token");

        // If not in query params, check hash fragment
        if (!accessToken && url.hash) {
          const hashParams = new URLSearchParams(url.hash.substring(1));
          accessToken = hashParams.get("access_token");
          refreshToken = hashParams.get("refresh_token");
        }

        console.log("🎫 Tokens received:", {
          accessToken: !!accessToken,
          refreshToken: !!refreshToken,
        });

        if (accessToken) {
          // Set the session with the tokens
          const { data: sessionData, error: sessionError } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (sessionError) {
            console.error("❌ Session error:", sessionError);
            throw sessionError;
          }

          console.log("✅ Google Sign-In successful:", sessionData.user?.email);

          // Only create profile for signup flows, not login flows
          if (isSignupFlow) {
            console.log(
              "📝 Signup flow detected - checking/creating profile..."
            );
            try {
              console.log(
                "🔍 Checking for existing profile for user:",
                sessionData.user.id
              );
              const { data: existingProfile, error: profileError } =
                await supabase
                  .from("user_profiles")
                  .select("*")
                  .eq("id", sessionData.user.id)
                  .single();

              console.log("📋 Profile check result:", {
                profileError: profileError?.code,
                hasProfile: !!existingProfile,
                profileData: existingProfile
                  ? {
                      dj_name: existingProfile.dj_name,
                      email: existingProfile.email,
                    }
                  : null,
              });

              if (profileError && profileError.code === "PGRST116") {
                // No profile found, create one from Google data for signup
                console.log("📝 Creating profile for new Google user...");
                console.log("👤 User metadata:", {
                  full_name: sessionData.user.user_metadata?.full_name,
                  given_name: sessionData.user.user_metadata?.given_name,
                  family_name: sessionData.user.user_metadata?.family_name,
                  email: sessionData.user.email,
                });

                const { error: createError } = await supabase
                  .from("user_profiles")
                  .insert([
                    {
                      id: sessionData.user.id,
                      email: sessionData.user.email,
                      dj_name:
                        sessionData.user.user_metadata?.full_name ||
                        sessionData.user.email?.split("@")[0] ||
                        "DJ User",
                      first_name:
                        sessionData.user.user_metadata?.given_name || "",
                      last_name:
                        sessionData.user.user_metadata?.family_name || "",
                      profile_image_url: null, // Will use R/HOOD logo as default in UI
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    },
                  ]);

                if (createError) {
                  console.error("❌ Error creating profile:", createError);
                } else {
                  console.log("✅ Profile created for new Google user");
                }
              } else if (profileError) {
                console.error("❌ Error checking profile:", profileError);
              } else {
                console.log("✅ Existing profile found for Google user");
              }
            } catch (profileError) {
              console.warn("⚠️ Profile check/creation error:", profileError);
            }
          } else {
            console.log(
              "🔐 Login flow detected - letting handleLoginSuccess manage profile check"
            );
          }

          return sessionData;
        } else {
          throw new Error("No access token received from Google");
        }
      } else {
        console.log("❌ OAuth cancelled or failed:", result.type);
        throw new Error("Google Sign-In was cancelled or failed");
      }
    } catch (error) {
      console.error("❌ Google Sign-In error:", error);
      throw error;
    }
  },

  // Sign in with Apple (Native implementation using signInWithIdToken)
  async signInWithApple() {
    // One-attempt guard to prevent double taps
    if (this._signingInWithApple) {
      console.log(
        "⚠️ Apple Sign-In already in progress, ignoring duplicate request"
      );
      return;
    }

    this._signingInWithApple = true;

    try {
      // Check if Apple Sign-In is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        console.warn("⚠️ Apple Sign-In is not available on this device");
        console.warn(
          "⚠️ This is normal in iOS Simulator or development builds"
        );
        throw new Error("Apple Sign-In is not available on this device");
      }

      console.log("🍎 Starting Apple Sign-In...");

      // 1. Generate raw nonce: 32 random bytes → 64-char hex string
      const bytes = await Crypto.getRandomBytesAsync(32);
      const rawNonce = Array.from(bytes, (b) =>
        b.toString(16).padStart(2, "0")
      ).join("");

      // Validate nonce format
      if (!/^[0-9a-f]{64}$/.test(rawNonce)) {
        throw new Error("Bad nonce format");
      }

      // 2. Hash the raw nonce: SHA256 → base64url
      const base64Hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );
      const hashedNonce = base64Hash
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");

      // Forensic logging
      console.log(
        "[APPLE] rawNonce len/preview",
        rawNonce.length,
        rawNonce.slice(0, 6),
        rawNonce.slice(-6)
      );
      console.log(
        "[APPLE] hashedNonce len/preview",
        hashedNonce.length,
        hashedNonce.slice(0, 6),
        hashedNonce.slice(-6)
      );

      // 3. Request Apple Sign-In with hashed nonce
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce, // Send HASHED nonce to Apple
      });

      if (!credential.identityToken) {
        throw new Error("No identity token received from Apple");
      }

      // Decode and verify the token
      try {
        const b64urlDecode = (s) => {
          s = s.replace(/-/g, "+").replace(/_/g, "/");
          const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
          return atob(s + "=".repeat(pad));
        };
        const [, payload] = credential.identityToken.split(".");
        const claims = JSON.parse(b64urlDecode(payload));

        const nonceMatch = claims.nonce === hashedNonce;
        console.log("[APPLE] token.nonce === hashed?", nonceMatch);
        console.log("[APPLE] aud/iss", claims.aud, claims.iss);

        // Show alert for TestFlight debugging (temporary)
        if (__DEV__ === false) {
          Alert.alert(
            "Apple Sign-In Debug",
            `Nonce Match: ${nonceMatch ? "✅ YES" : "❌ NO"}\n\nBundle ID: ${
              claims.aud
            }\n\nIssuer: ${claims.iss}`,
            [{ text: "Continue" }]
          );
        }

        // Client-side claim check
        if (!nonceMatch) {
          console.error("❌ Client claim check failed: nonce mismatch");
        }
      } catch (decodeError) {
        console.warn(
          "⚠️ Could not decode token for verification:",
          decodeError.message
        );
      }

      console.log("✅ Apple credential received");
      console.log(
        "[SB call] nonce len/preview",
        rawNonce.length,
        rawNonce.slice(0, 6),
        rawNonce.slice(-6)
      );

      // 4. Try SDK first with detailed payload logging
      const payload = {
        provider: "apple",
        token: credential.identityToken,
        nonce: rawNonce,
      };
      console.log("[SB payload keys]", Object.keys(payload));
      console.log(
        "[SB payload nonce len/preview]",
        payload.nonce?.length,
        payload.nonce?.slice(0, 6),
        payload.nonce?.slice(-6)
      );

      const { data, error } = await supabase.auth.signInWithIdToken(payload);
      console.log("[SB sdk result]", {
        dataPresent: !!data?.session,
        error: error?.message,
      });

      if (error) {
        console.error("❌ SDK failed, trying direct REST call...");

        // 5. Fallback to direct REST call to bypass SDK
        try {
          const res = await fetch(
            "https://jsmcduecuxtaqizhmiqo.supabase.co/auth/v1/token?grant_type=id_token",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                apikey:
                  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbWNkdWVjdXh0YXFpemhtaXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDUwNDIsImV4cCI6MjA3MjkyMTA0Mn0.CxQDVhiWf8qFf0SB0evnqniyMYUttpwF3ThlpB8dfso",
              },
              body: JSON.stringify({
                provider: "apple",
                id_token: credential.identityToken,
                nonce: rawNonce,
              }),
            }
          );
          const json = await res.json();
          console.log("[GoTrue REST]", res.status, json);

          if (res.status === 200) {
            console.log(
              "✅ REST call succeeded - SDK was dropping/modifying nonce"
            );
            return { user: json.user, session: json };
          } else {
            console.error("❌ REST also failed - nonce issue confirmed");
            throw new Error(`REST failed: ${JSON.stringify(json)}`);
          }
        } catch (restError) {
          console.error("❌ REST call error:", restError);
          throw error; // Throw original SDK error
        }
      }

      console.log("✅ Apple Sign-In successful:", data.user?.email);
      return data;
    } catch (error) {
      console.error("❌ Apple Sign-In error:", error);
      throw error;
    } finally {
      this._signingInWithApple = false;
    }
  },

  // Sign out
  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  // Get current user
  async getCurrentUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  },

  // Get current session
  async getCurrentSession() {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  },

  // Reset password
  async resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: "rhoodapp://reset-password",
    });

    if (error) throw error;
    return data;
  },

  // Update password
  async updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return data;
  },

  // Update user profile
  async updateUserProfile(updates) {
    const { data, error } = await supabase.auth.updateUser({
      data: updates,
    });

    if (error) throw error;
    return data;
  },
};

// Database helper functions
export const db = {
  // User Profile Functions
  async createUserProfile(profile) {
    const { data, error } = await supabase
      .from("user_profiles")
      .upsert([profile], { onConflict: "id" })
      .select();

    if (error) throw error;
    return data[0];
  },

  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from("user_profiles")
      .select(
        "id, dj_name, full_name, first_name, last_name, email, bio, location, city, genres, profile_image_url, phone, show_email, show_phone, primary_mix_id, credits, created_at, updated_at, username, is_verified, gigs_completed, instagram, soundcloud"
      )
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  },

  // Get user profile without credits (for viewing other users' profiles)
  async getUserProfilePublic(userId) {
    const { data, error } = await supabase
      .from("user_profiles")
      .select(
        "id, dj_name, full_name, first_name, last_name, email, bio, location, city, genres, profile_image_url, phone, show_email, show_phone, primary_mix_id, created_at, updated_at, username, is_verified, gigs_completed, instagram, soundcloud"
      )
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  },

  async updateUserProfile(userId, updates) {
    const { data, error } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("id", userId)
      .select();

    if (error) throw error;
    return data[0];
  },

  async setPrimaryMix(userId, mixId) {
    const { data, error } = await supabase
      .from("user_profiles")
      .update({ primary_mix_id: mixId })
      .eq("id", userId)
      .select();

    if (error) throw error;
    return data[0];
  },

  async getUserMixes(userId) {
    const { data, error } = await supabase
      .from("mixes")
      .select("*")
      .eq("user_id", userId)
      .eq("is_public", true)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async hasUserUploadedMixes(userId) {
    console.log("🎯 Checking if user has uploaded mixes for userId:", userId);
    console.log("🎯 User ID type:", typeof userId);
    console.log("🎯 User ID length:", userId?.length);
    console.log("🎯 User ID first 10 chars:", userId?.substring(0, 10));

    try {
      // Check if user has any mixes at all (public or private)
      // The requirement is just to have uploaded mixes, not necessarily public ones
      const { data: userMixes, error: userMixesError } = await supabase
        .from("mixes")
        .select("id, user_id, is_public, title")
        .eq("user_id", userId)
        .limit(1);

      console.log("🎯 User mixes query result:", { userMixes, userMixesError });

      if (userMixesError) {
        console.error("🚨 Error checking user mixes:", userMixesError);
        console.log("🎯 RLS or database error detected");

        // If we can't check due to RLS issues, be conservative and block the application
        // This ensures users upload mixes before applying
        console.log("🎯 Blocking application due to database access error - user should upload a mix first");
        return false;
      }

      const hasMixes = userMixes && userMixes.length > 0;
      console.log("🎯 User has any mixes:", hasMixes);

      if (hasMixes) {
        console.log("🎯 Found mixes:", userMixes);
        // User has uploaded mixes, that's all we need to check
        return true;
      } else {
        console.log("🎯 No mixes found for user - they need to upload a mix first");
        return false;
      }
    } catch (error) {
      console.error("🚨 Unexpected error in hasUserUploadedMixes:", error);
      // If we can't determine due to errors, be conservative and block the application
      // This ensures users upload mixes before applying
      console.log("🎯 Blocking application due to database error - user should upload a mix first");
      return false;
    }
  },

  async getUserWithPrimaryMix(userId) {
    const { data, error } = await supabase
      .from("user_profiles")
      .select(
        "id, dj_name, full_name, first_name, last_name, email, bio, location, genres, profile_image_url, phone, show_email, show_phone, primary_mix_id, credits, created_at, updated_at, primary_mix:primary_mix_id(id, title, audio_url, duration, genre, created_at)"
      )
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  },

  // Opportunities Functions
  async getOpportunities() {
    const { data, error } = await supabase
      .from("opportunities")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async createOpportunity(opportunity) {
    const { data, error } = await supabase
      .from("opportunities")
      .insert([opportunity])
      .select();

    if (error) throw error;
    return data[0];
  },

  async applyToOpportunity(opportunityId, userId) {
    console.log("🎯 db.applyToOpportunity called with:", {
      opportunityId,
      userId,
    });

    // First check if user has uploaded any mixes
    try {
      const hasMixes = await this.hasUserUploadedMixes(userId);
      console.log("🎯 User has mixes:", hasMixes);
      if (!hasMixes) {
        throw new Error(
          "You must upload at least one mix before applying to opportunities. Go to the Listen screen to upload your first mix!"
        );
      }
    } catch (error) {
      console.error("🚨 Error checking user mixes:", error);
      throw error;
    }

    // Check if user can apply (hasn't exceeded daily limit)
    console.log("🎯 Checking daily application limit...");
    const { data: canApply, error: limitError } = await supabase.rpc(
      "check_daily_application_limit",
      {
        user_uuid: userId,
      }
    );

    if (limitError) {
      console.error("🚨 Error checking daily limit:", limitError);
      throw new Error("Failed to check daily application limit");
    }

    console.log("🎯 Can apply:", canApply);

    if (!canApply) {
      console.log("🚨 Daily limit reached, getting remaining count...");
      const { data: remaining } = await supabase.rpc(
        "get_remaining_daily_applications",
        {
          user_uuid: userId,
        }
      );
      console.log("🎯 Remaining applications:", remaining);
      throw new Error(
        `Daily application limit reached. You have ${remaining} applications remaining today.`
      );
    }

    // Check if user has already applied to this opportunity
    console.log("🎯 Checking if user already applied to this opportunity...");
    const { data: existingApplication, error: checkError } = await supabase
      .from("applications")
      .select("id")
      .eq("user_id", userId)
      .eq("opportunity_id", opportunityId)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 is "not found" which is expected for new applications
      console.error("🚨 Error checking existing application:", checkError);
      throw new Error("Failed to check existing application");
    }

    if (existingApplication) {
      console.log("🚨 User already applied to this opportunity");
      throw new Error("You have already applied for this opportunity");
    }

    // Get user's full profile data to include in application
    console.log("🎯 Fetching user profile data...");
    const { data: userProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("🚨 Error fetching user profile:", profileError);
      throw new Error("Failed to fetch user profile for application");
    }

    console.log("🎯 User profile fetched successfully");

    // Create the application with profile data
    console.log("🎯 Creating application in database...");
    const { data, error } = await supabase
      .from("applications")
      .insert([
        {
          user_id: userId,
          opportunity_id: opportunityId,
          status: "pending",
          profile_data: userProfile, // Include full profile data
          applied_at: new Date().toISOString(),
          application_type: "swipe_apply",
        },
      ])
      .select();

    if (error) {
      console.error("🚨 Error creating application:", error);
      throw error;
    }

    console.log("✅ Application submitted with profile data for R/HOOD Studio");
    return data[0];
  },

  // Get daily application statistics for a user
  async getDailyApplicationStats(userId) {
    const { data: count, error: countError } = await supabase.rpc(
      "get_daily_application_count",
      {
        user_uuid: userId,
      }
    );

    const { data: remaining, error: remainingError } = await supabase.rpc(
      "get_remaining_daily_applications",
      {
        user_uuid: userId,
      }
    );

    if (countError || remainingError) {
      console.error("Error getting daily stats:", countError || remainingError);
      // Return default values if there's an error
      return {
        dailyCount: 0,
        remaining: APPLICATION_LIMITS.DAILY_LIMIT,
        canApply: true,
      };
    }

    return {
      dailyCount: count || 0,
      remaining: remaining || 0,
      canApply: (count || 0) < 5,
    };
  },

  // User Daily Application Functions
  async getUserDailyApplicationStats(userId) {
    try {
      // Try the combined function first
      const { data, error } = await supabase.rpc(
        "get_user_daily_application_stats",
        {
          user_uuid: userId,
        }
      );
      if (error) throw error;
      return data[0]; // Return the first (and only) result
    } catch (error) {
      // Fallback to individual functions if the combined function doesn't exist
      console.log("⚠️ Combined function not found, using individual functions");

      const [countResult, remainingResult] = await Promise.all([
        supabase.rpc("get_daily_application_count", { user_uuid: userId }),
        supabase.rpc("get_remaining_daily_applications", { user_uuid: userId }),
      ]);

      if (countResult.error) throw countResult.error;
      if (remainingResult.error) throw remainingResult.error;

      const dailyCount = countResult.data || 0;
      const remaining = remainingResult.data || 0;

      return {
        daily_count: dailyCount,
        remaining_applications: remaining,
        can_apply: dailyCount < APPLICATION_LIMITS.DAILY_LIMIT,
      };
    }
  },

  async resetDailyApplications(userId) {
    // Delete all applications made by the user today
    const { error } = await supabase
      .from("applications")
      .delete()
      .eq("user_id", userId)
      .gte("created_at", new Date().toISOString().split("T")[0]); // Today's date

    if (error) throw error;
    return { success: true };
  },

  // Opportunity Functions
  async getOpportunityApplicationCounts() {
    const { data, error } = await supabase.rpc(
      "get_opportunity_application_counts"
    );
    if (error) throw error;
    return data;
  },

  // Notifications Functions
  async getNotifications(userId) {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async createNotification(notification) {
    const { data, error } = await supabase
      .from("notifications")
      .insert([notification])
      .select();

    if (error) throw error;
    return data[0];
  },

  // Communities Functions
  async getCommunities() {
    const { data, error } = await supabase
      .from("communities")
      .select("*")
      .order("member_count", { ascending: false });

    if (error) throw error;
    return data;
  },

  async joinCommunity(communityId, userId) {
    const { data, error } = await supabase
      .from("community_members")
      .insert([
        {
          community_id: communityId,
          user_id: userId,
          joined_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;
    return data[0];
  },

  async getCommunityData(communityId) {
    try {
      const { data, error } = await supabase
        .from("communities")
        .select("*")
        .eq("id", communityId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching community data:", error);
      return null;
    }
  },

  async getCommunityMemberCount(communityId) {
    try {
      const { count, error } = await supabase
        .from("community_members")
        .select("*", { count: "exact", head: true })
        .eq("community_id", communityId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error("Error fetching community member count:", error);
      return 0;
    }
  },

  async isUserCommunityMember(communityId, userId) {
    try {
      const { data, error } = await supabase
        .from("community_members")
        .select("id")
        .eq("community_id", communityId)
        .eq("user_id", userId)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return !!data;
    } catch (error) {
      console.error("Error checking community membership:", error);
      return false;
    }
  },

  async getLatestGroupMessage(communityId) {
    try {
      const { data, error } = await supabase
        .from("community_posts")
        .select(
          `
          *,
          author:user_profiles!community_posts_author_id_fkey(
            id,
            dj_name,
            full_name,
            username
          )
        `
        )
        .eq("community_id", communityId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      return data?.[0] || null;
    } catch (error) {
      console.error("Error fetching latest group message:", error);
      return null;
    }
  },

  async getUnreadGroupMessageCount(communityId, userId) {
    try {
      // For now, return 0 since we don't have a community_views table
      // In a real implementation, you would track when users last viewed each community
      // and count messages posted after that timestamp
      return 0;
    } catch (error) {
      console.error("Error fetching unread group message count:", error);
      return 0;
    }
  },

  // Gigs Functions
  async getUserGigs(userId) {
    const { data, error } = await supabase
      .from("gigs")
      .select("*")
      .eq("dj_id", userId)
      .order("event_date", { ascending: false });

    if (error) throw error;
    return data;
  },

  async createGig(gig) {
    const { data, error } = await supabase
      .from("gigs")
      .insert([gig])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateGig(gigId, updates) {
    const { data, error } = await supabase
      .from("gigs")
      .update(updates)
      .eq("id", gigId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Achievements Functions
  async getAchievements() {
    const { data, error } = await supabase
      .from("achievements")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) throw error;
    return data;
  },

  async getUserAchievements(userId) {
    const { data, error } = await supabase
      .from("user_achievements")
      .select(
        "id, achievement_id, earned, earned_at, achievements(id, name, description, icon, category)"
      )
      .eq("user_id", userId)
      .eq("earned", true);

    if (error) throw error;
    return data;
  },

  async checkAndAwardAchievements(userId) {
    // Call the database function to check and award achievements
    const { data, error } = await supabase.rpc("check_and_award_achievements", {
      p_user_id: userId,
    });

    if (error) throw error;
    return data;
  },

  // Connections Functions
  async getUserConnections(userId, status = null) {
    try {
      // First try the RPC function
      const { data, error } = await supabase.rpc("get_user_connections", {
        user_uuid: userId,
      });

      if (error) {
        console.warn(
          "RPC get_user_connections failed, trying direct query:",
          error
        );

        // Fallback to direct query with proper field mapping
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("connections")
          .select(
            `
            *,
            user_1:user_profiles!connections_user_id_1_fkey(id, dj_name, full_name, profile_image_url),
            user_2:user_profiles!connections_user_id_2_fkey(id, dj_name, full_name, profile_image_url)
          `
          )
          .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
          .order("created_at", { ascending: false });

        if (fallbackError) {
          console.warn("Direct query also failed:", fallbackError);
          // If both fail, return empty array
          return [];
        }

        // Transform fallback data to match RPC function format
        const transformedData = fallbackData.map((conn) => {
          const isUser1 = conn.user_id_1 === userId;
          const connectedUser = isUser1 ? conn.user_2 : conn.user_1;

          return {
            connected_user_id: connectedUser?.id,
            connected_user_name:
              connectedUser?.dj_name ||
              connectedUser?.full_name ||
              "Unknown User",
            connected_user_image: connectedUser?.profile_image_url,
            connection_status: conn.status,
            initiated_by: conn.initiated_by,
            created_at: conn.created_at,
            accepted_at: conn.accepted_at,
          };
        });

        return transformedData;
      }

      // Filter by status if provided
      if (status) {
        return data.filter((conn) => conn.connection_status === status);
      }

      return data;
    } catch (error) {
      console.error("Error fetching user connections:", error);
      return [];
    }
  },

  async createConnection(targetUserId) {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("User not authenticated");

      // Try the RPC function first
      const { data, error } = await supabase.rpc("create_connection_request", {
        target_user_id: targetUserId,
        requester_user_id: user.id,
      });

      if (error) {
        console.warn(
          "RPC create_connection_request failed, using direct insert:",
          error
        );

        // Fallback to direct insert
        const user_id_1 = user.id < targetUserId ? user.id : targetUserId;
        const user_id_2 = user.id < targetUserId ? targetUserId : user.id;

        const { data: insertData, error: insertError } = await supabase
          .from("connections")
          .insert({
            user_id_1,
            user_id_2,
            status: "pending",
            initiated_by: user.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;

        console.log(
          "📞 Connection request created via direct insert:",
          insertData
        );
        return { id: insertData.id, status: "pending" };
      }

      console.log("📞 Connection request created:", data);
      return { id: data, status: "pending" };
    } catch (error) {
      console.error("Error creating connection:", error);
      throw error;
    }
  },

  async acceptConnection(connectionId) {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("User not authenticated");

      const { data, error } = await supabase.rpc("accept_connection_request", {
        connection_id: connectionId,
        accepter_user_id: user.id,
      });

      if (error) throw error;

      console.log("✅ Connection accepted:", data);
      return data;
    } catch (error) {
      console.error("Error accepting connection:", error);
      throw error;
    }
  },

  async getConnectionStatus(userId1, userId2) {
    try {
      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .or(
          `and(user_id_1.eq.${userId1},user_id_2.eq.${userId2}),and(user_id_1.eq.${userId2},user_id_2.eq.${userId1})`
        )
        .single();

      if (error && error.code !== "PGRST116") throw error;

      return data || null;
    } catch (error) {
      console.error("Error getting connection status:", error);
      return null;
    }
  },

  // Notification Functions
  async getUnreadNotificationCount(userId) {
    try {
      const { data, error } = await supabase.rpc(
        "get_unread_notification_count",
        {
          user_uuid: userId,
        }
      );

      if (error) {
        console.warn(
          "RPC get_unread_notification_count failed, using direct query:",
          error
        );
        const { count, error: countError } = await supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", userId)
          .eq("is_read", false);

        if (countError) throw countError;
        return count || 0;
      }

      return data || 0;
    } catch (error) {
      console.error("Error getting unread notification count:", error);
      return 0;
    }
  },

  async getUnreadMessageCount(userId) {
    try {
      const { data, error } = await supabase.rpc("get_unread_message_count", {
        user_uuid: userId,
      });

      if (error) {
        console.warn(
          "RPC get_unread_message_count failed, using direct query:",
          error
        );
        const { count, error: countError } = await supabase
          .from("messages")
          .select("*", { count: "exact", head: true })
          .eq("receiver_id", userId)
          .eq("is_read", false);

        if (countError) throw countError;
        return count || 0;
      }

      return data || 0;
    } catch (error) {
      console.error("Error getting unread message count:", error);
      return 0;
    }
  },

  async markNotificationAsRead(notificationId) {
    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .select();

    if (error) throw error;
    return data[0];
  },

  async getMessages(threadId) {
    try {
      // Validate threadId format
      if (!threadId || typeof threadId !== "string") {
        console.error("Invalid threadId:", threadId);
        return [];
      }

      // Check for NaN in threadId
      if (threadId.includes("NaN")) {
        console.error("ThreadId contains NaN:", threadId);
        return [];
      }

      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          *,
          sender:user_profiles!messages_sender_id_fkey(
            id,
            dj_name,
            full_name,
            profile_image_url
          )
        `
        )
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching messages:", error);
      return [];
    }
  },

  async getGroupMessages(communityId) {
    try {
      if (!communityId) {
        console.error("Invalid communityId:", communityId);
        return [];
      }

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
        .eq("community_id", communityId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error("Error fetching group messages:", error);
      return [];
    }
  },

  async findOrCreateIndividualMessageThread(user1Id, user2Id) {
    try {
      // Ensure consistent ordering of user IDs
      const [id1, id2] = [user1Id, user2Id].sort();

      // Try to find an existing thread
      const { data: existingThread, error: findError } = await supabase
        .from("message_threads")
        .select("id")
        .eq("type", "individual")
        .eq("user_id_1", id1)
        .eq("user_id_2", id2)
        .single();

      if (existingThread) {
        return existingThread.id;
      }

      // PGRST116 means no rows found, which is expected if no thread exists
      if (findError && findError.code !== "PGRST116") {
        console.warn(
          "Error finding existing message thread, attempting to create:",
          findError
        );
      }

      // If no thread found, create a new one
      const { data: newThread, error: createError } = await supabase
        .from("message_threads")
        .insert({
          type: "individual",
          user_id_1: id1,
          user_id_2: id2,
        })
        .select("id")
        .single();

      if (createError) {
        // Handle potential race condition: another client might have created it simultaneously
        if (createError.code === "23505") {
          // Unique violation
          console.warn(
            "Race condition: Message thread already created, fetching existing one."
          );
          const { data: reFetchedThread, error: reFetchError } = await supabase
            .from("message_threads")
            .select("id")
            .eq("type", "individual")
            .eq("user_id_1", id1)
            .eq("user_id_2", id2)
            .single();
          if (reFetchError) throw reFetchError;
          return reFetchedThread.id;
        }
        throw createError;
      }

      return newThread.id;
    } catch (error) {
      console.error(
        "Error finding or creating individual message thread:",
        error
      );
      throw error; // Re-throw to be handled by calling function
    }
  },
};

export { supabase };
