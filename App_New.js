import React, { useState, useEffect } from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { useFonts } from "expo-font";
import { StatusBar } from "expo-status-bar";

// Context Providers
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import {
  NavigationProvider,
  useNavigation,
} from "./contexts/NavigationContext";
import { AudioProvider, useAudio } from "./contexts/AudioContext";
import {
  OpportunitiesProvider,
  useOpportunities,
} from "./contexts/OpportunitiesContext";

// Components
import SplashScreen from "./components/SplashScreen";
import OnboardingForm from "./components/OnboardingForm";
import LoginScreen from "./components/LoginScreen";
import SignupScreen from "./components/SignupScreen";
import MainNavigation from "./components/MainNavigation";
import ScreenRenderer from "./components/ScreenRenderer";
import MiniPlayer from "./components/AudioPlayer/MiniPlayer";
import RhoodModal from "./components/RhoodModal";

// Styles
import { COLORS } from "./lib/sharedStyles";

// Main App Content (wrapped in all providers)
function AppContent() {
  const {
    user,
    authLoading,
    showAuth,
    authMode,
    isFirstTime,
    djProfile,
    setDjProfile,
    handleLoginSuccess,
    handleSignupSuccess,
    completeOnboarding,
  } = useAuth();
  const { showFadeOverlay, fadeOverlayAnim } = useNavigation();
  const { showFullScreenPlayer } = useAudio();
  const { showBriefForm, selectedOpportunity } = useOpportunities();

  // Font loading
  const [fontsLoaded] = useFonts({
    "TS-Block-Bold": require("./assets/TS Block Bold.ttf"),
  });

  // Show splash screen while loading
  if (!fontsLoaded || authLoading) {
    return <SplashScreen />;
  }

  // Show authentication screens if not logged in
  if (!user) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
          <StatusBar style="light" backgroundColor={COLORS.background} />
          {authMode === "login" ? (
            <LoginScreen
              onLoginSuccess={handleLoginSuccess}
              onSwitchToSignup={() => {}}
            />
          ) : (
            <SignupScreen
              onSignupSuccess={handleSignupSuccess}
              onSwitchToLogin={() => {}}
            />
          )}
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // Show onboarding if first time user
  if (isFirstTime) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
          <StatusBar style="light" backgroundColor={COLORS.background} />
          <OnboardingForm
            onComplete={completeOnboarding}
            djProfile={djProfile}
            setDjProfile={setDjProfile}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  // Main app interface
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
        <StatusBar style="light" backgroundColor={COLORS.background} />

        {/* Main Content */}
        <ScreenRenderer />

        {/* Mini Audio Player */}
        <MiniPlayer />

        {/* Bottom Navigation */}
        <MainNavigation />

        {/* Full Screen Audio Player Modal */}
        {showFullScreenPlayer && <FullScreenPlayer />}

        {/* Brief Form Modal */}
        {showBriefForm && selectedOpportunity && <BriefFormModal />}

        {/* Fade Overlay for transitions */}
        {showFadeOverlay && <FadeOverlay fadeAnim={fadeOverlayAnim} />}

        {/* Global Modal */}
        <GlobalModal />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

// Full Screen Player Component
function FullScreenPlayer() {
  // This would be extracted to its own component file
  return null; // Placeholder
}

// Brief Form Modal Component
function BriefFormModal() {
  // This would be extracted to its own component file
  return null; // Placeholder
}

// Fade Overlay Component
function FadeOverlay({ fadeAnim }) {
  // This would be extracted to its own component file
  return null; // Placeholder
}

// Global Modal Component
function GlobalModal() {
  // This would be extracted to its own component file
  return null; // Placeholder
}

// Main App with all providers
export default function App() {
  return (
    <AuthProvider>
      <NavigationProvider>
        <AudioProvider>
          <OpportunitiesProvider>
            <AppContent />
          </OpportunitiesProvider>
        </AudioProvider>
      </NavigationProvider>
    </AuthProvider>
  );
}
