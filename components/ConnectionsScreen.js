import React from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import RhoodModal from "./RhoodModal";
import ConnectionsTabContent from "./ConnectionsTabContent";
import DiscoverTabContent from "./DiscoverTabContent";
import ConnectionsLocationModal from "./ConnectionsLocationModal";
import ConnectionsScreenHeader from "./ConnectionsScreenHeader";
import { useConnectionsScreen } from "../hooks/useConnectionsScreen";
import styles from "./ConnectionsScreen.styles";

function ConnectionsScreenComponent({
  user: propUser,
  onNavigate,
  initialTab = "discover",
  route = null,
}) {
  if (typeof propUser === "string" || !propUser || typeof propUser !== "object" || propUser === null || Array.isArray(propUser)) {
    if (propUser === null || !propUser) return null;
    if (typeof propUser === "string") console.warn("ConnectionsScreen: user prop is a string, expected object");
    return null;
  }

  const screen = useConnectionsScreen(propUser, onNavigate, route, initialTab);
  if (!screen.user || typeof screen.user !== "object" || Array.isArray(screen.user)) {
    return null;
  }

  const {
    user,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    searchSuggestions,
    setSearchSuggestions,
    showSuggestions,
    setShowSuggestions,
    connectionsFadeAnim,
    discoverFadeAnim,
    discoverUsers,
    loadDiscoverDJs,
    loading,
    hasLoadedConnections,
    connectionsLoadError,
    connections,
    connectionSections,
    refreshControl,
    handleConnectionsRetry,
    handleBrowseCommunity,
    renderConnectionSectionItem,
    getConnectionListItemLayout,
    filteredDiscoverUsers,
    discoverLoading,
    discoverLoadError,
    handleDiscoverRetry,
    renderDiscoverItem,
    getDiscoverItemLayout,
    popularDJs,
    nearbyDJs,
    nearbyOpportunities,
    handleOpenLocationModal,
    incomingConnectionRequests,
    acceptingUserId,
    decliningUserId,
    handleAcceptPendingConnection,
    handleDeclinePendingConnection,
    showConnectionModal,
    handleCloseConnectionModal,
    connectionMessage,
    connectionModalType,
    connectionModalPrimaryText,
    handleConnectionModalPrimaryPress,
    connectionModalSecondaryText,
    handleConnectionModalSecondaryPress,
    showLocationModal,
    setShowLocationModal,
    newLocationCity,
    setNewLocationCity,
    updatingLocation,
    handleUpdateLocation,
    handleUseCurrentLocation,
  } = screen;

  return (
    <View style={styles.container}>
      <ConnectionsScreenHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchSuggestions={searchSuggestions}
        setSearchSuggestions={setSearchSuggestions}
        setShowSuggestions={setShowSuggestions}
        showSuggestions={showSuggestions}
        connectionsFadeAnim={connectionsFadeAnim}
        discoverFadeAnim={discoverFadeAnim}
        discoverUsersLength={discoverUsers.length}
        loadDiscoverDJs={loadDiscoverDJs}
        onNavigate={onNavigate}
      />
        {/* Content: virtualized list per tab */}
        {activeTab === "connections" ? (
          <ConnectionsTabContent
            loading={loading}
            hasLoadedConnections={hasLoadedConnections}
            connectionsLoadError={connectionsLoadError}
            connectionsLength={connections.length}
            connectionSections={connectionSections}
            refreshControl={refreshControl}
            onRetry={handleConnectionsRetry}
            onBrowseCommunity={handleBrowseCommunity}
            renderItem={renderConnectionSectionItem}
            getItemLayout={getConnectionListItemLayout}
            fadeAnim={connectionsFadeAnim}
          />
        ) : (
          <DiscoverTabContent
            filteredDiscoverUsers={filteredDiscoverUsers}
            discoverLoading={discoverLoading}
            discoverLoadError={discoverLoadError}
            onDiscoverRetry={handleDiscoverRetry}
            refreshControl={refreshControl}
            renderItem={renderDiscoverItem}
            getItemLayout={getDiscoverItemLayout}
            fadeAnim={discoverFadeAnim}
            popularDJs={popularDJs}
            nearbyDJs={nearbyDJs}
            nearbyOpportunities={nearbyOpportunities}
            searchQuery={searchQuery}
            userCity={user?.city}
            onNavigate={onNavigate}
            onOpenLocationModal={handleOpenLocationModal}
            incomingConnectionRequests={incomingConnectionRequests}
            acceptingUserId={acceptingUserId}
            decliningUserId={decliningUserId}
            onAcceptRequest={handleAcceptPendingConnection}
            onDeclineRequest={handleDeclinePendingConnection}
          />
        )}

      {/* Bottom gradient fade overlay */}
      <LinearGradient
        colors={["transparent", "rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0.8)"]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      {/* Connection Status Modal */}
      <RhoodModal
        visible={showConnectionModal}
        onClose={handleCloseConnectionModal}
        title="Connection Status"
        message={connectionMessage}
        type={connectionModalType}
        primaryButtonText={connectionModalPrimaryText}
        onPrimaryPress={handleConnectionModalPrimaryPress}
        secondaryButtonText={connectionModalSecondaryText}
        onSecondaryPress={handleConnectionModalSecondaryPress}
        showCloseButton={false}
      />

      <ConnectionsLocationModal
        visible={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        newLocationCity={newLocationCity}
        setNewLocationCity={setNewLocationCity}
        updatingLocation={updatingLocation}
        onUpdateLocation={handleUpdateLocation}
        onUseCurrentLocation={handleUseCurrentLocation}
      />
    </View>
  );
}

// Export with validation wrapper to catch prop issues
const ConnectionsScreenWrapper = (props) => {
  // Validate props before rendering
  if (!props || typeof props !== 'object') {
    console.warn('ConnectionsScreen: Invalid props object');
    return null;
  }
  
  // Ensure user prop is valid - check for string first (common mistake)
  if (typeof props.user === 'string') {
    console.warn('ConnectionsScreen: user prop is a string, expected object');
    return null;
  }
  
  if (!props.user || typeof props.user !== 'object' || props.user === null || Array.isArray(props.user)) {
    console.warn('ConnectionsScreen: user prop is missing or invalid');
    return null;
  }
  
  return <ConnectionsScreenComponent {...props} />;
};

export default ConnectionsScreenWrapper;

