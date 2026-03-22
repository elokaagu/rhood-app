/**
 * Orchestrates Connections screen: composes data/actions hooks, bootstrap, and prop bundles.
 */
import { useState, useCallback } from "react";
import { Animated } from "react-native";
import { useDiscoverData, useDiscoverRenderItem } from "./useDiscoverData";
import { useConnectionsData } from "./useConnectionsData";
import { useConnectionsActions } from "./useConnectionsActions";
import { useConnectionsModalState } from "./useConnectionsModalState";
import { useConnectionsScreenSearch } from "./useConnectionsScreenSearch";
import { useConnectionsInitialLoad } from "./useConnectionsInitialLoad";
import { useRenderConnectionSectionItem } from "./useRenderConnectionSectionItem";
import { useConnectionsScreenPropBundles } from "./useConnectionsScreenPropBundles";

export function useConnectionsScreen(propUser, onNavigate, route, initialTab) {
  const [activeTab, setActiveTab] = useState(initialTab);

  const {
    searchQuery,
    setSearchQuery,
    searchSuggestions,
    setSearchSuggestions,
    showSuggestions,
    setShowSuggestions,
  } = useConnectionsScreenSearch();

  const { modalCtx, modalState, ...connectionModalFields } =
    useConnectionsModalState(onNavigate);

  const discoverData = useDiscoverData(propUser, searchQuery);
  const discoverLoaders = {
    loadDiscoverDJs: discoverData.loadDiscoverDJs,
    loadNearbyDJs: discoverData.loadNearbyDJs,
  };

  const connectionsData = useConnectionsData(
    propUser,
    activeTab,
    searchQuery,
    discoverLoaders,
    modalCtx
  );

  const actions = useConnectionsActions(
    connectionsData,
    discoverData,
    modalState,
    onNavigate,
    route
  );

  useConnectionsInitialLoad({
    userId: propUser?.id,
    connectionsData,
    discoverData,
  });

  const renderConnectionSectionItem = useRenderConnectionSectionItem(
    connectionsData,
    actions
  );
  const renderDiscoverItem = useDiscoverRenderItem(discoverData, actions);

  const handleTabChange = useCallback(
    (tab) => {
      if (tab === "discover") {
        setActiveTab("discover");
        discoverData.discoverFadeAnim.setValue(0);
        const len = discoverData.discoverUsers?.length ?? 0;
        if (len === 0) {
          discoverData.loadDiscoverDJs();
        } else {
          Animated.timing(discoverData.discoverFadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }
      } else if (tab === "connections") {
        setActiveTab("connections");
        Animated.timing(connectionsData.connectionsFadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
        discoverData.discoverFadeAnim.setValue(0);
      }
    },
    [
      discoverData.discoverFadeAnim,
      discoverData.discoverUsers,
      discoverData.loadDiscoverDJs,
      connectionsData.connectionsFadeAnim,
    ]
  );

  const handleClearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchSuggestions([]);
    setShowSuggestions(false);
  }, [setSearchQuery, setSearchSuggestions, setShowSuggestions]);

  const handleSelectSearchSuggestion = useCallback(
    (suggestion) => {
      setShowSuggestions(false);
      onNavigate?.("user-profile", {
        userId: suggestion.id,
        djName: suggestion.name,
      });
    },
    [onNavigate]
  );

  const onGoToDiscover = useCallback(
    () => handleTabChange("discover"),
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
    onSearchChange: setSearchQuery,
    searchSuggestions,
    showSuggestions,
    onClearSearch: handleClearSearch,
    onSelectSearchSuggestion: handleSelectSearchSuggestion,
    connectionsData,
    discoverData,
    actions,
    renderConnectionSectionItem,
    renderDiscoverItem,
    onNavigate,
    ...connectionModalFields,
  });

  return {
    activeTab,
    headerProps,
    connectionsTabProps,
    discoverTabProps,
    connectionModalProps,
    locationModalProps,
  };
}
