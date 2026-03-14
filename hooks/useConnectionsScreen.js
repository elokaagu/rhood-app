/**
 * All Connections screen state, effects, loaders, handlers, and derived list data.
 * Keeps ConnectionsScreen.js under half its original size.
 */
import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Animated, Alert, RefreshControl } from "react-native";
import { supabase, db } from "../lib/supabase";
import { HapticPatterns } from "../lib/haptics";
import { LIST_PERFORMANCE } from "../lib/performanceConstants";
import {
  normalizeConnectionStatus,
  isAcceptedConnectionStatus,
  isPendingConnectionStatus,
} from "../lib/connectionStatusUtils";
import { formatMessageTime, getUserName } from "../lib/connectionListUtils";
import { loadUserAndConnectionsImpl, loadUserCommunitiesImpl } from "../lib/connectionsScreenLoaders";
import {
  loadPopularDJsImpl,
  loadNearbyDJsImpl,
  loadNearbyOpportunitiesImpl,
  loadDiscoverDJsImpl,
} from "../lib/discoverLoaders";
import ConnectionListItem from "../components/ConnectionListItem";
import CommunityListItem from "../components/CommunityListItem";
import DiscoverUserCard from "../components/DiscoverUserCard";
import styles from "../components/ConnectionsScreen.styles";

export function useConnectionsScreen(propUser, onNavigate, route, initialTab) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  // Safely initialize user state - ensure it's always an object
  const [user, setUser] = useState(() => {
    if (!propUser || typeof propUser !== 'object' || Array.isArray(propUser)) {
      return null;
    }
    return propUser;
  });
  const [activeTab, setActiveTab] = useState(initialTab); // 'connections' or 'discover'
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverUsers, setDiscoverUsers] = useState([]);
  const [popularDJs, setPopularDJs] = useState([]);
  const [popularDJsLoading, setPopularDJsLoading] = useState(false);
  const [nearbyDJs, setNearbyDJs] = useState([]);
  const [nearbyDJsLoading, setNearbyDJsLoading] = useState(false);
  const [nearbyOpportunities, setNearbyOpportunities] = useState([]);
  const [nearbyOpportunitiesLoading, setNearbyOpportunitiesLoading] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newLocationCity, setNewLocationCity] = useState("");
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [connectionsFadeAnim] = useState(new Animated.Value(1)); // Start visible for smooth rendering
  const [discoverFadeAnim] = useState(new Animated.Value(1)); // Start visible for smooth rendering
  const [hasLoadedConnections, setHasLoadedConnections] = useState(false);
  const hasLoadedMessagesRef = useRef(false);
  const [connectionMessage, setConnectionMessage] = useState("");
  const [connectionModalType, setConnectionModalType] = useState("success");
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connectionModalPrimaryText, setConnectionModalPrimaryText] =
    useState("OK");
  const [connectionModalPrimaryAction, setConnectionModalPrimaryAction] =
    useState(null);
  const [connectionModalSecondaryText, setConnectionModalSecondaryText] =
    useState(null);
  const [connectionModalSecondaryAction, setConnectionModalSecondaryAction] =
    useState(null);
  const [lastMessages, setLastMessages] = useState({});
  const [communitiesData, setCommunitiesData] = useState({
    userCommunities: [],
    communityMessages: {},
    communityUnreadCounts: {},
    rhoodGroupData: null,
    isRhoodMember: false,
    rhoodMemberCount: 0,
    latestGroupMessage: null,
    unreadGroupCount: 0,
  });
  const userCommunities = communitiesData.userCommunities;
  const communityMessages = communitiesData.communityMessages;
  const communityUnreadCounts = communitiesData.communityUnreadCounts;
  const rhoodGroupData = communitiesData.rhoodGroupData;
  const isRhoodMember = communitiesData.isRhoodMember;
  const rhoodMemberCount = communitiesData.rhoodMemberCount;
  const latestGroupMessage = communitiesData.latestGroupMessage;
  const unreadGroupCount = communitiesData.unreadGroupCount;
  const [cancellingConnectionId, setCancellingConnectionId] = useState(null);
  const [acceptingUserId, setAcceptingUserId] = useState(null);
  const [decliningUserId, setDecliningUserId] = useState(null);
  const [isDeletingConnectionId, setIsDeletingConnectionId] = useState(null);
  const prevConnectionStatusesRef = useRef(new Map());
  const lastLoadedAtRef = useRef(0);
  // When we mount with initialTab "connections", only initializeData should load; tab effect must not run its load or we get double loadUserCommunities and flicker.
  const mountedWithConnectionsTabRef = useRef(initialTab === "connections");
  const STALE_MS = 60 * 1000; // Don't full-reload if data is under 1 min old
  const PERIODIC_REFRESH_INTERVAL_MS = 30 * 1000; // Softer than 10s (audit §8)
  const REALTIME_DEBOUNCE_MS = 600; // Debounce connection-update handler
  const [connectionsLoadError, setConnectionsLoadError] = useState(null);
  const [discoverLoadError, setDiscoverLoadError] = useState(null);
  const realtimeDebounceRef = useRef(null);

  const handleCloseConnectionModal = useCallback(() => {
    setShowConnectionModal(false);
    setConnectionModalPrimaryAction(null);
    setConnectionModalPrimaryText("OK");
    setConnectionModalSecondaryText(null);
    setConnectionModalSecondaryAction(null);
    setSelectedConnection(null);
  }, []);

  const handleConnectionModalPrimaryPress = useCallback(() => {
    if (connectionModalPrimaryAction) {
      connectionModalPrimaryAction();
    } else {
      handleCloseConnectionModal();
    }
  }, [connectionModalPrimaryAction, handleCloseConnectionModal]);

  const handleConnectionModalSecondaryPress = useCallback(() => {
    if (connectionModalSecondaryAction) {
      connectionModalSecondaryAction();
    } else {
      handleCloseConnectionModal();
    }
  }, [connectionModalSecondaryAction, handleCloseConnectionModal]);

  // Discover loaders context (updated each render so async loaders see latest state)
  const discoverCtxRef = useRef({});
  discoverCtxRef.current = {
    setDiscoverUsers,
    setDiscoverLoading,
    setDiscoverLoadError,
    setPopularDJs,
    setPopularDJsLoading,
    setNearbyDJs,
    setNearbyDJsLoading,
    setNearbyOpportunities,
    setNearbyOpportunitiesLoading,
    discoverFadeAnim,
  };

  // Context for loaders (updated each render so async loaders see latest state)
  const connectionsLoaderCtxRef = useRef({});
  connectionsLoaderCtxRef.current = {
    setConnectionsLoadError,
    setLoading,
    setHasLoadedConnections,
    setUser,
    setConnections,
    setLastMessages,
    setConnectionMessage,
    setConnectionModalType,
    setConnectionModalPrimaryText,
    setConnectionModalPrimaryAction,
    setShowConnectionModal,
    hasLoadedMessagesRef,
    prevConnectionStatusesRef,
    lastLoadedAtRef,
    connectionsFadeAnim,
    propUser,
    onNavigate,
    handleCloseConnectionModal,
    hasLoadedConnections,
    setCommunitiesData,
    user,
  };

  // Update user state when prop changes - ensure it's always valid
  useEffect(() => {
    if (propUser && typeof propUser === 'object' && !Array.isArray(propUser) && propUser !== user) {
      setUser(propUser);
    } else if (!propUser || typeof propUser !== 'object' || Array.isArray(propUser)) {
      // If propUser becomes invalid, don't update state
      console.warn('ConnectionsScreen: propUser became invalid, keeping current user state');
    }
  }, [propUser, user]);

  const loadPopularDJs = useCallback(() => loadPopularDJsImpl(discoverCtxRef.current), []);

  const loadNearbyOpportunities = useCallback(() => loadNearbyOpportunitiesImpl(discoverCtxRef.current), []);

  // Update user's location
  const handleUpdateLocation = async () => {
    if (!newLocationCity.trim() || !user?.id) return;

    try {
      setUpdatingLocation(true);
      await db.updateUserProfile(user.id, { city: newLocationCity.trim() });

      // Update local user state
      setUser((prev) => ({
        ...prev,
        city: newLocationCity.trim(),
      }));

      // Reload nearby DJs and opportunities with new location
      await Promise.all([loadNearbyDJs(), loadNearbyOpportunities()]);

      setShowLocationModal(false);
      setNewLocationCity("");
      HapticPatterns.success();
      Alert.alert("Success", "Location updated successfully!");
    } catch (error) {
      console.error("❌ Error updating location:", error);
      Alert.alert("Error", "Failed to update location. Please try again.");
    } finally {
      setUpdatingLocation(false);
    }
  };

  // Get current location and update city
  const handleUseCurrentLocation = async () => {
    try {
      const { getCurrentLocation, reverseGeocode } = await import(
        "../lib/locationService"
      );

      const location = await getCurrentLocation();
      if (!location) {
        Alert.alert(
          "Location Unavailable",
          "Could not get your current location. Please enter your city manually."
        );
        return;
      }

      const city = await reverseGeocode(location.latitude, location.longitude);
      if (city) {
        setNewLocationCity(city);
      } else {
        Alert.alert(
          "Location Unavailable",
          "Could not determine your city. Please enter it manually."
        );
      }
    } catch (error) {
      console.error("❌ Error getting current location:", error);
      Alert.alert(
        "Error",
        "Failed to get your location. Please enter your city manually."
      );
    }
  };

  const loadNearbyDJs = useCallback(() => loadNearbyDJsImpl(discoverCtxRef.current), []);

  // Load nearby opportunities when user or city changes
  useEffect(() => {
    if (user?.id) {
      loadNearbyOpportunities();
    }
  }, [user?.id, user?.city]);

  // Run all loads in parallel; Connections tab shows list only after connections + communities (no flicker)
  useEffect(() => {
    const initializeData = async () => {
      const connectionsPromise = loadUserAndConnections({
        showLoader: true,
        deferLoadingEnd: true,
      }).then(async () => {
        await checkRhoodMembership();
        setLoading(false);
        setHasLoadedConnections(true);
        lastLoadedAtRef.current = Date.now();
        Animated.timing(connectionsFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
      await Promise.all([
        connectionsPromise,
        loadDiscoverDJs(),
        loadPopularDJs(),
        loadNearbyDJs(),
        loadNearbyOpportunities(),
      ]);
    };
    initializeData();
  }, []);

  // Load data when Messages tab becomes active — only if missing or stale. Defer loading end until connections + communities so list doesn't flicker.
  // When we mounted with initialTab "connections", skip this load so only initializeData runs (avoids double loadUserCommunities and flicker).
  useEffect(() => {
    if (activeTab !== "connections" || !user?.id) return;
    const isStale = Date.now() - lastLoadedAtRef.current > STALE_MS;
    if (!hasLoadedConnections) {
      if (mountedWithConnectionsTabRef.current) {
        mountedWithConnectionsTabRef.current = false;
        return; // Let mount effect (initializeData) own the first load
      }
      const run = async () => {
        setLoading(true);
        await loadUserAndConnections({ showLoader: true, deferLoadingEnd: true });
        await loadUserCommunities();
        setLoading(false);
        setHasLoadedConnections(true);
        lastLoadedAtRef.current = Date.now();
        Animated.timing(connectionsFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      };
      run();
    } else if (isStale) {
      loadUserAndConnections({ showLoader: false });
      loadUserCommunities();
    }
  }, [activeTab, user?.id, hasLoadedConnections]);

  const loadUserAndConnections = useCallback((opts) => loadUserAndConnectionsImpl(connectionsLoaderCtxRef.current, opts), []);

  const loadUserCommunities = useCallback(() => loadUserCommunitiesImpl(connectionsLoaderCtxRef.current), []);

  const handleRefresh = async () => {
    HapticPatterns.pullToRefresh();
    setRefreshing(true);
    await Promise.all([
      loadUserAndConnections(),
      loadUserCommunities(),
    ]);
    setRefreshing(false);
  };

  // Load messages once when connections are first loaded
  useEffect(() => {
    const loadMessages = async () => {
      // Only load if we have connections, user, and haven't loaded messages yet
      // Also check that connections have actually been loaded (hasLoadedConnections)
      if (user?.id && connections.length > 0 && hasLoadedConnections && !hasLoadedMessagesRef.current) {
        hasLoadedMessagesRef.current = true;
        await loadLastMessagesForConnections(user.id, connections);
      }
    };

    loadMessages();
  }, [user?.id, connections.length, hasLoadedConnections]);

  // Set up real-time subscription for messages to keep chat list updated
  useEffect(() => {
    if (!user?.id || !hasLoadedConnections || connections.length === 0) return;

    // Subscribe to all messages for the current user
    const channel = supabase
      .channel("messages-list-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          // Merge new message into lastMessages instead of full refetch (avoids list flicker)
          if (user?.id && connections.length > 0 && hasLoadedMessagesRef.current && payload?.new) {
            const msg = payload.new;
            const senderId = msg.sender_id;
            if (!senderId) return;
            setLastMessages((prev) => ({
              ...prev,
              [senderId]: {
                content: msg.content ?? "",
                timestamp: msg.created_at,
                senderId: msg.sender_id,
                senderName: msg.sender?.dj_name || msg.sender?.full_name || "DJ",
                messageType: msg.message_type || "text",
              },
            }));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "community_posts",
        },
        (payload) => {
          // Check if user is part of the R/HOOD group
          if (
            payload.new.community_id === "550e8400-e29b-41d4-a716-446655440000"
          ) {
            checkRhoodMembership();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, connections.length, hasLoadedConnections]);

  // Periodic refresh (softer interval) - only after initial load
  useEffect(() => {
    if (!user?.id || connections.length === 0 || !hasLoadedMessagesRef.current) return;

    const refreshInterval = setInterval(() => {
      loadLastMessagesForConnections(user.id, connections);
    }, PERIODIC_REFRESH_INTERVAL_MS);

    return () => clearInterval(refreshInterval);
  }, [user?.id, connections.length]);

  // Listen for connection status changes to keep UI in sync
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`connections-updates-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connections",
        },
        (payload) => {
          const involvesUser =
            payload.new?.user_id_1 === user.id ||
            payload.new?.user_id_2 === user.id ||
            payload.old?.user_id_1 === user.id ||
            payload.old?.user_id_2 === user.id;

          if (involvesUser) {
            if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
            realtimeDebounceRef.current = setTimeout(() => {
              realtimeDebounceRef.current = null;
              loadUserAndConnections({ showLoader: false });
              loadDiscoverDJs();
              loadNearbyDJs();
            }, REALTIME_DEBOUNCE_MS);
          }
        }
      )
      .subscribe();

    return () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const checkRhoodMembership = async () => {
    // This function is kept for backward compatibility but now uses loadUserCommunities
    await loadUserCommunities();
  };

  const handleJoinRhoodGroup = async () => {
    try {
      if (!user?.id) {
        Alert.alert("Error", "Please log in to join the R/HOOD Group");
        return;
      }

      const rhoodCommunityId = "550e8400-e29b-41d4-a716-446655440000";

      // Join the community
      await db.joinCommunity(rhoodCommunityId, user.id);

      // Reload communities to update the list
      await loadUserCommunities();

      Alert.alert(
        "Welcome to R/HOOD Group!",
        "You've successfully joined the main R/HOOD community chat. Start connecting with fellow DJs!",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error joining R/HOOD group:", error);
      Alert.alert("Error", "Failed to join R/HOOD Group. Please try again.");
    }
  };

  const handleGroupChatPress = (communityId = null) => {
    const targetCommunityId = communityId || "550e8400-e29b-41d4-a716-446655440000";
    const community = userCommunities.find((c) => c.id === targetCommunityId);
    
    if (community) {
      onNavigate &&
        onNavigate("messages", {
          communityId: targetCommunityId,
          chatType: "group",
        });
    } else if (!communityId) {
      // Only show join prompt for R/HOOD if not a member
      handleJoinRhoodGroup();
    }
  };

  const handleConnectionPress = (connection) => {
    HapticPatterns.buttonPress();
    // Check if we're in share mode
    const routeParams = route?.params || {};
    if (routeParams.shareMode && routeParams.onShareSelect) {
      // Handle sharing opportunity to this connection
      routeParams.onShareSelect(connection.id);
      return;
    }

    const payload = {
      isGroupChat: false,
      djId: connection.id,
    };

    if (connection.threadId) {
      payload.threadId = connection.threadId;
    }
    if (connection.connectionId) {
      payload.connectionId = connection.connectionId;
    }

    onNavigate &&
      onNavigate("messages", {
        ...payload,
        returnToConnectionsTab: "connections",
      });
  };

  const handleBrowseCommunity = () => {
    onNavigate && onNavigate("community");
  };

  const handleConnectionsRetry = useCallback(() => {
    setConnectionsLoadError(null);
    loadUserAndConnections({ showLoader: true });
  }, [loadUserAndConnections]);

  const handleViewProfile = async (connection) => {
    HapticPatterns.itemPress();
    try {
      // Navigate to profile view
      if (onNavigate) {
        onNavigate("user-profile", { userId: connection.id });
      }
    } catch (error) {
      console.error("Error viewing profile:", error);
      Alert.alert("Error", "Failed to open profile");
    }
  };

  const handleConnect = async (connection) => {
    HapticPatterns.buttonPress();
    try {
      setDiscoverLoading(true);

      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        Alert.alert("Error", "Please log in to connect with users");
        return;
      }

      // Create real connection request using new schema
      const connectionResult = await db.createConnection(connection.id);

      // Get the display name with better fallbacks
      const displayName =
        connection?.dj_name ||
        connection?.full_name ||
        `${connection?.first_name || ""} ${
          connection?.last_name || ""
        }`.trim() ||
        "this user";

      // Check if this was a new connection or existing one
      const isExistingConnection =
        connectionResult.status === "pending" && connectionResult.id;

      if (isExistingConnection) {
        setConnectionMessage(
          `Connection request sent to ${displayName}. They'll be notified and can accept your request.`
        );
        setConnectionModalType("success");
        setConnectionModalPrimaryText("OK");
        setConnectionModalPrimaryAction(null);
        setShowConnectionModal(true);

        // Update the user's connection status in the local state
        setDiscoverUsers((prev) =>
          prev.map((user) =>
            user.id === connection.id
              ? {
                  ...user,
                  isConnected: false,
                  connectionStatus: "pending",
                  connectionStatusRaw: "pending",
                  connectionId:
                    connectionResult?.id ||
                    connectionResult?.connection_id ||
                    user.connectionId ||
                    null,
                }
              : user
          )
        );
        await loadUserAndConnections({ showLoader: false });
      } else {
        setConnectionMessage(`You're already connected to ${displayName}`);
        setConnectionModalType("info");
        setConnectionModalPrimaryText("OK");
        setConnectionModalPrimaryAction(
          () =>
            () => {
              handleConnectionPress({
                id: connection.id,
                connectionId:
                  connectionResult?.id ||
                  connectionResult?.connection_id ||
                  connection.connectionId ||
                  null,
                threadId: connection.threadId || null,
              });
              handleCloseConnectionModal();
            }
        );
        setShowConnectionModal(true);
      }
    } catch (error) {
      console.error("Error sending connection request:", error);
      setConnectionMessage("Failed to send connection request");
      setConnectionModalType("error");
      setConnectionModalPrimaryText("OK");
      setConnectionModalPrimaryAction(null);
      setShowConnectionModal(true);
    } finally {
      setDiscoverLoading(false);
    }
  };

  const resolveConnectionId = async (target) => {
    if (target?.connectionId) return target.connectionId;
    if (!user?.id || !target?.id) return null;

    try {
      const connectionRecord = await db.getConnectionStatus(user.id, target.id);
      if (connectionRecord) {
        return (
          connectionRecord.id ||
          connectionRecord.connection_id ||
          connectionRecord.connectionId ||
          null
        );
      }
    } catch (error) {
      console.warn("resolveConnectionId failed:", error);
    }

    return null;
  };

  const handleDeleteConnection = useCallback(
    async (connection) => {
      if (!connection) return;

      try {
        HapticPatterns.delete();
        const deletionKey = connection.connectionId || connection.id;
        setIsDeletingConnectionId(deletionKey);
        setConnectionModalPrimaryText("Removing...");
        setConnectionModalPrimaryAction(() => () => {});

        const resolvedConnectionId =
          connection.connectionId || (await resolveConnectionId(connection));

        if (!resolvedConnectionId) {
          setConnectionModalType("error");
          setConnectionMessage(
            "We couldn't find this connection. Please refresh and try again."
          );
          setConnectionModalPrimaryText("Close");
          setConnectionModalPrimaryAction(null);
          setConnectionModalSecondaryText(null);
          setConnectionModalSecondaryAction(null);
          return;
        }

        await db.deleteConnection(resolvedConnectionId);

        setConnections((prev) =>
          prev.filter((item) => item.id !== connection.id)
        );
        setDiscoverUsers((prev) =>
          prev.map((userItem) =>
            userItem.id === connection.id
              ? {
                  ...userItem,
                  isConnected: false,
                  connectionStatus: null,
                  connectionStatusRaw: null,
                  connectionId: null,
                  threadId: null,
                }
              : userItem
          )
        );
        setLastMessages((prev) => {
          const updated = { ...prev };
          delete updated[connection.id];
          return updated;
        });
        prevConnectionStatusesRef.current.delete(connection.id);

        // Reload nearby DJs since this user is now available again
        await loadNearbyDJs();

        const displayName = getUserName(connection);
        setConnectionModalType("success");
        setConnectionMessage(
          `${displayName} has been removed from your connections.`
        );
        setConnectionModalPrimaryText("OK");
        setConnectionModalPrimaryAction(null);
        setConnectionModalSecondaryText(null);
        setConnectionModalSecondaryAction(null);
        setSelectedConnection(null);
      } catch (error) {
        console.error("Error removing connection:", error);
        setConnectionModalType("error");
        setConnectionMessage(
          "Failed to remove this connection. Please try again."
        );
        setConnectionModalPrimaryText("Close");
        setConnectionModalPrimaryAction(null);
        setConnectionModalSecondaryText(null);
        setConnectionModalSecondaryAction(null);
      } finally {
        setIsDeletingConnectionId(null);
      }
    },
    [
      resolveConnectionId,
      setConnections,
      setDiscoverUsers,
      setLastMessages,
      getUserName,
    ]
  );

  const handleOpenConnectionOptions = useCallback(
    (connection) => {
      if (!connection) return;

      HapticPatterns.buttonPress();
      setSelectedConnection(connection);
      const displayName = getUserName(connection);

      setConnectionMessage(
        `Remove ${displayName} from your connections? You can reconnect anytime by sending a new request.`
      );
      setConnectionModalType("warning");
      setConnectionModalPrimaryText("Remove Connection");
      setConnectionModalPrimaryAction(
        () =>
          () => {
            handleDeleteConnection(connection);
          }
      );
      setConnectionModalSecondaryText("Keep Connection");
      setConnectionModalSecondaryAction(() => () => {
        handleCloseConnectionModal();
      });
      setShowConnectionModal(true);
    },
    [getUserName, handleDeleteConnection, handleCloseConnectionModal]
  );

  const performCancelPendingConnection = async (connection, connectionId, displayName) => {
    try {
      setCancellingConnectionId(connectionId || connection.id);
      await db.cancelConnectionRequest(connectionId);

      setDiscoverUsers((prev) =>
        prev.map((userItem) =>
          userItem.id === connection.id
            ? {
                ...userItem,
                isConnected: false,
                connectionStatus: null,
                connectionStatusRaw: null,
                connectionId: null,
              }
            : userItem
        )
      );

      setConnections((prev) =>
        prev.map((item) =>
          item.id === connection.id
            ? {
                ...item,
                connectionStatus: null,
                connectionStatusRaw: null,
                connectionId: null,
              }
            : item
        )
      );

      await loadUserAndConnections({ showLoader: false });

      setConnectionMessage(
        `Connection request to ${displayName} has been cancelled.`
      );
      setConnectionModalType("info");
      setConnectionModalPrimaryText("OK");
      setConnectionModalPrimaryAction(null);
      setShowConnectionModal(true);
    } catch (error) {
      console.error("Error cancelling connection request:", error);
      Alert.alert(
        "Error",
        `Failed to cancel connection request: ${error.message || "Unknown error"}`
      );
    } finally {
      setCancellingConnectionId(null);
    }
  };

  const handleCancelPendingConnection = (connection) => {
    if (!connection) return;

    const displayName =
      connection?.dj_name ||
      connection?.full_name ||
      `${connection?.first_name || ""} ${
        connection?.last_name || ""
      }`.trim() ||
      "this DJ";

    Alert.alert(
      "Cancel Connection Request?",
      `Do you want to cancel your pending connection request to ${displayName}?`,
      [
        {
          text: "Keep Pending",
          style: "cancel",
        },
        {
          text: "Cancel Request",
          style: "destructive",
          onPress: async () => {
            try {
              const connectionId = await resolveConnectionId(connection);
              if (!connectionId) {
                Alert.alert(
                  "Error",
                  "We couldn't find the pending request to cancel. Please try again."
                );
                return;
              }
              await performCancelPendingConnection(
                connection,
                connectionId,
                displayName
              );
            } catch (error) {
              console.error("Error resolving connection for cancellation:", error);
              Alert.alert(
                "Error",
                `Failed to cancel connection request: ${
                  error.message || "Unknown error"
                }`
              );
            }
          },
        },
      ]
    );
  };

  const handleAcceptPendingConnection = async (connection) => {
    if (!connection) return;

    const displayName =
      connection?.name ||
      connection?.dj_name ||
      connection?.full_name ||
      `${connection?.first_name || ""} ${connection?.last_name || ""}`.trim() ||
      "this DJ";

    try {
      const connectionId =
        connection.connectionId ||
        connection.connection_id ||
        (await resolveConnectionId(connection));

      if (!connectionId) {
        Alert.alert(
          "Error",
          "We couldn't find this connection request. Please try again."
        );
        return;
      }

      setAcceptingUserId(connection.id);
      await db.acceptConnection(connectionId);

      await loadUserAndConnections({ showLoader: false });
      await loadDiscoverDJs();
      await loadNearbyDJs();
    } catch (error) {
      console.error("Error accepting connection request:", error);
      Alert.alert(
        "Error",
        `Failed to accept connection request: ${error.message || "Unknown error"}`
      );
    } finally {
      setAcceptingUserId(null);
    }
  };

  const handleDeclinePendingConnection = async (connection) => {
    if (!connection) return;

    const displayName =
      connection?.name ||
      connection?.dj_name ||
      connection?.full_name ||
      `${connection?.first_name || ""} ${connection?.last_name || ""}`.trim() ||
      "this DJ";

    try {
      const connectionId =
        connection.connectionId ||
        connection.connection_id ||
        (await resolveConnectionId(connection));

      if (!connectionId) {
        Alert.alert(
          "Error",
          "We couldn't find this connection request to decline. Please try again."
        );
        return;
      }

      setDecliningUserId(connection.id);
      await db.declineConnection(connectionId);

      await loadUserAndConnections({ showLoader: false });
      await loadDiscoverDJs();
      await loadNearbyDJs();

      setConnectionMessage(
        `Connection request from ${displayName} has been declined.`
      );
      setConnectionModalType("info");
      setConnectionModalPrimaryText("OK");
      setConnectionModalPrimaryAction(null);
      setShowConnectionModal(true);
    } catch (error) {
      console.error("Error declining connection request:", error);
      Alert.alert(
        "Error",
        `Failed to decline connection request: ${
          error.message || "Unknown error"
        }`
      );
    } finally {
      setDecliningUserId(null);
    }
  };

  const loadDiscoverDJs = useCallback(() => loadDiscoverDJsImpl(discoverCtxRef.current), []);

  // Filter connections based on search query
  const filteredConnections = useMemo(() => {
    let filtered = connections.filter((connection) => {
      const normalizedStatus = normalizeConnectionStatus(
        connection.connectionStatus || connection.connectionStatusRaw
      );

      if (!normalizedStatus) return true;

      return (
        isAcceptedConnectionStatus(normalizedStatus) ||
        isPendingConnectionStatus(normalizedStatus)
      );
    });

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (connection) => {
          // Search in all relevant fields
          const searchableFields = [
            connection.name,
            connection.dj_name,
            connection.full_name,
            connection.username,
            connection.location,
            connection.city,
            connection.statusMessage,
          ].filter(Boolean);
          
          const matchesName = searchableFields.some((field) => 
            field.toLowerCase().includes(query)
          );
          
          const matchesGenre = connection.genres?.some((genre) => 
            genre.toLowerCase().includes(query)
          );
          
          return matchesName || matchesGenre;
        }
      );
    }

    return filtered;
  }, [connections, searchQuery]);

  // Fetch search suggestions from database
  const fetchSearchSuggestions = useCallback(async (query) => {
    const trimmedQuery = query.trim();
    
    if (!trimmedQuery || trimmedQuery.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      // Search for DJs by name, username, or city
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, dj_name, full_name, username, city, profile_image_url")
        .or(`dj_name.ilike.%${trimmedQuery}%,full_name.ilike.%${trimmedQuery}%,username.ilike.%${trimmedQuery}%,city.ilike.%${trimmedQuery}%`)
        .not("dj_name", "is", null)
        .limit(8);

      if (error) {
        console.error("Error fetching search suggestions:", error);
        setSearchSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      if (!data || data.length === 0) {
        setSearchSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      // Format suggestions
      const suggestions = data.map((user) => ({
        id: user.id,
        name: user.dj_name || user.full_name || user.username || "DJ",
        city: user.city || null,
        profileImage: user.profile_image_url || null,
      }));

      setSearchSuggestions(suggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Error in fetchSearchSuggestions:", error);
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  // Debounced search suggestions
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchSearchSuggestions(trimmedQuery);
      }, 300);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, fetchSearchSuggestions]);

  const filteredDiscoverUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return discoverUsers;
    }
    const query = searchQuery.toLowerCase().trim();
    return discoverUsers.filter(
      (user) => {
        // Search in all relevant fields
        const searchableFields = [
          user.name,
          user.dj_name,
          user.username,
          user.location,
          user.city,
          user.statusMessage,
        ].filter(Boolean);
        
        const matchesName = searchableFields.some((field) => 
          field.toLowerCase().includes(query)
        );
        
        const matchesGenre = user.genres?.some((genre) => 
          genre.toLowerCase().includes(query)
        );
        
        return matchesName || matchesGenre;
      }
    );
  }, [discoverUsers, searchQuery]);

  const loadLastMessagesForConnections = async (userId) => {
    try {
      const lastMessagesData = await db.getLastMessagesForAllConnections(
        userId
      );
      setLastMessages(lastMessagesData);
    } catch (error) {
      console.error("❌ Error loading last messages:", error);
      setLastMessages({});
    }
  };

  const getLastMessageContent = (connection) => {
    const lastMessage = lastMessages[connection.id];
    if (!lastMessage) return "No messages yet";

    // Format the message content based on type - always return a string
    if (lastMessage.messageType === "image") {
      return "📷 Photo";
    } else if (lastMessage.messageType === "video") {
      return "🎥 Video";
    } else if (lastMessage.messageType === "audio") {
      return "🎵 Audio";
    } else if (lastMessage.messageType === "file") {
      return "📎 File";
    } else {
      return String(lastMessage.content || "No messages yet");
    }
  };

  const getLastMessageTime = (connection) => {
    const lastMessage = lastMessages[connection.id];
    if (!lastMessage || !lastMessage.timestamp) return "";

    const formatted = formatMessageTime(lastMessage.timestamp);
    return formatted || "";
  };

  const getLastMessageSender = (connection) => {
    const lastMessage = lastMessages[connection.id];
    if (!lastMessage) return "";

    // Show sender name if it's not the current user - always return a string
    if (lastMessage.senderId !== user?.id) {
      const senderName = String(lastMessage.senderName || "");
      return senderName ? `${senderName}: ` : "";
    }
    return "You: ";
  };

  // Filter out connections with no messages
  const connectionsWithMessages = useMemo(() => {
    return filteredConnections.filter((connection) => {
      const lastMessage = lastMessages[connection.id];
      // Show if there's a message (text or media)
      return (
        lastMessage &&
        (lastMessage.content ||
          lastMessage.messageType === "image" ||
          lastMessage.messageType === "video" ||
          lastMessage.messageType === "audio" ||
          lastMessage.messageType === "file")
      );
    });
  }, [filteredConnections, lastMessages]);

  const incomingConnectionRequests = useMemo(() => {
    if (!user?.id) return [];
    return filteredConnections.filter(
      (connection) =>
        isPendingConnectionStatus(connection.connectionStatus) &&
        connection.connectionInitiatedBy &&
        connection.connectionInitiatedBy !== user.id
    );
  }, [filteredConnections, user?.id]);

  // SectionList data for Connections tab (virtualized)
  const connectionSections = useMemo(
    () => [
      {
        key: "communities",
        data: userCommunities || [],
      },
      {
        key: "connections",
        data: connectionsWithMessages || [],
      },
    ],
    [userCommunities, connectionsWithMessages]
  );

  // Section-aware: SectionList calls this per section with (data, index); offset must be global.
  const getConnectionListItemLayout = useCallback(
    (data, index) => {
      const sectionIndex = connectionSections.findIndex((s) => s.data === data);
      const prevLengths = connectionSections
        .slice(0, sectionIndex)
        .reduce((sum, s) => sum + (s.data?.length ?? 0), 0);
      const globalIndex = prevLengths + index;
      const offset = LIST_PERFORMANCE.ESTIMATED_ROW_HEIGHT_MESSAGES * globalIndex;
      return {
        length: LIST_PERFORMANCE.ESTIMATED_ROW_HEIGHT_MESSAGES,
        offset,
        index: globalIndex,
      };
    },
    [connectionSections]
  );

  const getDiscoverItemLayout = useCallback((_, index) => ({
    length: LIST_PERFORMANCE.ESTIMATED_ROW_HEIGHT_DISCOVER,
    offset: LIST_PERFORMANCE.ESTIMATED_ROW_HEIGHT_DISCOVER * index,
    index,
  }), []);

  const renderConnectionSectionItem = useCallback(
    ({ item, section, index }) => {
      if (section.key === "communities") {
        const community = item;
        const latestMessage = communityMessages[community.id];
        const unreadCount = communityUnreadCounts[community.id] || 0;
        const isRhood = community.id === "550e8400-e29b-41d4-a716-446655440000";
        return (
          <CommunityListItem
            community={community}
            latestMessage={latestMessage}
            unreadCount={unreadCount}
            isRhood={isRhood}
            onPress={handleGroupChatPress}
            formatMessageTime={formatMessageTime}
            styles={styles}
          />
        );
      }
      return (
        <ConnectionListItem
          connection={item}
          index={index}
          onPress={handleConnectionPress}
          onLongPress={
            item.isConnected
              ? () => handleOpenConnectionOptions(item)
              : undefined
          }
          getUserName={getUserName}
          getLastMessageSender={getLastMessageSender}
          getLastMessageContent={getLastMessageContent}
          getLastMessageTime={getLastMessageTime}
          styles={styles}
        />
      );
    },
    [
      communityMessages,
      communityUnreadCounts,
      handleGroupChatPress,
      handleConnectionPress,
      handleOpenConnectionOptions,
      getUserName,
      getLastMessageSender,
      getLastMessageContent,
      getLastMessageTime,
    ]
  );

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor="hsl(0, 0%, 100%)"
      colors={["hsl(0, 0%, 100%)"]}
    />
  );

  const handleDiscoverRetry = useCallback(() => {
    setDiscoverLoadError(null);
    loadDiscoverDJs();
  }, [loadDiscoverDJs]);

  const handleOpenLocationModal = useCallback(() => {
    setNewLocationCity(user?.city || "");
    setShowLocationModal(true);
  }, [user?.city]);

  const renderDiscoverItem = useCallback(
    ({ item: u, index }) => {
      const normalizedStatus = normalizeConnectionStatus(u.connectionStatus);
      const isPending = normalizedStatus === "pending";
      const pendingKey = u.connectionId || u.id;
      const isCancelling = isPending && pendingKey === cancellingConnectionId;
      return (
        <DiscoverUserCard
          user={u}
          index={index}
          onViewProfile={handleViewProfile}
          onConnectionPress={handleConnectionPress}
          onConnect={handleConnect}
          onCancelPending={handleCancelPendingConnection}
          onLongPress={handleOpenConnectionOptions}
          isPending={isPending}
          isCancelling={isCancelling}
          discoverLoading={discoverLoading}
          styles={styles}
        />
      );
    },
    [
      cancellingConnectionId,
      discoverLoading,
      normalizeConnectionStatus,
      handleViewProfile,
      handleConnectionPress,
      handleConnect,
      handleCancelPendingConnection,
      handleOpenConnectionOptions,
    ]
  );

  return {
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
  };
}
