import React from "react";
import { View, Text } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import SplashScreen from "./SplashScreen";
import LoginScreen from "./LoginScreen";
import SignupScreen from "./SignupScreen";
import OnboardingForm from "./OnboardingForm";

/**
 * Handles splash, auth loading, login/signup, onboarding, and profile loading.
 * Returns null when user is authenticated and has profile (parent renders main app).
 */
export default function AuthGate({
  showSplash,
  onSplashFinish,
  authLoading,
  isLoading,
  user,
  isFirstTime,
  authMode,
  djProfile,
  setDjProfile,
  onLoginSuccess,
  onSignupSuccess,
  onSwitchToSignup,
  onSwitchToLogin,
  onOnboardingComplete,
  styles,
}) {
  if (showSplash) {
    return (
      <SafeAreaProvider>
        <SplashScreen onFinish={onSplashFinish} />
      </SafeAreaProvider>
    );
  }

  if (authLoading || isLoading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <View style={styles.center}>
            <Text style={styles.title}>R/HOOD</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (!user) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          {authMode === "login" ? (
            <LoginScreen
              onLoginSuccess={onLoginSuccess}
              onSwitchToSignup={onSwitchToSignup}
            />
          ) : (
            <SignupScreen
              onSignupSuccess={onSignupSuccess}
              onSwitchToLogin={onSwitchToLogin}
            />
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (isFirstTime && !authLoading && user) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <OnboardingForm
            onComplete={onOnboardingComplete}
            djProfile={djProfile}
            setDjProfile={setDjProfile}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  if (authLoading || (user && !djProfile)) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <View
            style={[
              styles.container,
              { justifyContent: "center", alignItems: "center" },
            ]}
          >
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return null;
}
