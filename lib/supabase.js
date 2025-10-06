import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";

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

  // Sign in with Google
  async signInWithGoogle() {
    try {
      console.log("🔐 Starting Google OAuth flow...");

      // Create a redirect URL for the OAuth flow
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: "rhoodapp",
        path: "auth/callback",
      });

      console.log("🔗 Redirect URL:", redirectUrl);

      // Create the OAuth URL
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        console.error("❌ Supabase OAuth error:", error);
        throw new Error(`Supabase OAuth error: ${error.message}`);
      }

      console.log("✅ OAuth URL created:", data.url);

      // Open the OAuth URL in the browser
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      console.log("🌐 Browser result:", result);

      if (result.type === "success") {
        console.log("✅ OAuth flow successful");
        // Extract the URL parameters
        const url = new URL(result.url);
        const accessToken = url.searchParams.get("access_token");
        const refreshToken = url.searchParams.get("refresh_token");

        console.log("🔑 Access token received:", !!accessToken);
        console.log("🔄 Refresh token received:", !!refreshToken);

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

          console.log("✅ Google Sign-In successful:", sessionData.user?.email);
          return sessionData;
        }
      } else if (result.type === "cancel") {
        console.log("❌ User cancelled OAuth flow");
        throw new Error("Sign-in was cancelled");
      }

      throw new Error("OAuth flow was cancelled or failed");
    } catch (error) {
      console.error("❌ Google OAuth error:", error);
      throw error;
    }
  },

  // Sign in with Apple
  async signInWithApple() {
    try {
      // Create a redirect URL for the OAuth flow
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: "rhoodapp",
        path: "auth/callback",
      });

      // Create the OAuth URL
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) throw error;

      // Open the OAuth URL in the browser
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      if (result.type === "success") {
        // Extract the URL parameters
        const url = new URL(result.url);
        const accessToken = url.searchParams.get("access_token");
        const refreshToken = url.searchParams.get("refresh_token");

        if (accessToken) {
          // Set the session with the tokens
          const { data: sessionData, error: sessionError } =
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

          if (sessionError) throw sessionError;
          return sessionData;
        }
      }

      throw new Error("OAuth flow was cancelled or failed");
    } catch (error) {
      console.error("Apple OAuth error:", error);
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
      .select(`
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
      `)
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
      .select(`
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
      `)
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
    const { data, error } = await supabase
      .from("applications")
      .insert([
        {
          opportunity_id: opportunityId,
          user_id: userId,
          status: "pending",
        },
      ])
      .select();

    if (error) throw error;
    return data[0];
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
      .select(`
        *,
        achievement:achievements(*)
      `)
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
  async getUserConnections(userId, status = 'accepted') {
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
          status: 'pending',
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
      .update({ status: 'accepted' })
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
};
