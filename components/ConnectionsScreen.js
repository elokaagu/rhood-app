import React from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import RhoodModal from "./RhoodModal";
import ConnectionsTabContent from "./ConnectionsTabContent";
import DiscoverTabContent from "./DiscoverTabContent";
import ConnectionsLocationModal from "./ConnectionsLocationModal";
import ConnectionsScreenHeader from "./ConnectionsScreenHeader";
import AppScreenTutorialModal from "./AppScreenTutorialModal";
import { useConnectionsScreen } from "../hooks/useConnectionsScreen";
import { useAppTutorialModal } from "../hooks/useAppTutorialModal";
import { APP_TUTORIAL_SCREEN_IDS } from "../lib/appTutorialContent";
import { CONNECTIONS_SCREEN_TABS } from "../lib/connectionsScreenTabIds";
import styles from "./ConnectionsScreen.styles";

function isValidConnectionsUser(user) {
  return (
    user != null &&
    typeof user === "object" &&
    !Array.isArray(user) &&
    typeof user !== "string"
  );
}

/**
 * Renders the Connections / Discover experience. Mounted only when `user` is valid
 * so the hook always receives a real profile object (see default export guard).
 */
function ConnectionsScreenContent({
  user,
  onNavigate,
  initialTab = CONNECTIONS_SCREEN_TABS.DISCOVER,
  route = null,
}) {
  const {
    activeTab,
    headerProps,
    connectionsTabProps,
    discoverTabProps,
    connectionModalProps,
    locationModalProps,
    locationSuccessModalProps,
  } = useConnectionsScreen(user, onNavigate, route, initialTab);

  const { tutorialModalProps } = useAppTutorialModal(
    APP_TUTORIAL_SCREEN_IDS.CONNECTIONS
  );

  return (
    <View style={styles.container}>
      <ConnectionsScreenHeader {...headerProps} />

      {activeTab === CONNECTIONS_SCREEN_TABS.CONNECTIONS ? (
        <ConnectionsTabContent {...connectionsTabProps} />
      ) : (
        <DiscoverTabContent {...discoverTabProps} />
      )}

      <LinearGradient
        colors={["transparent", "rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0.8)"]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      <RhoodModal {...connectionModalProps} />
      <ConnectionsLocationModal {...locationModalProps} />
      <RhoodModal {...locationSuccessModalProps} />
      {tutorialModalProps ? (
        <AppScreenTutorialModal {...tutorialModalProps} />
      ) : null}
    </View>
  );
}

/**
 * Validates props once; inner component runs hooks with a guaranteed-valid user.
 */
export default function ConnectionsScreen(props) {
  if (!props || typeof props !== "object") {
    if (__DEV__) {
      console.warn("[ConnectionsScreen] Missing or invalid props object");
    }
    return null;
  }
  if (!isValidConnectionsUser(props.user)) {
    if (__DEV__) {
      console.warn(
        "[ConnectionsScreen] Expected `user` to be a non-array object; got:",
        props.user
      );
    }
    return null;
  }
  return <ConnectionsScreenContent {...props} />;
}
