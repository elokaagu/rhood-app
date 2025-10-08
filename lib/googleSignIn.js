// Temporarily disable native Google Sign-In to prevent error
// import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { supabase } from "./supabase";
import { Platform } from "react-native";

// Mock GoogleSignin for now
const GoogleSignin = null;

/**
 * Native Google Sign-In Implementation for R/HOOD App
 *
 * This module provides native Google Sign-In functionality using
 * @react-native-google-signin/google-signin package.
 *
 * Benefits over web-based OAuth:
 * - No browser popup
 * - Faster authentication
 * - Better UX with native UI
 * - One-tap sign-in with saved accounts
 */

// Configuration
const GOOGLE_WEB_CLIENT_ID =
  process.env.GOOGLE_WEB_CLIENT_ID ||
  "YOUR_WEB_CLIENT_ID.apps.googleusercontent.com";
const GOOGLE_IOS_CLIENT_ID =
  process.env.GOOGLE_IOS_CLIENT_ID ||
  "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com";

/**
 * Configure Google Sign-In
 * Call this once when the app starts
 */
export const configureGoogleSignIn = () => {
  try {
    // Check if GoogleSignin is available (not null)
    if (!GoogleSignin) {
      console.log("⚠️ Native Google Sign-In not available - using web fallback");
      return;
    }

    GoogleSignin.configure({
      // Web Client ID is required for both iOS and Android
      webClientId: GOOGLE_WEB_CLIENT_ID,

      // iOS Client ID (optional, but recommended for better iOS integration)
      iosClientId: Platform.OS === "ios" ? GOOGLE_IOS_CLIENT_ID : undefined,

      // Request offline access to get refresh token
      offlineAccess: true,

      // Request user's basic profile info
      scopes: ["profile", "email"],

      // Force account selection every time (optional)
      forceCodeForRefreshToken: true,
    });

    console.log("✅ Google Sign-In configured successfully");
  } catch (error) {
    console.error("❌ Error configuring Google Sign-In:", error);
  }
};

/**
 * Check if Google Play Services are available (Android only)
 * @returns {Promise<boolean>}
 */
export const checkGooglePlayServices = async () => {
  try {
    if (!GoogleSignin) {
      return false;
    }
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    return true;
  } catch (error) {
    console.error("❌ Google Play Services not available:", error);
    return false;
  }
};

/**
 * Sign in with Google natively
 * @returns {Promise<Object>} Supabase session data
 */
export const signInWithGoogleNative = async () => {
  try {
    console.log("🔐 Starting native Google Sign-In...");

    // Check if GoogleSignin is available
    if (!GoogleSignin) {
      throw new Error("Native Google Sign-In not available");
    }

    // Check if Google Play Services are available (Android only)
    if (Platform.OS === "android") {
      const hasPlayServices = await checkGooglePlayServices();
      if (!hasPlayServices) {
        throw new Error("Google Play Services not available");
      }
    }

    // Check if user is already signed in
    const isSignedIn = await GoogleSignin.isSignedIn();
    if (isSignedIn) {
      console.log("📱 User already signed in, signing out first...");
      await GoogleSignin.signOut();
    }

    // Trigger Google Sign-In flow
    console.log("🚀 Launching Google Sign-In UI...");
    await GoogleSignin.hasPlayServices();
    const userInfo = await GoogleSignin.signIn();

    console.log("✅ Google Sign-In successful:", userInfo.data.user.email);
    console.log("👤 User info:", {
      email: userInfo.data.user.email,
      name: userInfo.data.user.name,
      photo: userInfo.data.user.photo,
    });

    // Get the ID token
    const { idToken } = userInfo.data;

    if (!idToken) {
      throw new Error("No ID token received from Google");
    }

    console.log("🎫 ID token received, authenticating with Supabase...");

    // Sign in to Supabase with the Google ID token
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });

    if (error) {
      console.error("❌ Supabase authentication error:", error);
      throw error;
    }

    console.log("✅ Supabase authentication successful:", data.user?.email);

    // Create or update user profile
    await createOrUpdateUserProfile(data.user, userInfo.data.user);

    return data;
  } catch (error) {
    console.error("❌ Native Google Sign-In error:", error);

    // Handle specific error cases
    if (error.code === "SIGN_IN_CANCELLED") {
      throw new Error("Sign-in was cancelled");
    } else if (error.code === "IN_PROGRESS") {
      throw new Error("Sign-in already in progress");
    } else if (error.code === "PLAY_SERVICES_NOT_AVAILABLE") {
      throw new Error("Google Play Services not available");
    }

    throw error;
  }
};

/**
 * Sign out from Google
 * @returns {Promise<void>}
 */
export const signOutFromGoogle = async () => {
  try {
    if (!GoogleSignin) {
      return;
    }
    const isSignedIn = await GoogleSignin.isSignedIn();
    if (isSignedIn) {
      await GoogleSignin.signOut();
      console.log("✅ Signed out from Google");
    }
  } catch (error) {
    console.error("❌ Error signing out from Google:", error);
  }
};

/**
 * Get current Google user info
 * @returns {Promise<Object|null>}
 */
export const getCurrentGoogleUser = async () => {
  try {
    if (!GoogleSignin) {
      return null;
    }
    const isSignedIn = await GoogleSignin.isSignedIn();
    if (isSignedIn) {
      const userInfo = await GoogleSignin.signInSilently();
      return userInfo.data.user;
    }
    return null;
  } catch (error) {
    console.error("❌ Error getting current user:", error);
    return null;
  }
};

/**
 * Revoke Google access (complete sign-out)
 * @returns {Promise<void>}
 */
export const revokeGoogleAccess = async () => {
  try {
    if (!GoogleSignin) {
      return;
    }
    await GoogleSignin.revokeAccess();
    console.log("✅ Google access revoked");
  } catch (error) {
    console.error("❌ Error revoking access:", error);
  }
};

/**
 * Create or update user profile in Supabase
 * @param {Object} supabaseUser - Supabase user object
 * @param {Object} googleUser - Google user object
 */
const createOrUpdateUserProfile = async (supabaseUser, googleUser) => {
  try {
    console.log("👤 Creating/updating user profile...");

    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", supabaseUser.id)
      .maybeSingle();

    if (existingProfile) {
      console.log("✅ User profile already exists");
      return;
    }

    // Create new profile
    const { error: profileError } = await supabase
      .from("user_profiles")
      .insert({
        id: supabaseUser.id,
        email: googleUser.email,
        full_name: googleUser.name,
        dj_name: googleUser.name, // Can be updated later
        profile_image_url: googleUser.photo,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error("❌ Error creating user profile:", profileError);
      // Don't throw - profile creation is not critical for sign-in
    } else {
      console.log("✅ User profile created successfully");
    }
  } catch (error) {
    console.error("❌ Error in createOrUpdateUserProfile:", error);
    // Don't throw - profile creation is not critical for sign-in
  }
};

/**
 * Check if native Google Sign-In is available
 * @returns {boolean}
 */
export const isNativeGoogleSignInAvailable = () => {
  try {
    // Check if the GoogleSignin module is available
    return GoogleSignin !== null && GoogleSignin !== undefined;
  } catch {
    return false;
  }
};

export default {
  configure: configureGoogleSignIn,
  signIn: signInWithGoogleNative,
  signOut: signOutFromGoogle,
  getCurrentUser: getCurrentGoogleUser,
  revokeAccess: revokeGoogleAccess,
  isAvailable: isNativeGoogleSignInAvailable,
};
