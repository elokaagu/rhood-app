import React from "react";
import { View, Text } from "react-native";
import { useNavigation } from "../contexts/NavigationContext";
import { useAuth } from "../contexts/AuthContext";
import { useOpportunities } from "../contexts/OpportunitiesContext";
import { useAudio } from "../contexts/AudioContext";

// Import all screen components
import ConnectionsScreen from "./ConnectionsScreen";
import ConnectionsDiscoveryScreen from "./ConnectionsDiscoveryScreen";
import ListenScreen from "./ListenScreen";
import MessagesScreen from "./MessagesScreen";
import NotificationsScreen from "./NotificationsScreen";
import CommunityScreen from "./CommunityScreen";
import ProfileScreen from "./ProfileScreen";
import SettingsScreen from "./SettingsScreen";
import EditProfileScreen from "./EditProfileScreen";
import UploadMixScreen from "./UploadMixScreen";
import BriefForm from "./BriefForm";
import SwipeableOpportunityCard from "./SwipeableOpportunityCard";

const ScreenRenderer = () => {
  const { currentScreen, screenParams, navigateToScreen } = useNavigation();
  const { user, handleSignOut } = useAuth();
  const {
    opportunities,
    currentOpportunity,
    handleSwipeRight,
    handleSwipeLeft,
    showBriefFormModal,
  } = useOpportunities();
  const {
    globalAudioState,
    playGlobalAudio,
    pauseGlobalAudio,
    resumeGlobalAudio,
    stopGlobalAudio,
    addToQueue,
    playNextTrack,
    clearQueue,
  } = useAudio();

  const renderScreenContent = (screen) => {
    const commonProps = {
      user,
      onNavigate: navigateToScreen,
    };

    const audioProps = {
      globalAudioState,
      onPlayAudio: playGlobalAudio,
      onPauseAudio: pauseGlobalAudio,
      onResumeAudio: resumeGlobalAudio,
      onStopAudio: stopGlobalAudio,
      onAddToQueue: addToQueue,
      onPlayNext: playNextTrack,
      onClearQueue: clearQueue,
    };

    switch (screen) {
      case "opportunities":
        return (
          <View style={{ flex: 1 }}>
            {currentOpportunity && (
              <SwipeableOpportunityCard
                opportunity={currentOpportunity}
                onSwipeRight={() => handleSwipeRight(currentOpportunity)}
                onSwipeLeft={() => handleSwipeLeft(currentOpportunity)}
                onShowBrief={() => showBriefFormModal(currentOpportunity)}
                isLoading={false}
              />
            )}
          </View>
        );

      case "listen":
        return <ListenScreen {...audioProps} {...commonProps} />;

      case "connections":
        return <ConnectionsScreen {...commonProps} />;

      case "connections-discovery":
        return <ConnectionsDiscoveryScreen {...commonProps} />;

      case "messages":
        return (
          <MessagesScreen
            navigation={{ goBack: () => navigateToScreen("connections") }}
            route={{ params: screenParams }}
          />
        );

      case "notifications":
        return <NotificationsScreen {...commonProps} />;

      case "community":
        return <CommunityScreen {...commonProps} />;

      case "profile":
        return <ProfileScreen {...commonProps} />;

      case "settings":
        return <SettingsScreen {...commonProps} onSignOut={handleSignOut} />;

      case "edit-profile":
        return <EditProfileScreen {...commonProps} />;

      case "upload-mix":
        return <UploadMixScreen {...commonProps} />;

      default:
        return (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <Text>Screen not found: {screen}</Text>
          </View>
        );
    }
  };

  return <View style={{ flex: 1 }}>{renderScreenContent(currentScreen)}</View>;
};

export default ScreenRenderer;
