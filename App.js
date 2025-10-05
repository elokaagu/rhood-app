import React, { useState, useEffect } from "react";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { View, Modal, Animated, Text } from "react-native";
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
import BriefForm from "./components/BriefForm";
import EditProfileScreen from "./components/EditProfileScreen";
import Header from "./components/Header";
import SideMenu from "./components/SideMenu";

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
    showLogin,
    showSignup,
  } = useAuth();
  const { showFadeOverlay, fadeOverlayAnim } = useNavigation();
  const { showFullScreenPlayer, globalAudioState } = useAudio();
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
              onSwitchToSignup={showSignup}
            />
          ) : (
            <SignupScreen
              onSignupSuccess={handleSignupSuccess}
              onSwitchToLogin={showLogin}
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

        {/* Header */}
        <Header />

        {/* Main Content */}
        <View style={{ flex: 1 }}>
          <ScreenRenderer />
                  </View>

        {/* Mini Audio Player */}
        {globalAudioState.currentTrack && <MiniPlayer />}

        {/* Bottom Navigation */}
        <MainNavigation />

        {/* Full Screen Audio Player Modal */}
        {showFullScreenPlayer && <FullScreenPlayer />}

        {/* Brief Form Modal */}
        {showBriefForm && selectedOpportunity && <BriefFormModal />}

        {/* Side Menu */}
        <SideMenu />

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
  const { globalAudioState, showFullScreenPlayer, setShowFullScreenPlayer } =
    useAudio();

  return (
          <Modal
            visible={showFullScreenPlayer}
            animationType="slide"
      presentationStyle="fullScreen"
            onRequestClose={() => setShowFullScreenPlayer(false)}
          >
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: COLORS.textPrimary, fontSize: 18 }}>
          Full Screen Player
                  </Text>
        <Text style={{ color: COLORS.textSecondary, marginTop: 10 }}>
          {globalAudioState.currentTrack?.title || "No track playing"}
                  </Text>
                </View>
    </Modal>
  );
}

// Brief Form Modal Component
function BriefFormModal() {
  const {
    showBriefForm,
    selectedOpportunity,
    closeBriefForm,
    handleBriefSubmit,
    isSubmittingBrief,
  } = useOpportunities();

  if (!selectedOpportunity) return null;

  return (
        <Modal
          visible={showBriefForm}
          animationType="slide"
          presentationStyle="fullScreen"
      onRequestClose={closeBriefForm}
        >
            <BriefForm
              opportunity={selectedOpportunity}
        onClose={closeBriefForm}
              onSubmit={handleBriefSubmit}
              isLoading={isSubmittingBrief}
            />
        </Modal>
  );
}

// Fade Overlay Component
function FadeOverlay({ fadeAnim }) {
  return (
    <Animated.View
      style={{
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
        backgroundColor: COLORS.overlay,
        opacity: fadeAnim,
        zIndex: 9999,
      }}
    />
  );
}

// Global Modal Component
function GlobalModal() {
  // This would be implemented when needed
  return null;
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
