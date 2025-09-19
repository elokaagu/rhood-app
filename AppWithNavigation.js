import React, { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import SplashScreen from "./components/SplashScreen";
import LoginScreen from "./components/LoginScreen";
import SignupScreen from "./components/LoginScreen";
import OnboardingForm from "./components/OnboardingForm";
import AppTabs from "./src/navigation/AppTabs";
import { auth } from "./lib/supabase";

export default function AppWithNavigation() {
  // Load custom fonts
  const [fontsLoaded] = useFonts({
    "TS-Block-Bold": require("./assets/TS Block Bold.ttf"),
  });

  const [showSplash, setShowSplash] = useState(true);
  const [isFirstTime, setIsFirstTime] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login"); // 'login' or 'signup'

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const {
          data: { session },
        } = await auth.getSession();
        if (session?.user) {
          setUser(session.user);
        }
      } catch (error) {
        console.error("Auth check error:", error);
      }
    };

    checkAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Simulate splash screen delay
    const timer = setTimeout(() => {
      setShowSplash(false);
      setIsLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  // Wait for fonts to load
  if (!fontsLoaded) {
    return null;
  }

  // Show splash screen
  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  // Show auth screens if not logged in
  if (!user) {
    if (authMode === "login") {
      return (
        <LoginScreen
          onLoginSuccess={(user) => setUser(user)}
          onSwitchToSignup={() => setAuthMode("signup")}
        />
      );
    } else {
      return (
        <SignupScreen
          onSignupSuccess={(user) => setUser(user)}
          onSwitchToLogin={() => setAuthMode("login")}
        />
      );
    }
  }

  // Show onboarding if first time
  if (isFirstTime) {
    return (
      <OnboardingForm
        onComplete={() => setIsFirstTime(false)}
        djProfile={{}}
        setDjProfile={() => {}}
      />
    );
  }

  // Show main app with floating tab bar
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <AppTabs />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
