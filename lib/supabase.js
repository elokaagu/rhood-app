import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "exp+rhoodapp://expo-development-client/",
      },
    });

    if (error) throw error;
    return data;
  },

  // Sign in with Apple
  async signInWithApple() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "apple",
      options: {
        redirectTo: "exp+rhoodapp://expo-development-client/",
      },
    });

    if (error) throw error;
    return data;
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
      .insert([profile])
      .select();

    if (error) throw error;
    return data[0];
  },

  async getUserProfile(userId) {
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
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
};
