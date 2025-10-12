import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";

// Supabase project configuration
const supabaseUrl = "https://jsmcduecuxtaqizhmiqo.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzbWNkdWVjdXh0YXFpemhtaXFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDUwNDIsImV4cCI6MjA3MjkyMTA0Mn0.CxQDVhiWf8qFf0SB0evnqniyMYUttpwF3ThlpB8dfso";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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
  async signUp(email, password, userData) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userData,
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
  async signInWithGoogle() {
    try {
      console.log("🔐 Starting Google Sign-In...");

      // Create a redirect URL for the OAuth flow
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: "rhoodapp",
        path: "auth/callback",
      });

      console.log("🔗 Redirect URL:", redirectUrl);

      // In development (Expo Go), we need to use the localhost URL
      const isDevelopment = __DEV__ || redirectUrl.includes("localhost");
      if (isDevelopment) {
        console.log("⚠️ Development mode detected - using localhost redirect");
      }

      // Create the OAuth URL
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error("❌ Supabase OAuth error:", error);
        throw new Error(`Supabase OAuth error: ${error.message}`);
      }

      console.log("✅ OAuth URL created");

      // Open the OAuth URL in the browser
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      console.log("🌐 Browser result type:", result.type);

      if (result.type === "success") {
        console.log("✅ OAuth flow successful");

        // Extract tokens from URL
        const url = new URL(result.url);
        let accessToken = url.searchParams.get("access_token");
        let refreshToken = url.searchParams.get("refresh_token");

        // If not in query params, check hash fragment
        if (!accessToken && url.hash) {
          const hashParams = new URLSearchParams(url.hash.substring(1));
          accessToken = hashParams.get("access_token");
          refreshToken = hashParams.get("refresh_token");
        }

        if (accessToken) {
          // Set the session with the tokens
          const { data: sessionData, error: sessionError } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (sessionError) {
            console.error("❌ Session error:", sessionError);
            throw new Error(`Session error: ${sessionError.message}`);
          }

          console.log("✅ Session created for:", sessionData.user?.email);
          return sessionData;
        } else {
          throw new Error("No access token received");
        }
      } else if (result.type === "cancel") {
        throw new Error("Sign-in was cancelled");
      } else {
        throw new Error(`OAuth flow failed`);
      }
    } catch (error) {
      console.error("❌ Google Sign-In error:", error);
      throw error;
    }
  },

  // Sign in with Apple (Auto-detect native vs web)
  async signInWithApple() {
    // Try native first, fallback to web if not available
    try {
      console.log("🍎 Attempting native Apple Sign-In...");
      return await this.signInWithAppleNative();
    } catch (error) {
      console.log("🔄 Native Apple Sign-In failed:", error.message);
      console.log("🔄 Trying web fallback...");

      // If it's a redirect/URL scheme error, provide a more helpful message
      if (
        error.message.includes("localhost") ||
        error.message.includes("redirect")
      ) {
        console.log(
          "⚠️ Redirect URL issue detected - this might be a TestFlight/configuration issue"
        );
      }

      try {
        return await this.signInWithAppleWeb();
      } catch (webError) {
        console.error("❌ Both native and web Apple Sign-In failed");
        console.error("Native error:", error.message);
        console.error("Web error:", webError.message);

        // Provide a more helpful error message
        if (
          webError.message.includes("localhost") ||
          webError.message.includes("redirect")
        ) {
          throw new Error(
            "Apple Sign-In configuration issue. Please try again or use email sign-in."
          );
        }

        throw webError;
      }
    }
  },

  // Sign in with Apple (Native implementation)
  async signInWithAppleNative() {
    try {
      // Check if Apple Sign-In is available
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        throw new Error("Apple Sign-In is not available on this device");
      }

      console.log("🍎 Starting native Apple Sign-In...");

      // 1) Create nonce for security
      const raw = await Crypto.getRandomBytesAsync(16);
      const nonce = Buffer.from(raw).toString("base64");

      console.log("🔐 Generated nonce:", nonce);

      // 2) Request Apple ID token
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        state: nonce, // CSRF protection
      });

      console.log("✅ Apple credential received:", !!credential.identityToken);

      if (!credential.identityToken) {
        throw new Error("No identity token received from Apple");
      }

      // 3) Exchange with Supabase using native OpenID Connect
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
        nonce: nonce, // Must match what we sent to Apple
      });

      if (error) {
        console.error("❌ Supabase Apple auth error:", error);
        throw error;
      }

      console.log("✅ Native Apple Sign-In successful:", data.user?.email);
      return data;
    } catch (error) {
      console.error("❌ Native Apple Sign-In error:", error);
      throw error;
    }
  },

  // Sign in with Apple (Web fallback for Expo Go)
  async signInWithAppleWeb() {
    try {
      // Create a redirect URL for the OAuth flow
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: "rhoodapp",
        path: "auth/callback",
      });

      console.log("🔗 Using redirect URL:", redirectUrl);

      // Create the OAuth URL
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) throw error;

      console.log("🍎 Opening Apple OAuth URL in browser...");

      // Open the OAuth URL in the browser
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl,
        {
          showInRecents: false,
          // Don't use ephemeral session - allows session persistence for 2FA
          preferEphemeralSession: false,
        }
      );

      console.log("🔍 OAuth result:", result.type);

      if (result.type === "success") {
        console.log("✅ OAuth success, processing result...");
        console.log("🔗 Callback URL:", result.url);

        // Extract tokens and errors from URL (they can be in query params or hash fragment)
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
          throw new Error(`Apple Sign-In failed: ${decodedError}`);
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

          console.log("✅ Apple Sign-In successful:", sessionData.user?.email);

          // Check if user profile exists
          try {
            const { data: existingProfile, error: profileFetchError } =
              await supabase
                .from("user_profiles")
                .select("*")
                .eq("id", sessionData.user.id)
                .single();

            if (profileFetchError && profileFetchError.code !== "PGRST116") {
              // PGRST116 = no rows returned, which is expected for new users
              console.error("❌ Error fetching profile:", profileFetchError);
            }

            if (!existingProfile) {
              console.log("📝 No existing profile found");
              console.log(
                "🔍 Checking if this is a returning user by email..."
              );

              // Check if there's an existing profile with this email (from previous sign-in method)
              const { data: emailProfile } = await supabase
                .from("user_profiles")
                .select("*")
                .eq("email", sessionData.user.email)
                .single();

              if (emailProfile) {
                console.log(
                  "✅ Found existing profile with same email - returning user!"
                );
                console.log("🔗 Linking Apple account to existing profile...");

                // Update the existing profile with the new user ID
                const { error: updateError } = await supabase
                  .from("user_profiles")
                  .update({
                    id: sessionData.user.id,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("email", sessionData.user.email);

                if (updateError) {
                  console.error("❌ Error linking accounts:", updateError);
                } else {
                  console.log("✅ Accounts linked successfully");
                  // Wait for database commit
                  await new Promise((resolve) => setTimeout(resolve, 300));
                }
              } else {
                console.log(
                  "🆕 New user - creating profile from Apple data..."
                );

                // Create basic profile from Apple user data
                const { data: newProfile, error: profileError } = await supabase
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
                      profile_image_url: null, // Apple doesn't provide avatar
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    },
                  ])
                  .select()
                  .single();

                if (profileError) {
                  console.error("❌ Error creating profile:", profileError);
                  // Don't throw - let user complete onboarding manually
                } else {
                  console.log("✅ User profile created successfully");
                  // Wait for database commit
                  await new Promise((resolve) => setTimeout(resolve, 300));
                }
              }
            } else {
              console.log("✅ Existing user profile found - returning user!");
            }
          } catch (profileError) {
            console.warn("⚠️ Profile check/creation error:", profileError);
            // Don't throw - profile creation is not critical for sign-in
          }

          // Final verification: Ensure profile exists before returning
          console.log("🔍 Final verification: Checking profile exists...");
          try {
            const { data: finalCheck } = await supabase
              .from("user_profiles")
              .select("id, dj_name, email")
              .eq("id", sessionData.user.id)
              .single();

            if (finalCheck) {
              console.log(
                "✅ Profile verified in database:",
                finalCheck.dj_name
              );
            } else {
              console.warn(
                "⚠️ Profile not found in final check - user may see onboarding"
              );
            }
          } catch (verifyError) {
            console.warn(
              "⚠️ Profile verification failed:",
              verifyError.message
            );
          }

          return sessionData;
        } else {
          console.error("❌ No access token found in callback URL");
          throw new Error("No access token received from OAuth provider");
        }
      } else if (result.type === "cancel") {
        console.log("❌ User cancelled OAuth flow");
        throw new Error("Sign-in was cancelled");
      } else {
        console.log("❌ Unexpected OAuth result type:", result.type);
        throw new Error(`OAuth flow failed with type: ${result.type}`);
      }
    } catch (error) {
      console.error("❌ Apple OAuth error:", error);
      throw error;
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
        `
        *,
        primary_mix:mixes!primary_mix_id (
          id,
          title,
          description,
          genre,
          duration,
          file_url,
          artwork_url,
          play_count,
          likes_count,
          created_at
        )
      `
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
        `
        *,
        primary_mix:mixes!primary_mix_id (
          id,
          title,
          description,
          genre,
          duration,
          file_url,
          artwork_url,
          play_count,
          likes_count,
          created_at
        )
      `
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
      throw new Error("Failed to check application limit");
    }

    if (!canApply) {
      // Get remaining applications count for error message
      const { data: remaining, error: remainingError } = await supabase.rpc(
        "get_remaining_daily_applications",
        {
          user_uuid: userId,
        }
      );

      const remainingCount = remainingError ? 0 : remaining;
      throw new Error(
        `Daily application limit reached. You have used all 5 applications for today. ${remainingCount} applications remaining.`
      );
    }

    // Check if user has already applied to this opportunity
    const { data: existingApplication } = await supabase
      .from("applications")
      .select("id")
      .eq("opportunity_id", opportunityId)
      .eq("user_id", userId)
      .single();

    if (existingApplication) {
      throw new Error("You have already applied to this opportunity");
    }

    // Get user profile data to send with application
    const { data: userProfile, error: profileError } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Error fetching user profile:", profileError);
      // Still submit application even if profile fetch fails
    }

    // Submit the application with user profile data
    const applicationData = {
          opportunity_id: opportunityId,
          user_id: userId,
          status: "pending",
      // Include user profile data for R/HOOD Studio dashboard
      profile_data: userProfile
        ? {
            dj_name: userProfile.dj_name,
            first_name: userProfile.first_name,
            last_name: userProfile.last_name,
            city: userProfile.city,
            genres: userProfile.genres,
            bio: userProfile.bio,
            instagram: userProfile.instagram,
            soundcloud: userProfile.soundcloud,
            profile_image_url: userProfile.profile_image_url,
            gigs_completed: userProfile.gigs_completed,
            is_verified: userProfile.is_verified,
            created_at: userProfile.created_at,
          }
        : null,
      // Application metadata
      applied_at: new Date().toISOString(),
      application_type: "swipe_apply", // Indicates this was a direct swipe application
    };

    const { data, error } = await supabase
      .from("applications")
      .insert([applicationData])
      .select();

    if (error) throw error;

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
      return { dailyCount: 0, remaining: 5, canApply: true };
    }

    return {
      dailyCount: count || 0,
      remaining: remaining || 0,
      canApply: (count || 0) < 5,
    };
  },

  // User Daily Application Functions
  async getUserDailyApplicationStats(userId) {
    const { data, error } = await supabase.rpc('get_user_daily_application_stats', {
      user_uuid: userId
    });
    if (error) throw error;
    return data[0]; // Return the first (and only) result
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
        `
        *,
        achievement:achievements(*)
      `
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
          user_id_1: userId1,
          user_id_2: userId2,
          initiated_by: userId1,
          status: "pending",
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
  },

  async getUserConnections(userId, status = "accepted") {
    // Query connections where the user is either user_id_1 or user_id_2
    const { data: connections, error } = await supabase
      .from("connections")
      .select(
        `
        id,
        user_id_1,
        user_id_2,
        status,
        initiated_by,
        created_at,
        accepted_at
      `
      )
      .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
      .eq("status", status);

    if (error) throw error;

    if (!connections || connections.length === 0) {
      return [];
    }

    // Get the connected user IDs
    const connectedUserIds = connections.map((conn) =>
      conn.user_id_1 === userId ? conn.user_id_2 : conn.user_id_1
    );

    // Fetch the connected users' profiles
    const { data: users, error: usersError } = await supabase
      .from("user_profiles")
      .select(
        `
        id,
        dj_name,
        full_name,
        username,
        city,
        genres,
        profile_image_url,
        rating,
        gigs_completed,
        is_verified
      `
      )
      .in("id", connectedUserIds);

    if (usersError) throw usersError;

    // Transform the data to match expected format and deduplicate
    const connectionMap = new Map();
    
    connections.forEach((conn) => {
      const connectedUserId =
        conn.user_id_1 === userId ? conn.user_id_2 : conn.user_id_1;
      
      // Only add if we haven't seen this connection before
      if (!connectionMap.has(connectedUserId)) {
        const connectedUser = users?.find(
          (user) => user.id === connectedUserId
        );
        
        connectionMap.set(connectedUserId, {
          id: conn.id,
          connected_user_id: connectedUserId,
          connected_user_name:
            connectedUser?.dj_name ||
            connectedUser?.full_name ||
            "Unknown User",
          connected_user_username: connectedUser?.username,
          connected_user_city: connectedUser?.city,
          connected_user_genres: connectedUser?.genres || [],
          connected_user_image: connectedUser?.profile_image_url,
          connected_user_rating: connectedUser?.rating || 0,
          connected_user_gigs: connectedUser?.gigs_completed || 0,
          connected_user_verified: connectedUser?.is_verified || false,
          status: conn.status,
          created_at: conn.created_at,
          accepted_at: conn.accepted_at,
        });
      }
    });
    
    return Array.from(connectionMap.values());
  },
};
