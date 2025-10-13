import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";

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
        throw new Error("Apple Sign-In is not available on this device");
      }

      console.log("🍎 Starting native Apple Sign-In with signInWithIdToken...");

      // 1) Raw nonce as 32 random bytes → hex string (Expo-safe)
      async function makeRawNonce(len = 32) {
        const bytes = await Crypto.getRandomBytesAsync(len);
        return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
          ""
        );
      }

      // 2) SHA256 → base64url (what Apple puts in the ID token's nonce claim)
      async function sha256Base64url(input) {
        const base64 = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          input,
          { encoding: Crypto.CryptoEncoding.BASE64 }
        );
        return base64
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/g, "");
      }

      const rawNonce = await makeRawNonce(32);
      const hashedNonceB64Url = await sha256Base64url(rawNonce);

      console.log("🔐 Generated raw nonce:", rawNonce);
      console.log("🔐 Generated raw nonce length:", rawNonce.length);
      console.log("🔐 Generated hashed nonce (base64url):", hashedNonceB64Url);
      console.log("🔐 Generated hashed nonce length:", hashedNonceB64Url.length);

      // 3) Pass **hashed** nonce to Apple
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonceB64Url, // Pass HASHED nonce to Apple
      });

      if (!credential.identityToken) {
        throw new Error("No identity token received from Apple");
      }

      console.log("✅ Apple credential received:", {
        user: credential.user,
        email: credential.email,
        fullName: credential.fullName,
      });

      // Debug: Decode the identity token to check the nonce claim
      try {
        const b64urlDecode = (s) => {
          s = s.replace(/-/g, "+").replace(/_/g, "/");
          const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
          return atob(s + "=".repeat(pad));
        };
        const [, payload] = credential.identityToken.split(".");
        const claims = JSON.parse(b64urlDecode(payload));
        console.log("🔍 JWT Claims:", {
          iss: claims.iss,
          aud: claims.aud,
          nonce: claims.nonce || "no nonce",
          email: claims.email,
        });

        // Sanity check: claims.nonce should === hashedNonceB64Url
        const nonceMatch = claims.nonce === hashedNonceB64Url;

        // Quick sanity check - all these must match for Supabase to accept the token
        const audMatch = claims.aud === "com.rhoodapp.mobile";
        const issMatch = claims.iss === "https://appleid.apple.com";

                 console.log("🔍 Apple ID Token Sanity Checks:");
                 console.log("  📱 Bundle ID (aud):", {
                   expected: "com.rhoodapp.mobile",
                   received: claims.aud,
                   match: audMatch,
                 });
                 console.log("  🍎 Apple Issuer (iss):", {
                   expected: "https://appleid.apple.com",
                   received: claims.iss,
                   match: issMatch,
                 });
                 console.log("  🔐 Nonce claim:", {
                   expected: hashedNonceB64Url,
                   received: claims.nonce,
                   match: nonceMatch,
                 });
                 console.log("🔍 Detailed Nonce Analysis:");
                 console.log("  Raw nonce sent to Supabase:", rawNonce);
                 console.log("  Hashed nonce sent to Apple:", hashedNonceB64Url);
                 console.log("  Nonce claim from Apple:", claims.nonce);
                 console.log("  Nonce lengths - Raw:", rawNonce.length, "Hashed:", hashedNonceB64Url.length, "Apple:", claims.nonce?.length);

        const allChecksPass = audMatch && issMatch && nonceMatch;
        console.log("✅ All sanity checks passed:", allChecksPass);

        if (!allChecksPass) {
          console.error("❌ Apple ID Token validation failed!");
          if (!audMatch) {
            console.error(
              "  ❌ Bundle ID mismatch - check Apple Developer Console"
            );
            console.error(
              "  ❌ Ensure 'com.rhoodapp.mobile' has Sign in with Apple enabled"
            );
          }
          if (!issMatch) {
            console.error("  ❌ Invalid Apple issuer - token may be corrupted");
          }
          if (!nonceMatch) {
            console.error(
              "  ❌ Nonce mismatch - Supabase will reject this token"
            );
          }
        }
      } catch (debugError) {
        console.log(
          "⚠️ Could not decode JWT for debugging:",
          debugError.message
        );
      }

      // 4) Pass the **RAW** nonce to Supabase
      console.log("🔐 Sending to Supabase with raw nonce:", {
        rawNonce: rawNonce,
        rawNonceType: typeof rawNonce,
        rawNonceLength: rawNonce.length,
        tokenLength: credential.identityToken.length,
      });
      
      console.log("🔍 Final nonce values before Supabase call:");
      console.log("  Raw nonce (to Supabase):", rawNonce);
      console.log("  Raw nonce type:", typeof rawNonce);
      console.log("  Raw nonce length:", rawNonce.length);

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
        nonce: rawNonce, // Pass RAW nonce to Supabase
      });

      if (error) {
        console.error("❌ Supabase Apple auth error:", error);
        throw error;
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
      redirectTo: "exp+rhoodapp://expo-development-client/reset-password",
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
        "id, dj_name, full_name, first_name, last_name, email, bio, location, genres, image_url, phone, show_email, show_phone, primary_mix_id, credits, created_at, updated_at"
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
        "id, dj_name, full_name, first_name, last_name, email, bio, location, genres, image_url, phone, show_email, show_phone, primary_mix_id, created_at, updated_at"
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

  async getUserWithPrimaryMix(userId) {
    const { data, error } = await supabase
      .from("user_profiles")
      .select(
        "id, dj_name, full_name, first_name, last_name, email, bio, location, genres, image_url, phone, show_email, show_phone, primary_mix_id, credits, created_at, updated_at, primary_mix:primary_mix_id(id, title, audio_url, duration, genre, created_at)"
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
    // First check if user can apply (hasn't exceeded daily limit)
    const { data: canApply, error: limitError } = await supabase.rpc(
      "check_daily_application_limit",
      {
        user_uuid: userId,
      }
    );

    if (limitError) {
      console.error("Error checking daily limit:", limitError);
      throw new Error("Failed to check daily application limit");
    }

    if (!canApply) {
      const { data: remaining } = await supabase.rpc(
        "get_remaining_daily_applications",
        {
          user_uuid: userId,
        }
      );
      throw new Error(
        `Daily application limit reached. You have ${remaining} applications remaining today.`
      );
    }

    // Check if user has already applied to this opportunity
    const { data: existingApplication, error: checkError } = await supabase
      .from("applications")
      .select("id")
      .eq("user_id", userId)
      .eq("opportunity_id", opportunityId)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 is "not found" which is expected for new applications
      console.error("Error checking existing application:", checkError);
      throw new Error("Failed to check existing application");
    }

    if (existingApplication) {
      throw new Error("You have already applied for this opportunity");
    }

    // Get user's full profile data to include in application
    const { data: userProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      throw new Error("Failed to fetch user profile for application");
    }

    // Create the application with profile data
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
      console.error("Error creating application:", error);
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
        remaining: 5,
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
        can_apply: dailyCount < 5,
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
        "id, achievement_id, earned, earned_at, achievements(id, title, description, icon, category)"
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
  async getUserConnections(userId, status = "accepted") {
    const { data, error } = await supabase.rpc("get_user_connections", {
      p_user_id: userId,
      p_status: status,
    });

    if (error) throw error;
    return data;
  },

  async createConnection(userId1, userId2) {
    const { data, error } = await supabase
      .from("connections")
      .insert([
        {
          user1_id: userId1,
          user2_id: userId2,
          status: "pending",
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async acceptConnection(connectionId) {
    const { data, error } = await supabase
      .from("connections")
      .update({ status: "accepted" })
      .eq("id", connectionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteConnection(connectionId) {
    const { error } = await supabase
      .from("connections")
      .delete()
      .eq("id", connectionId);

    if (error) throw error;
    return { success: true };
  },

  // Messages Functions
  async getMessageThreads(userId) {
    const { data, error } = await supabase.rpc("get_user_message_threads", {
      p_user_id: userId,
    });

    if (error) throw error;
    return data;
  },

  async getMessages(threadId) {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data;
  },

  async sendMessage(threadId, senderId, content) {
    const { data, error } = await supabase
      .from("messages")
      .insert([
        {
          thread_id: threadId,
          sender_id: senderId,
          content: content,
          created_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;
    return data[0];
  },

  async createMessageThread(user1Id, user2Id) {
    const { data, error } = await supabase
      .from("message_threads")
      .insert([
        {
          user1_id: user1Id,
          user2_id: user2Id,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Mixes Functions
  async getUserMixes(userId) {
    const { data, error } = await supabase
      .from("mixes")
      .select("*")
      .eq("dj_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },

  async createMix(mix) {
    const { data, error } = await supabase.from("mixes").insert([mix]).select();

    if (error) throw error;
    return data[0];
  },

  async updateMix(mixId, updates) {
    const { data, error } = await supabase
      .from("mixes")
      .update(updates)
      .eq("id", mixId)
      .select();

    if (error) throw error;
    return data[0];
  },

  async deleteMix(mixId) {
    const { error } = await supabase.from("mixes").delete().eq("id", mixId);

    if (error) throw error;
    return { success: true };
  },

  // Discovery Functions
  async getDiscoverableUsers(userId, limit = 20) {
    const { data, error } = await supabase.rpc("get_discoverable_users", {
      p_user_id: userId,
      p_limit: limit,
    });

    if (error) throw error;
    return data;
  },

  // Credits Functions
  async getUserCredits(userId) {
    const { data, error } = await supabase.rpc("get_user_credits", {
      user_uuid: userId,
    });

    if (error) throw error;
    return data || 0;
  },

  async awardGigCredits(gigId) {
    const { data, error } = await supabase.rpc("award_gig_credits", {
      gig_id: gigId,
    });

    if (error) throw error;
    return data;
  },

  async awardAchievementCredits(userId, achievementId) {
    const { data, error } = await supabase.rpc("award_achievement_credits", {
      user_id: userId,
      achievement_id: achievementId,
    });

    if (error) throw error;
    return data;
  },

  // Updated gig completion function to award credits
  async completeGig(gigId) {
    const { data, error } = await supabase
      .from("gigs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", gigId)
      .select();

    if (error) throw error;

    // Award credits for gig completion
    try {
      await this.awardGigCredits(gigId);
      console.log("✅ Credits awarded for gig completion");
    } catch (creditsError) {
      console.error("⚠️ Error awarding gig credits:", creditsError);
      // Don't fail the gig completion if credits fail
    }

    return data[0];
  },

  // Updated achievement unlock function to award credits
  async unlockAchievement(userId, achievementId) {
    const { data, error } = await supabase
      .from("user_achievements")
      .insert([
        {
          user_id: userId,
          achievement_id: achievementId,
          earned: true,
          earned_at: new Date().toISOString(),
        },
      ])
      .select();

    if (error) throw error;

    // Award credits for achievement unlock
    try {
      await this.awardAchievementCredits(userId, achievementId);
      console.log("✅ Credits awarded for achievement unlock");
    } catch (creditsError) {
      console.error("⚠️ Error awarding achievement credits:", creditsError);
      // Don't fail the achievement unlock if credits fail
    }

    return data[0];
  },
};

export { supabase };
