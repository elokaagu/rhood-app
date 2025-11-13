import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { APPLICATION_LIMITS } from "./performanceConstants";

WebBrowser.maybeCompleteAuthSession();

const expoGlobal = typeof globalThis !== "undefined" ? globalThis.expo : undefined;
const isExpoGo =
  typeof expoGlobal !== "undefined" && expoGlobal?.Constants?.appOwnership === "expo";

const getRedirectUrl = () => {
  if (isExpoGo || (typeof __DEV__ !== "undefined" && __DEV__)) {
    return AuthSession.makeRedirectUri({
      scheme: "rhoodapp",
      path: "auth/callback",
    });
  }

  return AuthSession.makeRedirectUri({
    scheme: "rhoodapp",
    path: "auth/callback",
    useProxy: false,
  });
};

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
    flowType: "pkce",
  },
  global: {
    headers: {
      "x-client-info": "supabase-js-react-native",
    },
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
      const redirectUrl = getRedirectUrl();

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

        // Check for OAuth code first (code-based flow)
        const code = url.searchParams.get("code");

        if (code) {
          console.log("📝 Received OAuth code, exchanging for session...");
          // Exchange the code for a session
          const { data: sessionData, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error(
              "❌ Error exchanging code for session:",
              exchangeError
            );
            throw new Error(
              `Failed to complete sign-in: ${exchangeError.message}`
            );
          }

          if (sessionData?.session) {
            console.log("✅ Session established from OAuth code");
            return sessionData;
          }

          console.warn("⚠️ No session found after code exchange");
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

  // Sign in with Apple (native first, web OAuth fallback)
  async signInWithApple() {
    if (this._signingInWithApple) {
      console.log(
        "⚠️ Apple Sign-In already in progress, ignoring duplicate request"
      );
      return;
    }

    this._signingInWithApple = true;

    const runOAuthFallback = async () => {
      console.log("🍎 Falling back to Apple web OAuth flow…");

      const redirectUrl = getRedirectUrl();

      const { data: oauthData, error: oauthError } =
        await supabase.auth.signInWithOAuth({
          provider: "apple",
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true,
          },
        });

      if (oauthError) {
        console.error("❌ Apple OAuth init failed:", oauthError);
        throw oauthError;
      }

      const result = await WebBrowser.openAuthSessionAsync(
        oauthData.url,
        redirectUrl,
        {
          showInRecents: false,
          preferEphemeralSession: true,
        }
      );

      if (result.type !== "success") {
        throw new Error("Apple sign-in was cancelled or failed");
      }

      const url = new URL(result.url);
      const code = url.searchParams.get("code");

      try {
        const { data: sessionData, error: sessionFromUrlError } =
          await supabase.auth.getSessionFromUrl({
            url: result.url,
            storeSession: true,
          });

        if (sessionFromUrlError) {
          console.warn(
            "⚠️ Unable to hydrate Apple session via getSessionFromUrl:",
            sessionFromUrlError
          );
        } else if (sessionData?.session) {
          console.log("✅ Apple OAuth session restored from callback URL");
          return sessionData;
        }
      } catch (sessionFromUrlException) {
        console.warn(
          "⚠️ Exception while parsing Apple OAuth callback:",
          sessionFromUrlException
        );
      }

      if (code) {
        const { data: sessionData, error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error(
            "❌ Error exchanging Apple OAuth code for session:",
            exchangeError
          );
          throw new Error(
            `Failed to complete Apple sign-in: ${exchangeError.message}`
          );
        }

        if (sessionData?.session) {
          console.log("✅ Apple OAuth code exchange succeeded");
          return sessionData;
        }
      }

      let accessToken = url.searchParams.get("access_token");
      let refreshToken = url.searchParams.get("refresh_token");

      if (!accessToken && url.hash) {
        const hashParams = new URLSearchParams(url.hash.substring(1));
        accessToken = hashParams.get("access_token");
        refreshToken = hashParams.get("refresh_token");
      }

      if (accessToken) {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

        if (sessionError) {
          console.error("❌ Apple session error:", sessionError);
          throw sessionError;
        }

        console.log("✅ Apple OAuth tokens accepted");
        return sessionData;
      }

      throw new Error("No session information returned from Apple OAuth");
    };

    try {
      const nativeAvailable = await AppleAuthentication.isAvailableAsync();

      if (!nativeAvailable) {
        console.log(
          "⚠️ Native Apple Sign-In unavailable; attempting OAuth fallback"
        );
        return await runOAuthFallback();
      }

      console.log("🍎 Starting native Apple Sign-In flow…");

      const bytes = await Crypto.getRandomBytesAsync(32);
      const rawNonce = Array.from(bytes, (b) =>
        b.toString(16).padStart(2, "0")
      ).join("");

      const base64Hash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce,
        { encoding: Crypto.CryptoEncoding.BASE64 }
      );

      const hashedNonce = base64Hash
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        throw new Error("Apple sign-in did not return an identity token");
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (error) {
        console.error("❌ Native Apple Sign-In failed:", error);
        console.error("❌ Error details:", {
          message: error.message,
          status: error.status,
          code: error.code,
          fullError: error,
        });
        
        // Check if it's a provider configuration error
        if (
          error.message?.includes("Unsupported provider") ||
          error.message?.includes("missing OAuth secret") ||
          error.message?.includes("provider not enabled")
        ) {
          throw new Error(
            "Apple Sign In is not properly configured in Supabase. Please enable the Apple provider in your Supabase dashboard (no OAuth secrets needed for native sign-in)."
          );
        }
        
        // Check for bundle ID mismatch
        if (
          error.message?.includes("bundle") ||
          error.message?.includes("client_id") ||
          error.message?.includes("invalid_client") ||
          error.message?.includes("Client ID")
        ) {
          throw new Error(
            "Bundle ID not registered. Please add 'com.rhoodapp.mobile' to the Client IDs list in Supabase Apple provider configuration. If testing with Expo Go, also add 'host.exp.Exponent'."
          );
        }
        
        // Generic error with more details
        throw new Error(
          `Apple Sign In failed: ${error.message || "Unknown error"}. Please check your Supabase Apple provider configuration.`
        );
      }

      // Apple only provides the user's full name on the first sign-in
      // Save it to user metadata if available
      if (credential.fullName && data?.user) {
        try {
          const nameParts = [];
          if (credential.fullName.givenName)
            nameParts.push(credential.fullName.givenName);
          if (credential.fullName.middleName)
            nameParts.push(credential.fullName.middleName);
          if (credential.fullName.familyName)
            nameParts.push(credential.fullName.familyName);
          const fullName = nameParts.join(" ");

          if (fullName) {
            await supabase.auth.updateUser({
              data: {
                full_name: fullName,
                given_name: credential.fullName.givenName || null,
                family_name: credential.fullName.familyName || null,
              },
            });
            console.log("✅ Saved user's full name from Apple Sign In");
          }
        } catch (nameError) {
          console.warn("⚠️ Could not save user's full name:", nameError);
          // Don't fail the sign-in if name saving fails
        }
      }

      console.log("✅ Apple Sign-In successful via native flow");
      return data;
    } catch (error) {
      if (
        error?.code === "ERR_CANCELED" ||
        error?.code === "ERR_APPLE_SIGNIN_CANCELLED"
      ) {
        console.log("⚠️ Apple Sign-In cancelled by user");
        throw new Error("Apple sign-in was cancelled");
      }

      // Don't fall back to OAuth if we're in a native environment (TestFlight/production)
      // OAuth fallback requires secrets and should only be used in development/Expo Go
      if (!isExpoGo) {
        // In native builds, don't fall back to OAuth - just throw the error
        console.error("❌ Native Apple Sign-In failed in production build:", error);
        throw error;
      }

      console.warn(
        "⚠️ Native Apple Sign-In failed, attempting OAuth fallback (Expo Go only)...",
        error
      );

      try {
        return await runOAuthFallback();
      } catch (fallbackError) {
        console.error("❌ Apple Sign-In fallback failed:", fallbackError);
        throw fallbackError;
      }
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
        "id, dj_name, full_name, first_name, last_name, email, bio, status_message, location, city, genres, profile_image_url, phone, show_email, show_phone, primary_mix_id, credits, created_at, updated_at, username, is_verified, gigs_completed, instagram, soundcloud"
      )
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  },

  async getUserCredits(userId) {
    if (!userId) {
      console.warn("getUserCredits called without userId");
      return 0;
    }

    try {
      const { data, error } = await supabase.rpc("get_user_credits", {
        user_uuid: userId,
      });

      if (error) {
        throw error;
      }

      if (Array.isArray(data)) {
        const value = data[0];
        if (value === null || value === undefined) {
          return 0;
        }
        if (typeof value === "number") {
          return value;
        }
        const numericValue =
          typeof value?.get_user_credits === "number"
            ? value.get_user_credits
            : Number(value?.get_user_credits);
        return Number.isFinite(numericValue) ? numericValue : 0;
      }

      if (typeof data === "number") {
        return data;
      }

      const numericValue = Number(data);
      return Number.isFinite(numericValue) ? numericValue : 0;
    } catch (error) {
      console.error("❌ Error fetching user credits:", error);
      return 0;
    }
  },

  // Get user profile without credits (for viewing other users' profiles)
  async getUserProfilePublic(userId) {
    const { data, error } = await supabase
      .from("user_profiles")
      .select(
        "id, dj_name, full_name, first_name, last_name, email, bio, status_message, location, city, genres, profile_image_url, phone, show_email, show_phone, primary_mix_id, created_at, updated_at, username, is_verified, gigs_completed, instagram, soundcloud"
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

  async incrementUserCredits(userId, amount = 0) {
    if (!userId || !Number.isFinite(amount) || amount === 0) {
      console.warn("incrementUserCredits skipped due to invalid params", {
        userId,
        amount,
      });
      return null;
    }

    try {
      const { data: profile, error: fetchError } = await supabase
        .from("user_profiles")
        .select("credits")
        .eq("id", userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!profile) {
        console.warn("No user profile found when incrementing credits", {
          userId,
        });
        return null;
      }

      const currentCredits = Number(profile?.credits) || 0;
      const newCredits = currentCredits + amount;

      const { data, error: updateError } = await supabase
        .from("user_profiles")
        .update({
          credits: newCredits,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select("credits")
        .single();

      if (updateError) throw updateError;

      return data?.credits ?? newCredits;
    } catch (error) {
      console.error("Error incrementing user credits:", error);
      throw error;
    }
  },

  async getUserSettings(userId) {
    const readFromMetadata = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || user.id !== userId) return null;

        const metadataSettings =
          user.user_metadata?.notification_settings ||
          user.user_metadata?.notificationSettings ||
          {};

        return {
          push_notifications:
            metadataSettings.push_notifications ??
            metadataSettings.pushNotifications ??
            null,
          message_notifications:
            metadataSettings.message_notifications ??
            metadataSettings.messageNotifications ??
            null,
        };
      } catch (metadataError) {
        console.warn("Fallback metadata lookup failed:", metadataError);
        return null;
      }
    };

    try {
      const { data, error } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        if (error.code === "PGRST205" || error.code === "PGRST204") {
          console.log(
            "user_settings table missing; falling back to auth metadata"
          );
          return await readFromMetadata();
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error fetching user settings:", error);
      return await readFromMetadata();
    }
  },

  async upsertUserSettings(userId, updates) {
    const sanitizedUpdates = Object.fromEntries(
      Object.entries(updates || {}).filter(([, value]) => value !== undefined)
    );

    const fallbackToMetadata = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || user.id !== userId) {
          throw new Error("No authenticated user for metadata update");
        }

        const existingSettings =
          user.user_metadata?.notification_settings ||
          user.user_metadata?.notificationSettings ||
          {};

        const mergedSettings = {
          ...existingSettings,
          ...sanitizedUpdates,
        };

        const { data, error } = await supabase.auth.updateUser({
          data: {
            notification_settings: mergedSettings,
          },
        });

        if (error) throw error;
        return {
          push_notifications: mergedSettings.push_notifications,
          message_notifications: mergedSettings.message_notifications,
        };
      } catch (metadataError) {
        console.error(
          "Error saving notification settings via metadata:",
          metadataError
        );
        throw metadataError;
      }
    };

    try {
      const payload = {
        user_id: userId,
        ...sanitizedUpdates,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("user_settings")
        .upsert(payload, { onConflict: "user_id" })
        .select()
        .maybeSingle();

      if (error) {
        if (error.code === "PGRST205" || error.code === "PGRST204") {
          console.log(
            "user_settings table missing; writing settings to auth metadata"
          );
          return await fallbackToMetadata();
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error("Error saving user settings:", error);
      return await fallbackToMetadata();
    }
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
        console.log(
          "🎯 Blocking application due to database access error - user should upload a mix first"
        );
        return false;
      }

      const hasMixes = userMixes && userMixes.length > 0;
      console.log("🎯 User has any mixes:", hasMixes);

      if (hasMixes) {
        console.log("🎯 Found mixes:", userMixes);
        // User has uploaded mixes, that's all we need to check
        return true;
      } else {
        console.log(
          "🎯 No mixes found for user - they need to upload a mix first"
        );
        return false;
      }
    } catch (error) {
      console.error("🚨 Unexpected error in hasUserUploadedMixes:", error);
      // If we can't determine due to errors, be conservative and block the application
      // This ensures users upload mixes before applying
      console.log(
        "🎯 Blocking application due to database error - user should upload a mix first"
      );
      return false;
    }
  },

  async getUserWithPrimaryMix(userId) {
    const { data, error } = await supabase
      .from("user_profiles")
      .select(
        "id, dj_name, full_name, first_name, last_name, email, bio, status_message, location, genres, profile_image_url, phone, show_email, show_phone, primary_mix_id, credits, created_at, updated_at, primary_mix:primary_mix_id(id, title, audio_url, duration, genre, created_at)"
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
      let result = [];

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
            user_1:user_profiles!connections_user_id_1_fkey(
              id, 
              dj_name, 
              full_name, 
              username,
              city,
              location,
              status_message,
              genres,
              profile_image_url,
              rating,
              gigs_completed,
              is_verified
            ),
            user_2:user_profiles!connections_user_id_2_fkey(
              id, 
              dj_name, 
              full_name, 
              username,
              city,
              location,
              status_message,
              genres,
              profile_image_url,
              rating,
              gigs_completed,
              is_verified
            )
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

          console.log("🔍 Fallback query - Connected user data:", {
            id: connectedUser?.id,
            name: connectedUser?.dj_name || connectedUser?.full_name,
            image: connectedUser?.profile_image_url,
            hasImage: !!connectedUser?.profile_image_url,
          });

          return {
            connected_user_id: connectedUser?.id,
            connected_user_name:
              connectedUser?.dj_name ||
              connectedUser?.full_name ||
              "Unknown User",
            connected_user_username: connectedUser?.username || null,
            connected_user_city:
              connectedUser?.city || connectedUser?.location || null,
            connected_user_genres: connectedUser?.genres || [],
            connected_user_image: connectedUser?.profile_image_url || null,
            connected_user_rating: connectedUser?.rating || 0,
            connected_user_gigs: connectedUser?.gigs_completed || 0,
            connected_user_verified: connectedUser?.is_verified || false,
            connected_user_status_message:
              connectedUser?.status_message || null,
            connection_status: conn.status,
            initiated_by: conn.initiated_by,
            created_at: conn.created_at,
            accepted_at: conn.accepted_at,
          };
        });

        result = transformedData;
      } else {
        result = data || [];

        // Log successful RPC data for debugging
        if (result.length > 0) {
          console.log(
            "✅ RPC get_user_connections succeeded:",
            result.length,
            "connections"
          );
          console.log("🔍 Sample connection data:", {
            id: result[0]?.connected_user_id,
            name: result[0]?.connected_user_name,
            image: result[0]?.connected_user_image,
            hasImage: !!result[0]?.connected_user_image,
          });
        }
      }

      // Ensure status_message is populated for all connections
      if (result.length > 0) {
        const missingStatusIds = result
          .filter(
            (conn) =>
              conn.connected_user_status_message === undefined ||
              conn.connected_user_status_message === null
          )
          .map((conn) => conn.connected_user_id);

        if (missingStatusIds.length > 0) {
          const uniqueMissingStatusIds = [...new Set(missingStatusIds)];
          const { data: statusProfiles, error: statusError } = await supabase
            .from("user_profiles")
            .select("id, status_message")
            .in("id", uniqueMissingStatusIds);

          if (!statusError && statusProfiles) {
            const statusMap = new Map(
              statusProfiles.map((profile) => [
                profile.id,
                profile.status_message,
              ])
            );

            result = result.map((conn) => ({
              ...conn,
              connected_user_status_message:
                conn.connected_user_status_message ??
                statusMap.get(conn.connected_user_id) ??
                null,
            }));
          }
        }
      }

      // Filter by status if provided
      if (status) {
        result = result.filter((conn) => conn.connection_status === status);
      }

      return result;
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

  async declineConnection(connectionId) {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("User not authenticated");

      const updatePayload = {
        updated_at: new Date().toISOString(),
        connection_status: "rejected",
        status: "rejected",
      };

      const { error } = await supabase
        .from("connections")
        .update(updatePayload)
        .eq("id", connectionId);

      if (error) throw error;

      console.log("🚫 Connection declined:", connectionId);
      return { id: connectionId, status: "rejected" };
    } catch (error) {
      console.error("Error declining connection:", error);
      throw error;
    }
  },

  async cancelConnectionRequest(connectionId) {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("User not authenticated");

      if (!connectionId) {
        throw new Error("Connection ID is required to cancel a request");
      }

      const { data: existingConnection, error: fetchError } = await supabase
        .from("connections")
        .select("id, status, initiated_by, user_id_1, user_id_2")
        .eq("id", connectionId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      if (!existingConnection) {
        console.warn(
          "⚠️ cancelConnectionRequest: Connection not found, assuming already removed",
          connectionId
        );
        return true;
      }

      const normalizedStatus =
        existingConnection.status?.toString().trim().toLowerCase() || "";
      if (normalizedStatus !== "pending") {
        console.warn(
          "⚠️ cancelConnectionRequest: Connection is not pending, skipping removal",
          { connectionId, status: existingConnection.status }
        );
        return true;
      }

      const {
        user_id_1: userId1,
        user_id_2: userId2,
        initiated_by: initiatedBy,
      } = existingConnection;

      const isParticipant =
        user.id === userId1 || user.id === userId2 || user.id === initiatedBy;

      if (!isParticipant) {
        throw new Error("You do not have permission to cancel this request");
      }

      const { error: deleteError } = await supabase
        .from("connections")
        .delete()
        .eq("id", connectionId)
        .eq("status", "pending");

      if (deleteError) throw deleteError;

      console.log("🗑️ Connection request cancelled:", connectionId);
      return true;
    } catch (error) {
      console.error("Error cancelling connection request:", error);
      throw error;
    }
  },

  async deleteConnection(connectionId) {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("User not authenticated");

      if (!connectionId) {
        throw new Error("Connection ID is required to remove a connection");
      }

      const { data: existingConnection, error: fetchError } = await supabase
        .from("connections")
        .select("id, status, user_id_1, user_id_2")
        .eq("id", connectionId)
        .maybeSingle();

      if (fetchError && fetchError.code !== "PGRST116") {
        throw fetchError;
      }

      if (!existingConnection) {
        console.warn(
          "⚠️ deleteConnection: Connection not found, assuming already removed",
          connectionId
        );
        return { success: true, otherUserId: null };
      }

      const {
        user_id_1: userId1,
        user_id_2: userId2,
      } = existingConnection;

      const isParticipant = user.id === userId1 || user.id === userId2;
      if (!isParticipant) {
        throw new Error("You do not have permission to remove this connection");
      }

      const otherUserId = user.id === userId1 ? userId2 : userId1;

      const { error: deleteError } = await supabase
        .from("connections")
        .delete()
        .eq("id", connectionId);

      if (deleteError) throw deleteError;

      console.log("🧹 Connection removed:", { connectionId, otherUserId });
      return { success: true, otherUserId };
    } catch (error) {
      console.error("Error deleting connection:", error);
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
  async getUnreadNotificationCount(
    userId,
    { includeTypes, excludeTypes } = {}
  ) {
    try {
      let query = supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("is_read", false);

      if (includeTypes && includeTypes.length > 0) {
        query = query.in("type", includeTypes);
      } else if (excludeTypes && excludeTypes.length > 0) {
        if (excludeTypes.length === 1) {
          query = query.neq("type", excludeTypes[0]);
        } else {
          const formatted = excludeTypes
            .map((type) => `'${type}'`)
            .join(",");
          query = query.not("type", "in", `(${formatted})`);
        }
      }

      const { count, error } = await query;

      if (error) throw error;
      return count || 0;
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

  async getLastMessageForConnection(userId, connectedUserId) {
    try {
      console.log(
        `🔍 getLastMessageForConnection: userId=${userId}, connectedUserId=${connectedUserId}`
      );

      // Find or create the message thread between these users
      const threadId = await this.findOrCreateIndividualMessageThread(
        userId,
        connectedUserId
      );

      if (!threadId) {
        console.log("No thread found for users:", userId, connectedUserId);
        return null;
      }

      console.log(`🔍 Thread ID: ${threadId}`);

      // Get the last message from this thread
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
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("❌ Error fetching last message:", error);
        console.error("❌ Error details:", {
          code: error.code,
          message: error.message,
          hint: error.hint,
        });
        return null;
      }

      console.log(
        `🔍 Last message for thread ${threadId}:`,
        data ? "Found" : "Not found"
      );
      return data || null;
    } catch (error) {
      console.error("Error getting last message for connection:", error);
      return null;
    }
  },

  async getAllUserMessageThreads(userId) {
    try {
      console.log("🔍 Getting all message threads for user:", userId);

      // Query message_threads to get all threads where this user is a participant
      // First, try with user_id_1 and user_id_2 (current production schema)
      const { data: threadsData1, error: error1 } = await supabase
        .from("message_threads")
        .select("*")
        .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
        .eq("type", "individual");

      if (error1) {
        console.log("❌ Error querying with user_id columns:", error1);
        return [];
      }

      if (threadsData1 && threadsData1.length > 0) {
        console.log(
          `✅ Found ${threadsData1.length} threads with user_id columns`
        );
        return threadsData1;
      }

      // Fallback: try with participant_1 and participant_2 (legacy schema)
      console.log("🔍 Trying legacy schema with participant columns...");
      const { data: threadsData2, error: error2 } = await supabase
        .from("message_threads")
        .select("*")
        .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
        .eq("type", "individual");

      if (error2) {
        console.log("❌ Error querying with participant columns:", error2);
        return [];
      }

      if (threadsData2 && threadsData2.length > 0) {
        console.log(
          `✅ Found ${threadsData2.length} threads with participant columns`
        );
        return threadsData2;
      }

      console.log("📭 No message threads found for user");
      return [];
    } catch (error) {
      console.error("Error getting all user message threads:", error);
      return [];
    }
  },

  async getAllConversationParticipants(userId) {
    try {
      console.log("🔍 Getting all conversation participants for user:", userId);

      // Get all message threads for this user
      const threads = await this.getAllUserMessageThreads(userId);

      if (!threads || threads.length === 0) {
        return [];
      }

      console.log("🔍 Found threads, getting participants:", threads.length);

      // For each thread, get the other user's profile and last message
      const participantsPromises = threads.map(async (thread) => {
        try {
          // Determine the other user ID from the thread
          const otherUserId =
            thread.user_id_1 === userId ? thread.user_id_2 : thread.user_id_1;

          // Fallback to participant columns if user_id columns don't exist
          const otherUserIdLegacy =
            thread.participant_1 === userId
              ? thread.participant_2
              : thread.participant_1;

          const finalOtherUserId = otherUserId || otherUserIdLegacy;

          if (!finalOtherUserId) {
            console.log(
              "⚠️ Could not determine other user for thread:",
              thread.id
            );
            return null;
          }

          // Get the other user's profile
          const otherUserProfile = await this.getUserProfilePublic(
            finalOtherUserId
          );

          if (!otherUserProfile) {
            console.log(
              "⚠️ Could not fetch profile for user:",
              finalOtherUserId
            );
            return null;
          }

          const connectionRecord = await this.getConnectionStatus(
            userId,
            finalOtherUserId
          );

          const normalizedStatus =
            connectionRecord?.status?.toString().trim().toLowerCase() ||
            connectionRecord?.connection_status?.toString().trim().toLowerCase() ||
            "";
          const isAcceptedStatus = ["accepted", "approved", "connected"].includes(
            normalizedStatus
          );

          if (!connectionRecord || !isAcceptedStatus) {
            console.log(
              "ℹ️ Skipping thread participant without active connection:",
              {
                finalOtherUserId,
                status: normalizedStatus || "none",
              }
            );
            return null;
          }

          // Get the last message for this thread
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
            .eq("thread_id", thread.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) {
            console.error(
              "Error fetching last message for thread:",
              thread.id,
              error
            );
          }

          return {
            userId: finalOtherUserId,
            name:
              otherUserProfile.dj_name ||
              otherUserProfile.full_name ||
              "Unknown User",
            username: otherUserProfile.username,
            profileImage: otherUserProfile.profile_image_url,
            location: otherUserProfile.city || otherUserProfile.location,
            genres: otherUserProfile.genres || [],
            isVerified: otherUserProfile.is_verified || false,
            statusMessage: otherUserProfile.status_message || "",
            lastMessage: data
              ? {
                  content: data.content,
                  timestamp: data.created_at,
                  senderId: data.sender_id,
                  senderName:
                    data.sender?.full_name || data.sender?.dj_name || "Unknown",
                  messageType: data.message_type || "text",
                }
              : null,
            connectionId:
              connectionRecord.id ||
              connectionRecord.connection_id ||
              connectionRecord.connectionId ||
              null,
          };
        } catch (error) {
          console.error("Error processing thread:", thread.id, error);
          return null;
        }
      });

      const results = await Promise.all(participantsPromises);
      const validParticipants = results.filter((p) => p !== null);

      console.log("✅ Returning participants:", validParticipants.length);
      return validParticipants;
    } catch (error) {
      console.error("Error getting all conversation participants:", error);
      return [];
    }
  },

  async getLastMessagesForAllConnections(userId) {
    try {
      // Get all message threads for this user (not just accepted connections)
      const threads = await this.getAllUserMessageThreads(userId);

      if (!threads || threads.length === 0) {
        return {};
      }

      console.log("🔍 Getting last messages for threads:", threads.length);

      // Get the last message for each thread
      const lastMessagesPromises = threads.map(async (thread) => {
        try {
          // Determine the other user ID from the thread
          const otherUserId =
            thread.user_id_1 === userId ? thread.user_id_2 : thread.user_id_1;

          // Fallback to participant columns if user_id columns don't exist
          const otherUserIdLegacy =
            thread.participant_1 === userId
              ? thread.participant_2
              : thread.participant_1;

          const finalOtherUserId = otherUserId || otherUserIdLegacy;

          if (!finalOtherUserId) {
            console.log(
              "⚠️ Could not determine other user for thread:",
              thread.id
            );
            return null;
          }

          // Get the last message for this thread
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
            .eq("thread_id", thread.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) {
            console.error(
              "❌ Error fetching last message for thread:",
              thread.id,
              error
            );
            console.error("❌ Error details:", {
              code: error.code,
              message: error.message,
              hint: error.hint,
            });
            return null;
          }

          if (!data) {
            console.log("📭 No message found for thread:", thread.id);
            return null;
          }

          console.log(
            "✅ Found message for thread:",
            thread.id,
            "-",
            data.content?.substring(0, 30)
          );

          return {
            otherUserId: finalOtherUserId,
            threadId: thread.id,
            lastMessage: data,
          };
        } catch (error) {
          console.error("Error processing thread:", thread.id, error);
          return null;
        }
      });

      const results = await Promise.all(lastMessagesPromises);

      // Convert to object format expected by UI
      const lastMessagesMap = {};
      results.forEach((result) => {
        if (result && result.lastMessage) {
          // Use the other user ID as the key
          lastMessagesMap[result.otherUserId] = {
            content: result.lastMessage.content,
            timestamp: result.lastMessage.created_at,
            senderId: result.lastMessage.sender_id,
            senderName:
              result.lastMessage.sender?.full_name ||
              result.lastMessage.sender?.dj_name ||
              "Unknown",
            messageType: result.lastMessage.message_type || "text",
          };
        }
      });

      console.log("✅ Last messages map keys:", Object.keys(lastMessagesMap));
      return lastMessagesMap;
    } catch (error) {
      console.error("Error getting last messages for all connections:", error);
      return {};
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

      console.log(
        `🔍 findOrCreateIndividualMessageThread: user1Id=${user1Id}, user2Id=${user2Id}, id1=${id1}, id2=${id2}`
      );

      // Check for existing threads between these users (both orderings)
      const { data: anyThreads } = await supabase
        .from("message_threads")
        .select("id, user_id_1, user_id_2, created_at")
        .eq("type", "individual")
        .or(
          `and(user_id_1.eq.${id1},user_id_2.eq.${id2}),and(user_id_1.eq.${id2},user_id_2.eq.${id1})`
        )
        .order("created_at", { ascending: true }); // Always use OLDEST thread

      console.log(`🔍 All threads between these users:`, anyThreads);

      // If we found ANY threads, use the OLDEST one (prevent duplicates)
      if (anyThreads && anyThreads.length > 0) {
        const oldestThread = anyThreads[0]; // First = oldest due to ordering
        console.log(
          `✅ Using existing thread (oldest of ${anyThreads.length}): ${oldestThread.id}`
        );

        // If there are multiple threads, log a warning
        if (anyThreads.length > 1) {
          console.warn(
            `⚠️ WARNING: Found ${anyThreads.length} threads for this user pair! Using oldest: ${oldestThread.id}`
          );
          console.warn(
            `⚠️ Other thread IDs:`,
            anyThreads.slice(1).map((t) => t.id)
          );
        }

        return oldestThread.id;
      }

      // No thread exists, create one
      console.log(
        `📝 No thread found, creating new one for users: ${id1}, ${id2}`
      );
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
        // Handle race condition: another client might have created it simultaneously
        if (createError.code === "23505") {
          console.warn(
            "⚠️ Race condition: Thread already exists, fetching it..."
          );
          // Re-fetch any threads
          const { data: reFetchedThreads } = await supabase
            .from("message_threads")
            .select("id")
            .eq("type", "individual")
            .eq("user_id_1", id1)
            .eq("user_id_2", id2)
            .order("created_at", { ascending: true })
            .limit(1)
            .single();

          if (reFetchedThreads) {
            console.log(`✅ Refetched existing thread: ${reFetchedThreads.id}`);
            return reFetchedThreads.id;
          }
        }
        throw createError;
      }

      console.log(`✅ Created new thread: ${newThread.id}`);
      return newThread.id;
    } catch (error) {
      console.error(
        "❌ Error finding or creating individual message thread:",
        error
      );
      throw error;
    }
  },
};

export { supabase };
