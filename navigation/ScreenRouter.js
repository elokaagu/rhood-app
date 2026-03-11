import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ConnectionsScreen from "../components/ConnectionsScreen";
import ListenScreen from "../components/ListenScreen";
import MessagesScreen from "../components/MessagesScreen";
import NotificationsScreen from "../components/NotificationsScreen";
import CommunityScreen from "../components/CommunityScreen";
import ProfileScreen from "../components/ProfileScreen";
import SettingsScreen from "../components/SettingsScreen";
import SwipeableOpportunityCard from "../components/SwipeableOpportunityCard";
import EditProfileScreen from "../components/EditProfileScreen";
import UserProfileView from "../components/UserProfileView";
import UploadMixScreen from "../components/UploadMixScreen";
import AboutScreen from "../components/AboutScreen";
import CommunityMembersScreen from "../components/CommunityMembersScreen";
import TermsOfServiceScreen from "../components/TermsOfServiceScreen";
import PrivacyPolicyScreen from "../components/PrivacyPolicyScreen";
import HelpCenterScreen from "../components/HelpCenterScreen";
import HelpChatScreen from "../components/HelpChatScreen";
import ConnectionsListScreen from "../components/ConnectionsListScreen";
import AchievementsListScreen from "../components/AchievementsListScreen";
import InviteScreen from "../components/InviteScreen";
import AdminApplicationsScreen from "../components/AdminApplicationsScreen";
import BrandGigsPortal from "../components/BrandGigsPortal";
import TrendingMixesScreen from "../components/TrendingMixesScreen";
import YourLikesScreen from "../components/YourLikesScreen";
import PlaylistDetailScreen from "../components/PlaylistDetailScreen";
import ResetPasswordScreen from "../components/ResetPasswordScreen";
import { db } from "../lib/supabase";

/**
 * Renders the current screen based on route. Receives screen, screenParams, styles,
 * and all router props (navigation, audio, opportunities, etc.) from App.
 */
export default function ScreenRouter({
  screen,
  screenParams = {},
  styles,
  user,
  setCurrentScreen,
  setScreenParams,
  setUser,
  setIsFirstTime,
  setDjProfile,
  setShowAuth,
  setAuthMode,
  globalAudioState,
  playGlobalAudio,
  pauseGlobalAudio,
  resumeGlobalAudio,
  stopGlobalAudio,
  addToQueue,
  playNextTrack,
  clearQueue,
  opportunities,
  currentOpportunityIndex,
  dailyApplicationStats,
  handleOpportunityPress,
  handleSwipeLeft,
  handleSwipeRight,
  resetOpportunities,
  isLoadingOpportunities,
  showSwipeTutorial,
  handleDismissSwipeTutorial,
  loadNotificationCounts,
  shuffleAllMixes,
  shuffleByGenre,
  shuffleBasedOnLikes,
}) {
  const rp = {
    user,
    setCurrentScreen,
    setScreenParams,
    setUser,
    setIsFirstTime,
    setDjProfile,
    setShowAuth,
    setAuthMode,
    globalAudioState,
    playGlobalAudio,
    pauseGlobalAudio,
    resumeGlobalAudio,
    stopGlobalAudio,
    addToQueue,
    playNextTrack,
    clearQueue,
    opportunities,
    currentOpportunityIndex,
    dailyApplicationStats,
    handleOpportunityPress,
    handleSwipeLeft,
    handleSwipeRight,
    resetOpportunities,
    isLoadingOpportunities,
    showSwipeTutorial,
    handleDismissSwipeTutorial,
    loadNotificationCounts,
    shuffleAllMixes,
    shuffleByGenre,
    shuffleBasedOnLikes,
  };

  switch (screen) {
    case "opportunities":
      return (
        <View style={[styles.screen, { backgroundColor: "hsl(0, 0%, 0%)" }]}>
          <View style={styles.opportunitiesContainer}>
            <View style={styles.opportunitiesHeader}>
              <Text style={styles.tsBlockBoldHeading}>OPPORTUNITIES</Text>
              <Text style={styles.opportunitiesSubtitle}>
                Swipe to find your next gig
              </Text>
              <View style={styles.dailyApplicationCounter}>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={16}
                  color={
                    rp.dailyApplicationStats?.can_apply
                      ? "hsl(75, 100%, 60%)"
                      : "hsl(0, 100%, 60%)"
                  }
                />
                <Text
                  style={[
                    styles.dailyApplicationText,
                    {
                      color: rp.dailyApplicationStats?.can_apply
                        ? "hsl(75, 100%, 60%)"
                        : "hsl(0, 100%, 60%)",
                    },
                  ]}
                >
                  {rp.dailyApplicationStats?.remaining_applications ?? 0}{" "}
                  applications remaining today
                </Text>
              </View>
            </View>
            <View style={styles.opportunitiesCardContainer}>
              {rp.isLoadingOpportunities ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>
                    Loading opportunities...
                  </Text>
                </View>
              ) : rp.currentOpportunityIndex < (rp.opportunities?.length ?? 0) ? (
                <SwipeableOpportunityCard
                  key={rp.currentOpportunityIndex}
                  opportunity={rp.opportunities[rp.currentOpportunityIndex]}
                  onPress={() =>
                    rp.handleOpportunityPress?.(
                      rp.opportunities[rp.currentOpportunityIndex]
                    )
                  }
                  onSwipeLeft={rp.handleSwipeLeft}
                  onSwipeRight={rp.handleSwipeRight}
                  isTopCard={true}
                  dailyApplicationStats={rp.dailyApplicationStats}
                />
              ) : (
                <View style={styles.noMoreOpportunities}>
                  <Ionicons
                    name="checkmark-circle"
                    size={64}
                    color="hsl(75, 100%, 60%)"
                  />
                  <Text style={styles.noMoreTitle}>All Caught Up!</Text>
                  <Text style={styles.noMoreSubtitle}>
                    You've seen all available opportunities. Check back later for
                    new gigs!
                  </Text>
                  <TouchableOpacity
                    style={styles.resetButton}
                    onPress={rp.resetOpportunities}
                  >
                    <Text style={styles.resetButtonText}>Start Over</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            {rp.showSwipeTutorial && (
              <Modal
                transparent={true}
                visible={rp.showSwipeTutorial}
                animationType="fade"
                onRequestClose={rp.handleDismissSwipeTutorial}
              >
                <View style={styles.tutorialOverlay}>
                  <View style={styles.tutorialContent}>
                    <View style={styles.tutorialHeader}>
                      <Text style={styles.tutorialTitle}>How to Use</Text>
                      <TouchableOpacity
                        onPress={rp.handleDismissSwipeTutorial}
                        style={styles.tutorialCloseButton}
                      >
                        <Ionicons
                          name="close"
                          size={24}
                          color="hsl(0, 0%, 100%)"
                        />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.tutorialInstructions}>
                      <View style={styles.tutorialInstructionRow}>
                        <View style={styles.tutorialIconContainer}>
                          <Ionicons
                            name="arrow-forward"
                            size={32}
                            color="hsl(75, 100%, 60%)"
                          />
                        </View>
                        <View style={styles.tutorialTextContainer}>
                          <Text style={styles.tutorialInstructionTitle}>
                            Swipe Right
                          </Text>
                          <Text style={styles.tutorialInstructionText}>
                            To apply for an opportunity
                          </Text>
                        </View>
                      </View>
                      <View style={styles.tutorialInstructionRow}>
                        <View style={styles.tutorialIconContainer}>
                          <Ionicons
                            name="arrow-back"
                            size={32}
                            color="hsl(0, 100%, 60%)"
                          />
                        </View>
                        <View style={styles.tutorialTextContainer}>
                          <Text style={styles.tutorialInstructionTitle}>
                            Swipe Left
                          </Text>
                          <Text style={styles.tutorialInstructionText}>
                            To dismiss and see the next opportunity
                          </Text>
                        </View>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.tutorialGotItButton}
                      onPress={rp.handleDismissSwipeTutorial}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.tutorialGotItButtonText}>
                        Got It
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </Modal>
            )}
          </View>
        </View>
      );

    case "messages":
      return (
        <MessagesScreen
          user={rp.user}
          navigation={{
            goBack: () => {
              rp.setCurrentScreen("connections");
              rp.setScreenParams((prev) => ({
                ...prev,
                initialTab:
                  screenParams?.returnToConnectionsTab || "connections",
              }));
            },
            navigate: (s, params = {}) => {
              rp.setCurrentScreen(s);
              rp.setScreenParams(params);
            },
          }}
          route={{ params: screenParams }}
        />
      );

    case "connections":
      return (
        <ConnectionsScreen
          user={rp.user}
          initialTab={screenParams.initialTab || "discover"}
          route={{ params: screenParams }}
          onNavigate={(s, params = {}) => {
            rp.setCurrentScreen(s);
            rp.setScreenParams(params);
          }}
          onPlayAudio={rp.playGlobalAudio}
        />
      );

    case "messages-list":
      return (
        <ConnectionsScreen
          user={rp.user}
          initialTab="connections"
          route={{
            params: { ...screenParams, returnToMessagesList: true },
          }}
          onNavigate={(s, params = {}) => {
            if (s === "messages") {
              params.returnToMessagesList = true;
            }
            rp.setCurrentScreen(s);
            rp.setScreenParams(params);
          }}
        />
      );

    case "notifications":
      return (
        <NotificationsScreen
          user={rp.user}
          onNavigate={(s, params = {}) => {
            rp.setCurrentScreen(s);
            rp.setScreenParams(params);
          }}
          onNotificationRead={rp.loadNotificationCounts}
        />
      );

    case "community":
      return (
        <CommunityScreen
          onNavigate={(s, params = {}) => {
            rp.setCurrentScreen(s);
            rp.setScreenParams(params);
          }}
        />
      );

    case "profile":
      return (
        <ProfileScreen
          key={screenParams.profileRefreshKey || "profile"}
          user={rp.user}
          globalAudioState={rp.globalAudioState}
          onPlayAudio={rp.playGlobalAudio}
          onPauseAudio={rp.pauseGlobalAudio}
          onResumeAudio={rp.resumeGlobalAudio}
          onStopAudio={rp.stopGlobalAudio}
          onNavigate={(s, params = {}) => {
            rp.setCurrentScreen(s);
            rp.setScreenParams(params);
          }}
        />
      );

    case "settings":
      return (
        <SettingsScreen
          user={rp.user}
          onNavigate={(s, params = {}) => {
            rp.setCurrentScreen(s);
            rp.setScreenParams(params);
          }}
          onSignOut={() => {
            rp.setUser(null);
            rp.setIsFirstTime(true);
            rp.setDjProfile({
              djName: "",
              firstName: "",
              lastName: "",
              instagram: "",
              soundcloud: "",
              city: "",
              genres: [],
            });
            rp.setCurrentScreen("login");
          }}
          onNotificationPreferencesChange={rp.loadNotificationCounts}
        />
      );

    case "upload-mix":
      return (
        <UploadMixScreen
          user={rp.user}
          onBack={() => rp.setCurrentScreen("profile")}
          onUploadComplete={() => rp.setCurrentScreen("profile")}
          existingMixId={screenParams.mixId || null}
        />
      );

    case "reset-password":
      return (
        <ResetPasswordScreen
          onBack={() => {
            rp.setCurrentScreen("login");
            rp.setShowAuth?.(true);
            rp.setAuthMode?.("login");
          }}
          onSuccess={() => {
            rp.setCurrentScreen("login");
            rp.setShowAuth?.(true);
            rp.setAuthMode?.("login");
          }}
        />
      );

    case "edit-profile":
      return (
        <EditProfileScreen
          user={rp.user}
          onSave={async (updatedProfile) => {
            if (rp.user) {
              try {
                const profile = await db.getUserProfile(rp.user.id);
                rp.setUser((prev) => ({
                  ...prev,
                  user_metadata: {
                    ...prev.user_metadata,
                    profile_image_url: profile?.profile_image_url,
                    dj_name: profile?.dj_name,
                  },
                }));
              } catch (_) {}
            }
            rp.setCurrentScreen("profile");
            rp.setScreenParams((prev) => ({
              ...prev,
              profileRefreshKey: Date.now(),
            }));
          }}
          onCancel={() => rp.setCurrentScreen("profile")}
        />
      );

    case "user-profile":
      return (
        <UserProfileView
          userId={screenParams.userId}
          globalAudioState={rp.globalAudioState}
          onPlayAudio={rp.playGlobalAudio}
          onPauseAudio={rp.pauseGlobalAudio}
          onResumeAudio={rp.resumeGlobalAudio}
          onStopAudio={rp.stopGlobalAudio}
          onBack={() => rp.setCurrentScreen("connections")}
          onNavigate={(s, params = {}) => {
            rp.setCurrentScreen(s);
            rp.setScreenParams(params);
          }}
        />
      );

    case "community-members":
      return (
        <CommunityMembersScreen
          communityId={screenParams.communityId}
          communityName={screenParams.communityName}
          onBack={() => {
            if (screenParams.returnToMessages) {
              rp.setCurrentScreen("messages");
              rp.setScreenParams({
                communityId: screenParams.communityId,
                chatType: "group",
              });
            } else {
              rp.setCurrentScreen("connections");
            }
          }}
          onNavigate={(s, params = {}) => {
            rp.setCurrentScreen(s);
            rp.setScreenParams(params);
          }}
        />
      );

    case "connections-list":
      return (
        <ConnectionsListScreen
          user={rp.user}
          onBack={() => rp.setCurrentScreen("profile")}
          onNavigate={(s, params = {}) => {
            rp.setCurrentScreen(s);
            rp.setScreenParams(params);
          }}
        />
      );

    case "achievements-list":
      return (
        <AchievementsListScreen
          user={rp.user}
          onBack={() => rp.setCurrentScreen("profile")}
        />
      );

    case "invite":
      return (
        <InviteScreen
          user={rp.user}
          onBack={() => rp.setCurrentScreen("profile")}
        />
      );

    case "admin-applications":
      return (
        <AdminApplicationsScreen
          user={rp.user}
          onNavigate={(s, params = {}) => {
            rp.setCurrentScreen(s);
            rp.setScreenParams(params);
          }}
        />
      );

    case "brand-gigs-portal":
      return (
        <BrandGigsPortal
          user={rp.user}
          onBack={() => rp.setCurrentScreen("admin-applications")}
        />
      );

    case "about":
      return (
        <AboutScreen onBack={() => rp.setCurrentScreen("opportunities")} />
      );

    case "terms":
      return (
        <TermsOfServiceScreen
          onBack={() => rp.setCurrentScreen("settings")}
        />
      );

    case "privacy":
      return (
        <PrivacyPolicyScreen
          onBack={() => rp.setCurrentScreen("settings")}
        />
      );

    case "help":
      return (
        <HelpCenterScreen
          onBack={() => rp.setCurrentScreen("settings")}
          onNavigate={(s, params = {}) => {
            rp.setCurrentScreen(s);
            rp.setScreenParams(params);
          }}
        />
      );

    case "help-chat":
      return (
        <HelpChatScreen
          user={rp.user}
          onBack={() => rp.setCurrentScreen("help")}
        />
      );

    case "listen":
      return (
        <ListenScreen
          globalAudioState={rp.globalAudioState}
          onPlayAudio={rp.playGlobalAudio}
          onPauseAudio={rp.pauseGlobalAudio}
          onResumeAudio={rp.resumeGlobalAudio}
          onStopAudio={rp.stopGlobalAudio}
          onAddToQueue={rp.addToQueue}
          onPlayNext={rp.playNextTrack}
          onClearQueue={rp.clearQueue}
          onNavigate={(s, params = {}) => {
            rp.setCurrentScreen(s);
            rp.setScreenParams(params);
          }}
          user={rp.user}
          onShuffleAll={rp.shuffleAllMixes}
          onShuffleByGenre={rp.shuffleByGenre}
          onShuffleBasedOnLikes={rp.shuffleBasedOnLikes}
        />
      );

    case "trending-mixes":
      return (
        <TrendingMixesScreen
          globalAudioState={rp.globalAudioState}
          onPlayAudio={rp.playGlobalAudio}
          onPauseAudio={rp.pauseGlobalAudio}
          onBack={() => rp.setCurrentScreen("listen")}
          user={rp.user}
          onAddToQueue={rp.addToQueue}
          onPlayNext={rp.playNextTrack}
        />
      );

    case "your-likes":
      return (
        <YourLikesScreen
          globalAudioState={rp.globalAudioState}
          onPlayAudio={rp.playGlobalAudio}
          onPauseAudio={rp.pauseGlobalAudio}
          onBack={() => rp.setCurrentScreen("listen")}
          user={rp.user}
          onAddToQueue={rp.addToQueue}
          onPlayNext={rp.playNextTrack}
        />
      );

    case "playlist-detail":
      return (
        <PlaylistDetailScreen
          globalAudioState={rp.globalAudioState}
          onPlayAudio={rp.playGlobalAudio}
          onPauseAudio={rp.pauseGlobalAudio}
          onBack={() => rp.setCurrentScreen("listen")}
          user={rp.user}
          onAddToQueue={rp.addToQueue}
          onPlayNext={rp.playNextTrack}
          playlistId={screenParams.playlistId}
          playlistName={screenParams.playlistName}
        />
      );

    default:
      return (
        <ListenScreen
          globalAudioState={rp.globalAudioState}
          onPlayAudio={rp.playGlobalAudio}
          onPauseAudio={rp.pauseGlobalAudio}
          onResumeAudio={rp.resumeGlobalAudio}
          onStopAudio={rp.stopGlobalAudio}
          onAddToQueue={rp.addToQueue}
          onPlayNext={rp.playNextTrack}
          onClearQueue={rp.clearQueue}
          user={rp.user}
          onShuffleAll={rp.shuffleAllMixes}
          onShuffleByGenre={rp.shuffleByGenre}
          onShuffleBasedOnLikes={rp.shuffleBasedOnLikes}
        />
      );
  }
}
