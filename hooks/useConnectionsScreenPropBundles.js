import { useMemo } from "react";

/**
 * Memoized prop objects for ConnectionsScreen presentational children.
 */
export function useConnectionsScreenPropBundles({
  activeTab,
  onTabChange,
  onGoToDiscover,
  onViewFriendsList,
  searchQuery,
  onSearchChange,
  searchSuggestions,
  showSuggestions,
  isSearching,
  searchError,
  onClearSearch,
  onSelectSearchSuggestion,
  connectionsData,
  discoverData,
  actions,
  renderConnectionSectionItem,
  renderDiscoverItem,
  onNavigate,
  showConnectionModal,
  handleCloseConnectionModal,
  connectionMessage,
  connectionModalType,
  connectionModalPrimaryText,
  connectionModalSecondaryText,
}) {
  const headerProps = useMemo(
    () => ({
      activeTab,
      onTabChange,
      searchQuery,
      onSearchChange,
      searchSuggestions,
      showSuggestions,
      isSearching,
      searchError,
      onClearSearch,
      onSelectSearchSuggestion,
    }),
    [
      activeTab,
      onTabChange,
      searchQuery,
      onSearchChange,
      searchSuggestions,
      showSuggestions,
      isSearching,
      searchError,
      onClearSearch,
      onSelectSearchSuggestion,
    ]
  );

  const connectionsTabProps = useMemo(
    () => ({
      loading: connectionsData.loading,
      hasLoadedConnections: connectionsData.hasLoadedConnections,
      connectionsLoadError: connectionsData.connectionsLoadError,
      connectionsLength: connectionsData.connections.length,
      connectionSections: connectionsData.connectionSections,
      refreshControlProps: connectionsData.refreshControlProps,
      onRetry: actions.handleConnectionsRetry,
      onGoToDiscover,
      onViewFriendsList,
      onBrowseCommunities: actions.handleBrowseCommunity,
      renderItem: renderConnectionSectionItem,
      getItemLayout: connectionsData.getConnectionListItemLayout,
      fadeAnim: connectionsData.connectionsFadeAnim,
    }),
    [
      connectionsData.loading,
      connectionsData.hasLoadedConnections,
      connectionsData.connectionsLoadError,
      connectionsData.connections,
      connectionsData.connectionSections,
      connectionsData.refreshControlProps,
      connectionsData.getConnectionListItemLayout,
      connectionsData.connectionsFadeAnim,
      actions.handleConnectionsRetry,
      actions.handleBrowseCommunity,
      onGoToDiscover,
      onViewFriendsList,
      renderConnectionSectionItem,
    ]
  );

  const discoverTabProps = useMemo(
    () => ({
      filteredDiscoverUsers: discoverData.filteredDiscoverUsers,
      discoverLoading: discoverData.discoverLoading,
      discoverLoadError: discoverData.discoverLoadError,
      onDiscoverRetry: actions.handleDiscoverRetry,
      refreshControlProps: connectionsData.refreshControlProps,
      renderItem: renderDiscoverItem,
      getItemLayout: discoverData.getDiscoverItemLayout,
      fadeAnim: discoverData.discoverFadeAnim,
      popularDJs: discoverData.popularDJs,
      popularDJsLoading: discoverData.popularDJsLoading,
      nearbyDJs: discoverData.nearbyDJs,
      nearbyDJsLoading: discoverData.nearbyDJsLoading,
      nearbyOpportunities: discoverData.nearbyOpportunities,
      nearbyOpportunitiesLoading: discoverData.nearbyOpportunitiesLoading,
      searchQuery,
      onNavigate,
      onOpenLocationModal: actions.handleOpenLocationModal,
      incomingConnectionRequests: connectionsData.incomingConnectionRequests,
      acceptingUserId: actions.acceptingUserId,
      decliningUserId: actions.decliningUserId,
      onAcceptRequest: actions.handleAcceptPendingConnection,
      onDeclineRequest: actions.handleDeclinePendingConnection,
    }),
    [
      discoverData.filteredDiscoverUsers,
      discoverData.discoverLoading,
      discoverData.discoverLoadError,
      discoverData.discoverFadeAnim,
      discoverData.popularDJs,
      discoverData.popularDJsLoading,
      discoverData.nearbyDJs,
      discoverData.nearbyDJsLoading,
      discoverData.nearbyOpportunities,
      discoverData.nearbyOpportunitiesLoading,
      discoverData.getDiscoverItemLayout,
      connectionsData.refreshControlProps,
      connectionsData.incomingConnectionRequests,
      searchQuery,
      renderDiscoverItem,
      actions.handleDiscoverRetry,
      actions.handleOpenLocationModal,
      actions.acceptingUserId,
      actions.decliningUserId,
      actions.handleAcceptPendingConnection,
      actions.handleDeclinePendingConnection,
      onNavigate,
    ]
  );

  const connectionModalProps = useMemo(
    () => ({
      visible: showConnectionModal,
      onClose: handleCloseConnectionModal,
      title: "Connection Status",
      message: connectionMessage,
      type: connectionModalType,
      primaryButtonText: connectionModalPrimaryText,
      onPrimaryPress: actions.handleConnectionModalPrimaryPress,
      secondaryButtonText: connectionModalSecondaryText,
      onSecondaryPress: actions.handleConnectionModalSecondaryPress,
      showCloseButton: false,
    }),
    [
      showConnectionModal,
      handleCloseConnectionModal,
      connectionMessage,
      connectionModalType,
      connectionModalPrimaryText,
      connectionModalSecondaryText,
      actions.handleConnectionModalPrimaryPress,
      actions.handleConnectionModalSecondaryPress,
    ]
  );

  const locationModalProps = useMemo(
    () => ({
      visible: actions.showLocationModal,
      onClose: () => actions.setShowLocationModal(false),
      newLocationCity: actions.newLocationCity,
      setNewLocationCity: actions.setNewLocationCity,
      updatingLocation: actions.updatingLocation,
      onUpdateLocation: actions.handleUpdateLocation,
      onUseCurrentLocation: actions.handleUseCurrentLocation,
    }),
    [
      actions.showLocationModal,
      actions.setShowLocationModal,
      actions.newLocationCity,
      actions.setNewLocationCity,
      actions.updatingLocation,
      actions.handleUpdateLocation,
      actions.handleUseCurrentLocation,
    ]
  );

  return {
    headerProps,
    connectionsTabProps,
    discoverTabProps,
    connectionModalProps,
    locationModalProps,
  };
}
