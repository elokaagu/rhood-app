import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth, db } from "../lib/supabase";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  // Authentication state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // 'login' or 'signup'

  // Onboarding state
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [djProfile, setDjProfile] = useState({
    dj_name: "",
    full_name: "",
    instagram: "",
    soundcloud: "",
    city: "",
    genres: [],
    bio: "",
  });

  // Initialize authentication
  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      console.log("🔐 Initializing authentication...");

      // Check if user is already logged in
      const session = await auth.getCurrentSession();

      if (session?.user) {
        console.log("✅ User session found:", session.user.email);

        // Fetch user profile
        const profile = await db.getUserProfile(session.user.id);
        if (profile) {
          setUser({ ...session.user, profile });
          console.log("✅ User profile loaded");
        } else {
          setUser(session.user);
        }
      }

      // Check if this is first time user
      const isFirstTimeUser = await AsyncStorage.getItem("isFirstTime");
      if (isFirstTimeUser === null) {
        setIsFirstTime(true);
        await AsyncStorage.setItem("isFirstTime", "true");
      } else {
        setIsFirstTime(false);
      }
    } catch (error) {
      console.error("❌ Auth initialization error:", error);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLoginSuccess = async (userData) => {
    try {
      console.log("✅ Login successful:", userData.email);

      // Fetch user profile
      const profile = await db.getUserProfile(userData.id);
      if (profile) {
        setUser({ ...userData, profile });
      } else {
        setUser(userData);
      }

      setShowAuth(false);
      setAuthMode("login");
    } catch (error) {
      console.error("❌ Error loading user profile:", error);
      setUser(userData);
      setShowAuth(false);
    }
  };

  const handleSignupSuccess = async (userData) => {
    console.log("✅ Signup successful:", userData.email);
    setUser(userData);
    setShowAuth(false);
    setAuthMode("login");
  };

  const handleSignOut = async () => {
    try {
      console.log("🔐 Signing out...");
      await auth.signOut();
      setUser(null);
      setShowAuth(false);
      setIsFirstTime(false);
      await AsyncStorage.removeItem("isFirstTime");
    } catch (error) {
      console.error("❌ Sign out error:", error);
    }
  };

  const showLogin = () => {
    setAuthMode("login");
    setShowAuth(true);
  };

  const showSignup = () => {
    setAuthMode("signup");
    setShowAuth(true);
  };

  const completeOnboarding = async (profileData) => {
    try {
      console.log("✅ Completing onboarding...");

      if (user) {
        // Create or update user profile
        const profile = await db.createUserProfile({
          id: user.id,
          ...profileData,
        });

        setUser({ ...user, profile });
      }

      setIsFirstTime(false);
      await AsyncStorage.setItem("isFirstTime", "false");
    } catch (error) {
      console.error("❌ Onboarding completion error:", error);
    }
  };

  const value = {
    // State
    user,
    authLoading,
    showAuth,
    authMode,
    isFirstTime,
    djProfile,

    // Actions
    handleLoginSuccess,
    handleSignupSuccess,
    handleSignOut,
    showLogin,
    showSignup,
    completeOnboarding,
    setDjProfile,
    setShowAuth,
    setAuthMode,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
