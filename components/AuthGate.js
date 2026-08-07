import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SplashScreen from "./SplashScreen";
import LoginScreen from "./LoginScreen";
import SignupScreen from "./SignupScreen";
import OnboardingForm from "./OnboardingForm";

/**
 * Handles splash, auth loading, login/signup, onboarding, and profile loading.
 * Returns null when user is authenticated and has profile (parent renders main app).
 *
 * Expects {@link SafeAreaProvider} above this tree (see App.js).
 */
export default function AuthGate({
  showSplash,
  onSplashFinish,
  authLoading,
  isLoading,
  user,
  isFirstTime,
  isPasswordRecovery,
  authMode,
  djProfile,
  setDjProfile,
  onLoginSuccess,
  onSignupSuccess,
  onSwitchToSignup,
  onSwitchToLogin,
  onOnboardingComplete,
  onSignOut,
  styles,
}) {
  if (showSplash) {
    return <SplashScreen onFinish={onSplashFinish} />;
  }

  const isAuthBusy = authLoading || isLoading;
  // A password-reset recovery session sets `user` — without this check, an
  // account that never finished onboarding got dropped into OnboardingForm
  // instead of ResetPasswordScreen, with no way to actually reach it (see
  // App.js's handleDeepLink / isPasswordRecovery for where this is set).
  const needsOnboarding = Boolean(user) && isFirstTime && !isPasswordRecovery;

  let content = null;

  if (isAuthBusy) {
    content = (
      <View style={styles.center}>
        <Text style={styles.title}>R/HOOD</Text>
      </View>
    );
  } else if (!user) {
    content =
      authMode === "login" ? (
        <LoginScreen
          onLoginSuccess={onLoginSuccess}
          onSwitchToSignup={onSwitchToSignup}
        />
      ) : (
        <SignupScreen
          onSignupSuccess={onSignupSuccess}
          onSwitchToLogin={onSwitchToLogin}
        />
      );
  } else if (needsOnboarding) {
    content = (
      <OnboardingForm
        onComplete={onOnboardingComplete}
        djProfile={djProfile}
        setDjProfile={setDjProfile}
        onSignOut={onSignOut}
      />
    );
  } else {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {content}
    </SafeAreaView>
  );
}
