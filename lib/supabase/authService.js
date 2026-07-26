import * as WebBrowser from "expo-web-browser";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { supabase, getRedirectUrl } from "./supabaseClient";
import { isExpoGo } from "../platformCapabilities";
import { db } from "./db";

const _consoleLog = console.log.bind(console);
function devLog(...args) {
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    _consoleLog(...args);
  }
}

export const auth = {
  // Sign up with email and password
  async signUp(email, password) {
    const attemptSignUp = async () => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getRedirectUrl(),
        },
      });
      return { data, error };
    };

    let { data, error } = await attemptSignUp();

    // "User already registered" can mean the account was deleted from the
    // backend (user_profiles removed) but the auth.users record survived.
    // Try to clean up the orphaned auth record and retry once.
    if (
      error &&
      (error.message?.toLowerCase().includes("already registered") ||
        error.message?.toLowerCase().includes("already been registered") ||
        error.message?.toLowerCase().includes("user already exists"))
    ) {
      try {
        const { data: cleaned } = await supabase.rpc(
          "cleanup_orphaned_auth_user",
          { p_email: email }
        );
        if (cleaned === true) {
          // Orphaned record removed — retry signup
          const retry = await attemptSignUp();
          data = retry.data;
          error = retry.error;
        }
        // cleaned === false means a real active profile exists → fall through
        // and throw the original error below
      } catch (_) {
        // RPC not yet deployed or failed — surface original error
      }
    }

    if (error) throw error;

    // Expose whether email confirmation is pending (session === null means unconfirmed)
    return {
      ...data,
      needsEmailConfirmation: !!data.user && !data.session,
    };
  },

  // Resend the confirmation email for an unverified address
  async resendConfirmationEmail(email) {
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    if (error) throw error;
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
      devLog("🔐 Starting Google Sign-In...");

      // Create a redirect URL for the OAuth flow
      const redirectUrl = getRedirectUrl();

      devLog("🔗 Using redirect URL:", redirectUrl);

      // Check if we're in development mode
      if (__DEV__ || redirectUrl.includes("localhost")) {
        devLog("🔧 Development mode detected - using localhost redirect");
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

      devLog("🔐 Opening Google OAuth URL in browser...");

      // Open the OAuth URL in the browser
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl,
        {
          showInRecents: false,
          preferEphemeralSession: true, // Forces account selection
        }
      );

      devLog("🔍 OAuth result:", result.type);

      if (result.type === "success") {
        devLog("✅ OAuth success, processing result...");
        devLog("🔗 Callback URL:", result.url);

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
          devLog("📝 Received OAuth code, exchanging for session...");
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
            devLog("✅ Session established from OAuth code");
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

        devLog("🎫 Tokens received:", {
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

          devLog("✅ Google Sign-In successful:", sessionData.user?.email);

          // Only create profile for signup flows, not login flows
          if (isSignupFlow) {
            devLog(
              "📝 Signup flow detected - checking/creating profile..."
            );
            try {
              devLog(
                "🔍 Checking for existing profile for user:",
                sessionData.user.id
              );
              const { data: existingProfile, error: profileError } =
                await supabase
                  .from("user_profiles")
                  .select("*")
                  .eq("id", sessionData.user.id)
                  .single();

              devLog("📋 Profile check result:", {
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
                // No profile found, create one from Google data for signup.
                // Goes through db.createUserProfile (not a raw insert) so
                // Google signups get the same duplicate-email guard and
                // invite-code generation as every other signup path —
                // previously this was a second, independent implementation
                // that had silently drifted to skip both.
                devLog("📝 Creating profile for new Google user...");
                devLog("👤 User metadata:", {
                  full_name: sessionData.user.user_metadata?.full_name,
                  given_name: sessionData.user.user_metadata?.given_name,
                  family_name: sessionData.user.user_metadata?.family_name,
                  email: sessionData.user.email,
                });

                try {
                  await db.createUserProfile({
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
                  });
                  devLog("✅ Profile created for new Google user");
                } catch (createError) {
                  console.error("❌ Error creating profile:", createError);
                }
              } else if (profileError) {
                console.error("❌ Error checking profile:", profileError);
              } else {
                devLog("✅ Existing profile found for Google user");
              }
            } catch (profileError) {
              console.warn("⚠️ Profile check/creation error:", profileError);
            }
          } else {
            devLog(
              "🔐 Login flow detected - letting handleLoginSuccess manage profile check"
            );
          }

          return sessionData;
        } else {
          throw new Error("No access token received from Google");
        }
      } else {
        devLog("❌ OAuth cancelled or failed:", result.type);
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
      devLog(
        "⚠️ Apple Sign-In already in progress, ignoring duplicate request"
      );
      return;
    }

    this._signingInWithApple = true;

    const runOAuthFallback = async () => {
      devLog("🍎 Falling back to Apple web OAuth flow…");

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
          devLog("✅ Apple OAuth session restored from callback URL");
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
          devLog("✅ Apple OAuth code exchange succeeded");
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

        devLog("✅ Apple OAuth tokens accepted");
        return sessionData;
      }

      throw new Error("No session information returned from Apple OAuth");
    };

    try {
      const nativeAvailable = await AppleAuthentication.isAvailableAsync();

      if (!nativeAvailable) {
        devLog(
          "⚠️ Native Apple Sign-In unavailable; attempting OAuth fallback"
        );
        return await runOAuthFallback();
      }

      devLog("🍎 Starting native Apple Sign-In flow…");

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error("Apple sign-in did not return an identity token");
      }

      // Sign in via Supabase Auth (no nonce needed for native sign-in per Supabase docs)
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
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
            devLog("✅ Saved user's full name from Apple Sign In");
          }
        } catch (nameError) {
          console.warn("⚠️ Could not save user's full name:", nameError);
          // Don't fail the sign-in if name saving fails
        }
      }

      devLog("✅ Apple Sign-In successful via native flow");
      return data;
    } catch (error) {
      if (
        error?.code === "ERR_CANCELED" ||
        error?.code === "ERR_APPLE_SIGNIN_CANCELLED"
      ) {
        devLog("⚠️ Apple Sign-In cancelled by user");
        throw new Error("Apple sign-in was cancelled");
      }

      // Don't fall back to OAuth if we're in a native environment (TestFlight/production)
      // OAuth fallback requires secrets and should only be used in development/Expo Go
      if (!isExpoGo()) {
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

