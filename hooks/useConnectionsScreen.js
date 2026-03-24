/**
 * Orchestrates Connections screen: composes data/actions hooks, bootstrap, and prop bundles.
 * Navigation lives here + actions — {@link useConnectionsModalState} is modal-only (no onNavigate).
 */
import { useState, useCallback } from "react";
import { useDiscoverData, useDiscoverRenderItem } from "./useDiscoverData";
import { useConnectionsData } from "./useConnectionsData";
import { useConnectionsActions } from "./useConnectionsActions";
import { useConnectionsModalState } from "./useConnectionsModalState";
import { useConnectionsScreenSearch } from "./useConnectionsScreenSearch";
import { useConnectionsInitialLoad } from "./useConnectionsInitialLoad";
import { useConnectionSectionRenderer } from "./useConnectionSectionRenderer";
import { useConnectionsScreenPropBundles } from "./useConnectionsScreenPropBundles";
import { useConnectionsTabChange } from "./useConnectionsTabChange";
import { CONNECTIONS_SCREEN_TABS } from "../lib/connectionsScreenTabIds";

export function useConnectionsScreen(propUser, onNavigate, route, initialTab) {
  const [activeTab, setActiveTab] = useState(initialTab);

  const {
    searchQuery,
    searchSuggestions,
    showSuggestions,
    isSearching,
    searchError,
    onSearchChange,
    clearSearch,
    selectSuggestion,
  } = useConnectionsScreenSearch();

  const {
    modalActions,
    modalState,
    handleCloseConnectionModal,
    showConnectionModal,
    connectionMessage,
    connectionModalType,
    connectionModalPrimaryText,
    connectionModalSecondaryText,
  } = useConnectionsModalState();

  const discoverData = useDiscoverData(propUser, searchQuery);

  const connectionsData = useConnectionsData(
    propUser,
    activeTab,
    searchQuery,
    discoverData.loadDiscoverDJs,
    discoverData.loadNearbyDJs,
    modalActions,
    onNavigate
  );

  const actions = useConnectionsActions(
    connectionsData,
    discoverData,
    modalActions,
    modalState,
    onNavigate,
    route
  );

  useConnectionsInitialLoad({
    userId: propUser?.id,
    connectionsData,
    discoverData,
  });

  const renderConnectionSectionItem = useConnectionSectionRenderer({
    communityMessages: connectionsData.communityMessages,
    communityUnreadCounts: connectionsData.communityUnreadCounts,
    getLastMessageSender: connectionsData.getLastMessageSender,
    getLastMessageContent: connectionsData.getLastMessageContent,
    getLastMessageTime: connectionsData.getLastMessageTime,
    handleGroupChatPress: actions.handleGroupChatPress,
    handleConnectionPress: actions.handleConnectionPress,
    handleOpenConnectionOptions: actions.handleOpenConnectionOptions,
  });
  const renderDiscoverItem = useDiscoverRenderItem(discoverData, actions);

  const handleTabChange = useConnectionsTabChange({
    setActiveTab,
    discoverFadeAnim: discoverData.discoverFadeAnim,
    discoverUsers: discoverData.discoverUsers,
    loadDiscoverDJs: discoverData.loadDiscoverDJs,
    connectionsFadeAnim: connectionsData.connectionsFadeAnim,
  });

  const handleSelectSearchSuggestion = useCallback(
    (suggestion) => {
      selectSuggestion(suggestion);
      onNavigate?.("user-profile", {
        userId: suggestion.id,
        djName: suggestion.name,
      });
    },
    [onNavigate, selectSuggestion]
  );

  const onGoToDiscover = useCallback(
    () => handleTabChange(CONNECTIONS_SCREEN_TABS.DISCOVER),
    [handleTabChange]
  );

  const {
    headerProps,
    connectionsTabProps,
    discoverTabProps,
    connectionModalProps,
    locationModalProps,
  } = useConnectionsScreenPropBundles({
    activeTab,
    onTabChange: handleTabChange,
    onGoToDiscover,
    searchQuery,
    onSearchChange,
    searchSuggestions,
    showSuggestions,
    isSearching,
    searchError,
    onClearSearch: clearSearch,
    onSelectSearchSuggestion: handleSelectSearchSuggestion,
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
  });

  const screenResult = {
    activeTab,
    headerProps,
    connectionsTabProps,
    discoverTabProps,
    connectionModalProps,
    locationModalProps,
  };

  if (__DEV__) {
    screenResult._debug = {
      searchQuery,
      activeTab,
      connectionsCount: connectionsData.connections?.length ?? 0,
    };
  }

  return screenResult;
}
