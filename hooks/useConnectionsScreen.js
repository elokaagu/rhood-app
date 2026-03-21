/**
 * Thin orchestrator for Connections screen: search/tab/modal state + sub-hooks + mount/search effects + render builders.
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { Animated } from "react-native";
import { supabase } from "../lib/supabase";
import { useDiscoverData, useDiscoverRenderItem } from "./useDiscoverData";
import { useConnectionsData } from "./useConnectionsData";
import { useConnectionsActions } from "./useConnectionsActions";
import { normalizeConnectionStatus } from "../lib/connectionStatusUtils";
import { formatMessageTime, getUserName } from "../lib/connectionListUtils";
import ConnectionListItem from "../components/ConnectionListItem";
import CommunityListItem from "../components/CommunityListItem";
import styles from "../components/ConnectionsScreen.styles";

export function useConnectionsScreen(propUser, onNavigate, route, initialTab) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef(null);
  const [activeTab, setActiveTab] = useState(initialTab);

  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState("");
  const [connectionModalType, setConnectionModalType] = useState("success");
  const [connectionModalPrimaryText, setConnectionModalPrimaryText] = useState("OK");
  const [connectionModalPrimaryAction, setConnectionModalPrimaryAction] = useState(null);
  const [connectionModalSecondaryText, setConnectionModalSecondaryText] = useState(null);
  const [connectionModalSecondaryAction, setConnectionModalSecondaryAction] = useState(null);
  const [selectedConnection, setSelectedConnection] = useState(null);

  const handleCloseConnectionModal = useCallback(() => {
    setShowConnectionModal(false);
    setConnectionModalPrimaryAction(null);
    setConnectionModalPrimaryText("OK");
    setConnectionModalSecondaryText(null);
    setConnectionModalSecondaryAction(null);
    setSelectedConnection(null);
  }, []);

  const modalCtx = {
    setConnectionMessage,
    setConnectionModalType,
    setConnectionModalPrimaryText,
    setConnectionModalPrimaryAction,
    setShowConnectionModal,
    handleCloseConnectionModal,
    onNavigate,
  };

  const modalState = {
    showConnectionModal,
    setShowConnectionModal,
    connectionMessage,
    setConnectionMessage,
    connectionModalType,
    setConnectionModalType,
    connectionModalPrimaryText,
    setConnectionModalPrimaryText,
    connectionModalPrimaryAction,
    setConnectionModalPrimaryAction,
    connectionModalSecondaryText,
    setConnectionModalSecondaryText,
    connectionModalSecondaryAction,
    setConnectionModalSecondaryAction,
    handleCloseConnectionModal,
    setSelectedConnection,
  };

  const discoverData = useDiscoverData(propUser, searchQuery);
  const discoverLoaders = {
    loadDiscoverDJs: discoverData.loadDiscoverDJs,
    loadNearbyDJs: discoverData.loadNearbyDJs,
  };
  const connectionsData = useConnectionsData(propUser, activeTab, searchQuery, discoverLoaders, modalCtx);
  const actions = useConnectionsActions(connectionsData, discoverData, modalState, onNavigate, route);

  useEffect(() => {
    const initializeData = async () => {
      const userId = propUser?.id;
      // If we have cached connections from a recent visit (< 60s), show them immediately and skip refetch.
      if (userId && connectionsData.hydrateFromCacheIfAvailable(userId)) {
        discoverData.loadDiscoverDJs().catch(() => {});
        discoverData.loadPopularDJs().catch(() => {});
        discoverData.loadNearbyDJs().catch(() => {});
        discoverData.loadNearbyOpportunities().catch(() => {});
        return;
      }
      const connectionsPromise = connectionsData.loadUserAndConnections({ showLoader: true, deferLoadingEnd: true }).then(async () => {
        await connectionsData.checkRhoodMembership();
        connectionsData.setLoading(false);
        connectionsData.setHasLoadedConnections(true);
        connectionsData.lastLoadedAtRef.current = Date.now();
        Animated.timing(connectionsData.connectionsFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      });
      await Promise.all([
        connectionsPromise,
        discoverData.loadDiscoverDJs(),
        discoverData.loadPopularDJs(),
        discoverData.loadNearbyDJs(),
        discoverData.loadNearbyOpportunities(),
      ]);
    };
    initializeData();
  }, []);

  const fetchSearchSuggestions = useCallback(async (query) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, dj_name, full_name, username, city, profile_image_url")
        .or(`dj_name.ilike.%${trimmedQuery}%,full_name.ilike.%${trimmedQuery}%,username.ilike.%${trimmedQuery}%,city.ilike.%${trimmedQuery}%`)
        .not("dj_name", "is", null)
        .limit(8);
      if (error) {
        setSearchSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      setSearchSuggestions(
        (data || []).map((user) => ({
          id: user.id,
          name: user.dj_name || user.full_name || user.username || "DJ",
          city: user.city || null,
          profileImage: user.profile_image_url || null,
        }))
      );
      setShowSuggestions(true);
    } catch (e) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => fetchSearchSuggestions(trimmedQuery), 300);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, fetchSearchSuggestions]);

  const renderConnectionSectionItem = useCallback(
    ({ item, section, index }) => {
      if (section.key === "communities") {
        const community = item;
        const latestMessage = connectionsData.communityMessages?.[community.id];
        const unreadCount = connectionsData.communityUnreadCounts?.[community.id] || 0;
        const isRhood = community.id === "550e8400-e29b-41d4-a716-446655440000";
        return (
          <CommunityListItem
            community={community}
            latestMessage={latestMessage}
            unreadCount={unreadCount}
            isRhood={isRhood}
            onPress={actions.handleGroupChatPress}
            formatMessageTime={formatMessageTime}
            styles={styles}
          />
        );
      }
      return (
        <ConnectionListItem
          connection={item}
          index={index}
          onPress={actions.handleConnectionPress}
          onLongPress={item.isConnected ? () => actions.handleOpenConnectionOptions(item) : undefined}
          getUserName={getUserName}
          getLastMessageSender={connectionsData.getLastMessageSender}
          getLastMessageContent={connectionsData.getLastMessageContent}
          getLastMessageTime={connectionsData.getLastMessageTime}
          styles={styles}
        />
      );
    },
    [
      connectionsData.communityMessages,
      connectionsData.communityUnreadCounts,
      connectionsData.getLastMessageSender,
      connectionsData.getLastMessageContent,
      connectionsData.getLastMessageTime,
      actions.handleGroupChatPress,
      actions.handleConnectionPress,
      actions.handleOpenConnectionOptions,
    ]
  );

  const renderDiscoverItem = useDiscoverRenderItem(discoverData, actions);

  return {
    user: connectionsData.user,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    searchSuggestions,
    setSearchSuggestions,
    showSuggestions,
    setShowSuggestions,
    connectionsFadeAnim: connectionsData.connectionsFadeAnim,
    discoverFadeAnim: discoverData.discoverFadeAnim,
    discoverUsers: discoverData.discoverUsers,
    loadDiscoverDJs: discoverData.loadDiscoverDJs,
    loading: connectionsData.loading,
    hasLoadedConnections: connectionsData.hasLoadedConnections,
    connectionsLoadError: connectionsData.connectionsLoadError,
    connections: connectionsData.connections,
    connectionSections: connectionsData.connectionSections,
    refreshControl: connectionsData.refreshControl,
    handleConnectionsRetry: actions.handleConnectionsRetry,
    handleBrowseCommunity: actions.handleBrowseCommunity,
    renderConnectionSectionItem,
    getConnectionListItemLayout: connectionsData.getConnectionListItemLayout,
    filteredDiscoverUsers: discoverData.filteredDiscoverUsers,
    discoverLoading: discoverData.discoverLoading,
    discoverLoadError: discoverData.discoverLoadError,
    handleDiscoverRetry: actions.handleDiscoverRetry,
    renderDiscoverItem,
    getDiscoverItemLayout: discoverData.getDiscoverItemLayout,
    popularDJs: discoverData.popularDJs,
    popularDJsLoading: discoverData.popularDJsLoading,
    nearbyDJs: discoverData.nearbyDJs,
    nearbyDJsLoading: discoverData.nearbyDJsLoading,
    nearbyOpportunities: discoverData.nearbyOpportunities,
    nearbyOpportunitiesLoading: discoverData.nearbyOpportunitiesLoading,
    handleOpenLocationModal: actions.handleOpenLocationModal,
    incomingConnectionRequests: connectionsData.incomingConnectionRequests,
    acceptingUserId: actions.acceptingUserId,
    decliningUserId: actions.decliningUserId,
    handleAcceptPendingConnection: actions.handleAcceptPendingConnection,
    handleDeclinePendingConnection: actions.handleDeclinePendingConnection,
    showConnectionModal,
    handleCloseConnectionModal,
    connectionMessage,
    connectionModalType,
    connectionModalPrimaryText,
    handleConnectionModalPrimaryPress: actions.handleConnectionModalPrimaryPress,
    connectionModalSecondaryText,
    handleConnectionModalSecondaryPress: actions.handleConnectionModalSecondaryPress,
    showLocationModal: actions.showLocationModal,
    setShowLocationModal: actions.setShowLocationModal,
    newLocationCity: actions.newLocationCity,
    setNewLocationCity: actions.setNewLocationCity,
    updatingLocation: actions.updatingLocation,
    handleUpdateLocation: actions.handleUpdateLocation,
    handleUseCurrentLocation: actions.handleUseCurrentLocation,
  };
}
