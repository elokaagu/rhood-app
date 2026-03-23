import React, { useCallback, useMemo } from "react";
import { useAudioState } from "../context/AudioContext";
import { SCREENS } from "./routes";
import OpportunitiesScreen from "../components/OpportunitiesScreen";
import ConnectionsScreen from "../components/ConnectionsScreen";
import ListenScreen from "../components/ListenScreen";
import MessagesScreen from "../components/MessagesScreen";
import NotificationsScreen from "../components/NotificationsScreen";
import CommunityScreen from "../components/CommunityScreen";
import ProfileScreen from "../components/ProfileScreen";
import SettingsScreen from "../components/SettingsScreen";
import EditProfileScreen from "../components/EditProfileScreen";
import UserProfileView from "../components/UserProfileView";
import UploadMixScreen from "../components/UploadMixScreen";
import AboutScreen from "../components/AboutScreen";
import CommunityMembersScreen from "../components/CommunityMembersScreen";
import TermsOfServiceScreen from "../components/TermsOfServiceScreen";
import PrivacyPolicyScreen from "../components/PrivacyPolicyScreen";
import HelpCenterScreen from "../components/HelpCenterScreen";
import HelpChatScreen from "../components/HelpChatScreen";
import TutorialModeScreen from "../components/TutorialModeScreen";
import ConnectionsListScreen from "../components/ConnectionsListScreen";
import AchievementsListScreen from "../components/AchievementsListScreen";
import InviteScreen from "../components/InviteScreen";
import AdminApplicationsScreen from "../components/AdminApplicationsScreen";
import BrandGigsPortal from "../components/BrandGigsPortal";
import TrendingMixesScreen from "../components/TrendingMixesScreen";
import YourLikesScreen from "../components/YourLikesScreen";
import PlaylistDetailScreen from "../components/PlaylistDetailScreen";
import ResetPasswordScreen from "../components/ResetPasswordScreen";
import SwipeBackScreenShell from "../components/SwipeBackScreenShell";
import { db } from "../lib/supabase";
import { clearScreenCachesForUser } from "../lib/screenCache";

/** Same navigation as the header back arrow, plus edge swipe (see SwipeBackScreenShell). */
function withSwipeBack(onBack, screen) {
  return (
    <SwipeBackScreenShell onBack={onBack}>{screen}</SwipeBackScreenShell>
  );
}

/**
 * Renders the current screen based on route. Heavy lifting (opportunities, auth) stays in App;
 * this file only maps `screen` → component + shared navigation/audio wiring.
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
  const globalAudioState = useAudioState();

  const navigate = useCallback(
    (nextScreen, params = {}) => {
      const next = { ...params };
      if (nextScreen === SCREENS.UPLOAD_MIX && next.returnScreen === undefined) {
        next.returnScreen =
          next.mixId != null
            ? SCREENS.PROFILE
            : screen === SCREENS.UPLOAD_MIX
              ? SCREENS.LISTEN
              : screen;
      }
      setCurrentScreen(nextScreen);
      setScreenParams(next);
    },
    [setCurrentScreen, setScreenParams, screen]
  );

  /** Standard navigation object for screens that expect React Navigation–like API */
  const createNavigation = useCallback(
    (overrides = {}) => ({
      navigate,
      replace: navigate,
      goBack: overrides.goBack,
    }),
    [navigate]
  );

  const commonAudioProps = useMemo(
    () => ({
      globalAudioState,
      onPlayAudio: playGlobalAudio,
      onPauseAudio: pauseGlobalAudio,
      onResumeAudio: resumeGlobalAudio,
      onStopAudio: stopGlobalAudio,
      onAddToQueue: addToQueue,
      onPlayNext: playNextTrack,
      onClearQueue: clearQueue,
    }),
    [
      globalAudioState,
      playGlobalAudio,
      pauseGlobalAudio,
      resumeGlobalAudio,
      stopGlobalAudio,
      addToQueue,
      playNextTrack,
      clearQueue,
    ]
  );

  const listenScreenProps = useMemo(
    () => ({
      ...commonAudioProps,
      onNavigate: navigate,
      user,
      onShuffleAll: shuffleAllMixes,
      onShuffleByGenre: shuffleByGenre,
      onShuffleBasedOnLikes: shuffleBasedOnLikes,
    }),
    [
      commonAudioProps,
      navigate,
      user,
      shuffleAllMixes,
      shuffleByGenre,
      shuffleBasedOnLikes,
    ]
  );

  const handleSignOut = useCallback(() => {
    clearScreenCachesForUser(user?.id);
    setUser(null);
    setIsFirstTime(true);
    setDjProfile({
      djName: "",
      firstName: "",
      lastName: "",
      instagram: "",
      soundcloud: "",
      city: "",
      genres: [],
    });
    setCurrentScreen(SCREENS.LOGIN);
  }, [user?.id, setUser, setIsFirstTime, setDjProfile, setCurrentScreen]);

  const handleEditProfileSave = useCallback(
    async (_updatedProfile) => {
      if (user) {
        try {
          const profile = await db.getUserProfile(user.id);
          setUser((prev) => ({
            ...prev,
            user_metadata: {
              ...prev.user_metadata,
              profile_image_url: profile?.profile_image_url,
              dj_name: profile?.dj_name,
            },
          }));
        } catch (_) {
          /* ignore */
        }
      }
      setCurrentScreen(SCREENS.PROFILE);
      setScreenParams((prev) => ({
        ...prev,
        profileRefreshKey: Date.now(),
      }));
    },
    [user, setUser, setCurrentScreen, setScreenParams]
  );

  switch (screen) {
    case SCREENS.OPPORTUNITIES:
      return (
        <OpportunitiesScreen
          styles={styles}
          opportunities={opportunities}
          currentOpportunityIndex={currentOpportunityIndex}
          dailyApplicationStats={dailyApplicationStats}
          handleOpportunityPress={handleOpportunityPress}
          handleSwipeLeft={handleSwipeLeft}
          handleSwipeRight={handleSwipeRight}
          resetOpportunities={resetOpportunities}
          isLoadingOpportunities={isLoadingOpportunities}
          showSwipeTutorial={showSwipeTutorial}
          handleDismissSwipeTutorial={handleDismissSwipeTutorial}
        />
      );

    case SCREENS.MESSAGES:
      return withSwipeBack(
        () => {
          setCurrentScreen(SCREENS.CONNECTIONS);
          setScreenParams((prev) => ({
            ...prev,
            initialTab:
              screenParams?.returnToConnectionsTab || "discover",
          }));
        },
        <MessagesScreen
          user={user}
          navigation={createNavigation({
            goBack: () => {
              setCurrentScreen(SCREENS.CONNECTIONS);
              setScreenParams((prev) => ({
                ...prev,
                initialTab:
                  screenParams?.returnToConnectionsTab || "discover",
              }));
            },
          })}
          route={{ params: screenParams }}
        />
      );

    case SCREENS.CONNECTIONS:
      return (
        <ConnectionsScreen
          user={user}
          initialTab={screenParams.initialTab || "discover"}
          route={{ params: screenParams }}
          onNavigate={navigate}
          onPlayAudio={playGlobalAudio}
        />
      );

    case SCREENS.MESSAGES_LIST:
      return (
        <ConnectionsScreen
          user={user}
          initialTab="connections"
          route={{
            params: { ...screenParams, returnToMessagesList: true },
          }}
          onNavigate={(s, params = {}) => {
            if (s === SCREENS.MESSAGES) {
              params.returnToMessagesList = true;
            }
            navigate(s, params);
          }}
        />
      );

    case SCREENS.NOTIFICATIONS:
      return (
        <NotificationsScreen
          user={user}
          onNavigate={navigate}
          onNotificationRead={loadNotificationCounts}
        />
      );

    case SCREENS.COMMUNITY:
      return <CommunityScreen onNavigate={navigate} />;

    case SCREENS.PROFILE:
      return (
        <ProfileScreen
          key={screenParams.profileRefreshKey || "profile"}
          user={user}
          globalAudioState={globalAudioState}
          onPlayAudio={playGlobalAudio}
          onPauseAudio={pauseGlobalAudio}
          onResumeAudio={resumeGlobalAudio}
          onNavigate={navigate}
        />
      );

    case SCREENS.SETTINGS:
      return (
        <SettingsScreen
          user={user}
          onNavigate={navigate}
          onSignOut={handleSignOut}
          onNotificationPreferencesChange={loadNotificationCounts}
        />
      );

    case SCREENS.UPLOAD_MIX: {
      const uploadReturnScreen =
        screenParams.returnScreen != null
          ? screenParams.returnScreen
          : SCREENS.PROFILE;
      return withSwipeBack(
        () => setCurrentScreen(uploadReturnScreen),
        <UploadMixScreen
          user={user}
          onBack={() => setCurrentScreen(uploadReturnScreen)}
          onUploadComplete={() => setCurrentScreen(uploadReturnScreen)}
          existingMixId={screenParams.mixId || null}
        />
      );
    }

    case SCREENS.RESET_PASSWORD:
      return withSwipeBack(
        () => {
          setCurrentScreen(SCREENS.LOGIN);
          setShowAuth?.(true);
          setAuthMode?.("login");
        },
        <ResetPasswordScreen
          onBack={() => {
            setCurrentScreen(SCREENS.LOGIN);
            setShowAuth?.(true);
            setAuthMode?.("login");
          }}
          onSuccess={() => {
            setCurrentScreen(SCREENS.LOGIN);
            setShowAuth?.(true);
            setAuthMode?.("login");
          }}
        />
      );

    case SCREENS.EDIT_PROFILE:
      return withSwipeBack(
        () => setCurrentScreen(SCREENS.PROFILE),
        <EditProfileScreen
          user={user}
          onSave={handleEditProfileSave}
          onCancel={() => setCurrentScreen(SCREENS.PROFILE)}
        />
      );

    case SCREENS.USER_PROFILE:
      return withSwipeBack(
        () => setCurrentScreen(SCREENS.CONNECTIONS),
        <UserProfileView
          userId={screenParams.userId}
          globalAudioState={globalAudioState}
          onPlayAudio={playGlobalAudio}
          onPauseAudio={pauseGlobalAudio}
          onResumeAudio={resumeGlobalAudio}
          onStopAudio={stopGlobalAudio}
          onBack={() => setCurrentScreen(SCREENS.CONNECTIONS)}
          onNavigate={navigate}
        />
      );

    case SCREENS.COMMUNITY_MEMBERS:
      return (
        <CommunityMembersScreen
          communityId={screenParams.communityId}
          communityName={screenParams.communityName}
          onBack={() => {
            if (screenParams.returnToMessages) {
              setCurrentScreen(SCREENS.MESSAGES);
              setScreenParams({
                communityId: screenParams.communityId,
                chatType: "group",
              });
            } else {
              setCurrentScreen(SCREENS.CONNECTIONS);
            }
          }}
          onNavigate={navigate}
        />
      );

    case SCREENS.CONNECTIONS_LIST:
      return withSwipeBack(
        () => setCurrentScreen(SCREENS.PROFILE),
        <ConnectionsListScreen
          user={user}
          onBack={() => setCurrentScreen(SCREENS.PROFILE)}
          onNavigate={navigate}
        />
      );

    case SCREENS.ACHIEVEMENTS_LIST:
      return (
        <AchievementsListScreen
          user={user}
          onBack={() => setCurrentScreen(SCREENS.PROFILE)}
        />
      );

    case SCREENS.INVITE:
      return withSwipeBack(
        () => setCurrentScreen(SCREENS.PROFILE),
        <InviteScreen
          user={user}
          onBack={() => setCurrentScreen(SCREENS.PROFILE)}
        />
      );

    case SCREENS.ADMIN_APPLICATIONS:
      return withSwipeBack(
        () => setCurrentScreen(SCREENS.PROFILE),
        <AdminApplicationsScreen user={user} onNavigate={navigate} />
      );

    case SCREENS.BRAND_GIGS_PORTAL:
      return withSwipeBack(
        () => setCurrentScreen(SCREENS.ADMIN_APPLICATIONS),
        <BrandGigsPortal
          user={user}
          onBack={() => setCurrentScreen(SCREENS.ADMIN_APPLICATIONS)}
        />
      );

    case SCREENS.ABOUT:
      return withSwipeBack(
        () => setCurrentScreen(SCREENS.OPPORTUNITIES),
        <AboutScreen onBack={() => setCurrentScreen(SCREENS.OPPORTUNITIES)} />
      );

    case SCREENS.TERMS:
      return withSwipeBack(
        () => setCurrentScreen(SCREENS.SETTINGS),
        <TermsOfServiceScreen
          onBack={() => setCurrentScreen(SCREENS.SETTINGS)}
        />
      );

    case SCREENS.PRIVACY:
      return withSwipeBack(
        () => setCurrentScreen(SCREENS.SETTINGS),
        <PrivacyPolicyScreen
          onBack={() => setCurrentScreen(SCREENS.SETTINGS)}
        />
      );

    case SCREENS.HELP:
      return withSwipeBack(
        () => setCurrentScreen(SCREENS.SETTINGS),
        <HelpCenterScreen
          onBack={() => setCurrentScreen(SCREENS.SETTINGS)}
          onNavigate={navigate}
        />
      );

    case SCREENS.HELP_CHAT:
      return withSwipeBack(
        () => setCurrentScreen(SCREENS.HELP),
        <HelpChatScreen
          user={user}
          onBack={() => setCurrentScreen(SCREENS.HELP)}
        />
      );

    case SCREENS.TUTORIAL_MODE:
      return withSwipeBack(
        () => setCurrentScreen(SCREENS.SETTINGS),
        <TutorialModeScreen
          onBack={() => setCurrentScreen(SCREENS.SETTINGS)}
        />
      );

    case SCREENS.LISTEN:
      return <ListenScreen {...listenScreenProps} />;

    case SCREENS.TRENDING_MIXES:
      return withSwipeBack(
        () => setCurrentScreen(SCREENS.LISTEN),
        <TrendingMixesScreen
          globalAudioState={globalAudioState}
          onPlayAudio={playGlobalAudio}
          onPauseAudio={pauseGlobalAudio}
          onResumeAudio={resumeGlobalAudio}
          onBack={() => setCurrentScreen(SCREENS.LISTEN)}
          onAddToQueue={addToQueue}
          onPlayNext={playNextTrack}
        />
      );

    case SCREENS.YOUR_LIKES:
      return withSwipeBack(
        () => setCurrentScreen(SCREENS.LISTEN),
        <YourLikesScreen
          globalAudioState={globalAudioState}
          onPlayAudio={playGlobalAudio}
          onPauseAudio={pauseGlobalAudio}
          onResumeAudio={resumeGlobalAudio}
          onBack={() => setCurrentScreen(SCREENS.LISTEN)}
          user={user}
          onAddToQueue={addToQueue}
          onPlayNext={playNextTrack}
        />
      );

    case SCREENS.PLAYLIST_DETAIL:
      return withSwipeBack(
        () => setCurrentScreen(SCREENS.LISTEN),
        <PlaylistDetailScreen
          globalAudioState={globalAudioState}
          onPlayAudio={playGlobalAudio}
          onPauseAudio={pauseGlobalAudio}
          onResumeAudio={resumeGlobalAudio}
          onBack={() => setCurrentScreen(SCREENS.LISTEN)}
          user={user}
          onAddToQueue={addToQueue}
          onPlayNext={playNextTrack}
          playlistId={screenParams.playlistId}
          playlistName={screenParams.playlistName}
        />
      );

    default:
      return <ListenScreen {...listenScreenProps} />;
  }
}
