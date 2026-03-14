/**
 * Connection and discover action handlers + location modal state.
 */
import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { supabase, db } from "../lib/supabase";
import { HapticPatterns } from "../lib/haptics";
import { getUserName } from "../lib/connectionListUtils";

export function useConnectionsActions(connectionsData, discoverData, modalState, onNavigate, route) {
  const {
    setConnectionMessage,
    setConnectionModalType,
    setConnectionModalPrimaryText,
    setConnectionModalPrimaryAction,
    setShowConnectionModal,
    setConnectionModalSecondaryText,
    setConnectionModalSecondaryAction,
    handleCloseConnectionModal,
    setSelectedConnection,
  } = modalState;

  const [cancellingConnectionId, setCancellingConnectionId] = useState(null);
  const [acceptingUserId, setAcceptingUserId] = useState(null);
  const [decliningUserId, setDecliningUserId] = useState(null);
  const [isDeletingConnectionId, setIsDeletingConnectionId] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newLocationCity, setNewLocationCity] = useState("");
  const [updatingLocation, setUpdatingLocation] = useState(false);

  const user = connectionsData?.user;
  const setConnections = connectionsData?.setConnections;
  const setLastMessages = connectionsData?.setLastMessages;
  const setDiscoverUsers = discoverData?.setDiscoverUsers;
  const setDiscoverLoading = discoverData?.setDiscoverLoading;
  const loadUserAndConnections = connectionsData?.loadUserAndConnections;
  const loadUserCommunities = connectionsData?.loadUserCommunities;
  const loadDiscoverDJs = discoverData?.loadDiscoverDJs;
  const loadNearbyDJs = discoverData?.loadNearbyDJs;
  const loadNearbyOpportunities = discoverData?.loadNearbyOpportunities;
  const prevConnectionStatusesRef = connectionsData?.prevConnectionStatusesRef;
  const userCommunities = connectionsData?.userCommunities;

  const resolveConnectionId = useCallback(
    async (target) => {
      if (target?.connectionId) return target.connectionId;
      if (!user?.id || !target?.id) return null;
      try {
        const connectionRecord = await db.getConnectionStatus(user.id, target.id);
        return connectionRecord?.id || connectionRecord?.connection_id || connectionRecord?.connectionId || null;
      } catch (e) {
        console.warn("resolveConnectionId failed:", e);
        return null;
      }
    },
    [user?.id]
  );

  const handleConnectionModalPrimaryPress = useCallback(() => {
    const fn = modalState.connectionModalPrimaryAction;
    if (fn) {
      const inner = typeof fn === "function" ? fn() : fn;
      if (typeof inner === "function") inner();
    } else handleCloseConnectionModal();
  }, [modalState.connectionModalPrimaryAction, handleCloseConnectionModal]);

  const handleConnectionModalSecondaryPress = useCallback(() => {
    const fn = modalState.connectionModalSecondaryAction;
    if (fn) {
      const inner = typeof fn === "function" ? fn() : fn;
      if (typeof inner === "function") inner();
    } else handleCloseConnectionModal();
  }, [modalState.connectionModalSecondaryAction, handleCloseConnectionModal]);

  const handleGroupChatPress = useCallback(
    (communityId = null) => {
      const targetCommunityId = communityId || "550e8400-e29b-41d4-a716-446655440000";
      const community = userCommunities?.find((c) => c.id === targetCommunityId);
      if (community) {
        onNavigate?.("messages", { communityId: targetCommunityId, chatType: "group" });
      } else if (!communityId) {
        handleJoinRhoodGroup();
      }
    },
    [userCommunities, onNavigate]
  );

  const handleJoinRhoodGroup = useCallback(async () => {
    try {
      if (!user?.id) {
        Alert.alert("Error", "Please log in to join the R/HOOD Group");
        return;
      }
      const rhoodCommunityId = "550e8400-e29b-41d4-a716-446655440000";
      await db.joinCommunity(rhoodCommunityId, user.id);
      await loadUserCommunities?.();
      Alert.alert("Welcome to R/HOOD Group!", "You've successfully joined the main R/HOOD community chat. Start connecting with fellow DJs!", [{ text: "OK" }]);
    } catch (error) {
      console.error("Error joining R/HOOD group:", error);
      Alert.alert("Error", "Failed to join R/HOOD Group. Please try again.");
    }
  }, [user?.id, loadUserCommunities]);

  const handleConnectionPress = useCallback(
    (connection) => {
      HapticPatterns.buttonPress();
      const routeParams = route?.params || {};
      if (routeParams.shareMode && routeParams.onShareSelect) {
        routeParams.onShareSelect(connection.id);
        return;
      }
      const payload = { isGroupChat: false, djId: connection.id, returnToConnectionsTab: "connections" };
      if (connection.threadId) payload.threadId = connection.threadId;
      if (connection.connectionId) payload.connectionId = connection.connectionId;
      onNavigate?.("messages", payload);
    },
    [onNavigate, route?.params]
  );

  const handleBrowseCommunity = useCallback(() => onNavigate?.("community"), [onNavigate]);

  const handleConnectionsRetry = useCallback(() => {
    connectionsData?.setConnectionsLoadError?.(null);
    loadUserAndConnections?.({ showLoader: true });
  }, [loadUserAndConnections, connectionsData]);

  const handleViewProfile = useCallback(
    (connection) => {
      HapticPatterns.itemPress();
      try {
        onNavigate?.("user-profile", { userId: connection.id });
      } catch (e) {
        console.error("Error viewing profile:", e);
        Alert.alert("Error", "Failed to open profile");
      }
    },
    [onNavigate]
  );

  const handleConnect = useCallback(
    async (connection) => {
      HapticPatterns.buttonPress();
      try {
        setDiscoverLoading?.(true);
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) {
          Alert.alert("Error", "Please log in to connect with users");
          return;
        }
        const connectionResult = await db.createConnection(connection.id);
        const displayName = connection?.dj_name || connection?.full_name || `${connection?.first_name || ""} ${connection?.last_name || ""}`.trim() || "this user";
        const isExistingConnection = connectionResult?.status === "pending" && connectionResult?.id;
        if (isExistingConnection) {
          setConnectionMessage(`Connection request sent to ${displayName}. They'll be notified and can accept your request.`);
          setConnectionModalType("success");
          setConnectionModalPrimaryText("OK");
          setConnectionModalPrimaryAction(null);
          setShowConnectionModal(true);
          setDiscoverUsers?.((prev) =>
            prev.map((u) =>
              u.id === connection.id
                ? { ...u, isConnected: false, connectionStatus: "pending", connectionStatusRaw: "pending", connectionId: connectionResult?.id || connectionResult?.connection_id || u.connectionId || null }
                : u
            )
          );
          await loadUserAndConnections?.({ showLoader: false });
        } else {
          setConnectionMessage(`You're already connected to ${displayName}`);
          setConnectionModalType("info");
          setConnectionModalPrimaryText("OK");
          setConnectionModalPrimaryAction(() => () => {
            handleConnectionPress({ id: connection.id, connectionId: connectionResult?.id || connectionResult?.connection_id || connection.connectionId || null, threadId: connection.threadId || null });
            handleCloseConnectionModal();
          });
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
        setDiscoverLoading?.(false);
      }
    },
    [
      setDiscoverLoading,
      setDiscoverUsers,
      setConnectionMessage,
      setConnectionModalType,
      setConnectionModalPrimaryText,
      setConnectionModalPrimaryAction,
      setShowConnectionModal,
      handleCloseConnectionModal,
      loadUserAndConnections,
      handleConnectionPress,
    ]
  );

  const handleDeleteConnection = useCallback(
    async (connection) => {
      if (!connection) return;
      try {
        HapticPatterns.delete();
        const deletionKey = connection.connectionId || connection.id;
        setIsDeletingConnectionId(deletionKey);
        setConnectionModalPrimaryText("Removing...");
        setConnectionModalPrimaryAction(() => () => {});

        const resolvedConnectionId = connection.connectionId || (await resolveConnectionId(connection));
        if (!resolvedConnectionId) {
          setConnectionModalType("error");
          setConnectionMessage("We couldn't find this connection. Please refresh and try again.");
          setConnectionModalPrimaryText("Close");
          setConnectionModalPrimaryAction(null);
          setConnectionModalSecondaryText(null);
          setConnectionModalSecondaryAction(null);
          return;
        }

        await db.deleteConnection(resolvedConnectionId);
        setConnections?.((prev) => prev.filter((item) => item.id !== connection.id));
        setDiscoverUsers?.((prev) =>
          prev.map((userItem) =>
            userItem.id === connection.id ? { ...userItem, isConnected: false, connectionStatus: null, connectionStatusRaw: null, connectionId: null, threadId: null } : userItem
          )
        );
        setLastMessages?.((prev) => {
          const updated = { ...prev };
          delete updated[connection.id];
          return updated;
        });
        prevConnectionStatusesRef?.current?.delete(connection.id);
        await loadNearbyDJs?.();

        const displayName = getUserName(connection);
        setConnectionModalType("success");
        setConnectionMessage(`${displayName} has been removed from your connections.`);
        setConnectionModalPrimaryText("OK");
        setConnectionModalPrimaryAction(null);
        setConnectionModalSecondaryText(null);
        setConnectionModalSecondaryAction(null);
        setSelectedConnection?.(null);
      } catch (error) {
        console.error("Error removing connection:", error);
        setConnectionModalType("error");
        setConnectionMessage("Failed to remove this connection. Please try again.");
        setConnectionModalPrimaryText("Close");
        setConnectionModalPrimaryAction(null);
        setConnectionModalSecondaryText(null);
        setConnectionModalSecondaryAction(null);
      } finally {
        setIsDeletingConnectionId(null);
      }
    },
    [
      setConnections,
      setDiscoverUsers,
      setLastMessages,
      setConnectionMessage,
      setConnectionModalType,
      setConnectionModalPrimaryText,
      setConnectionModalPrimaryAction,
      setConnectionModalSecondaryText,
      setConnectionModalSecondaryAction,
      setSelectedConnection,
      prevConnectionStatusesRef,
      loadNearbyDJs,
      resolveConnectionId,
    ]
  );

  const handleOpenConnectionOptions = useCallback(
    (connection) => {
      if (!connection) return;
      HapticPatterns.buttonPress();
      setSelectedConnection?.(connection);
      const displayName = getUserName(connection);
      setConnectionMessage(`Remove ${displayName} from your connections? You can reconnect anytime by sending a new request.`);
      setConnectionModalType("warning");
      setConnectionModalPrimaryText("Remove Connection");
      setConnectionModalPrimaryAction(() => () => handleDeleteConnection(connection));
      setConnectionModalSecondaryText("Keep Connection");
      setConnectionModalSecondaryAction(() => () => handleCloseConnectionModal());
      setShowConnectionModal(true);
    },
    [getUserName, handleDeleteConnection, handleCloseConnectionModal, setSelectedConnection, setConnectionMessage, setConnectionModalType, setConnectionModalPrimaryText, setConnectionModalPrimaryAction, setConnectionModalSecondaryText, setConnectionModalSecondaryAction, setShowConnectionModal]
  );

  const performCancelPendingConnection = useCallback(
    async (connection, connectionId, displayName) => {
      try {
        setCancellingConnectionId(connectionId || connection.id);
        await db.cancelConnectionRequest(connectionId);
        setDiscoverUsers?.((prev) =>
          prev.map((userItem) =>
            userItem.id === connection.id ? { ...userItem, isConnected: false, connectionStatus: null, connectionStatusRaw: null, connectionId: null } : userItem
          )
        );
        setConnections?.((prev) =>
          prev.map((item) => (item.id === connection.id ? { ...item, connectionStatus: null, connectionStatusRaw: null, connectionId: null } : item))
        );
        await loadUserAndConnections?.({ showLoader: false });
        setConnectionMessage(`Connection request to ${displayName} has been cancelled.`);
        setConnectionModalType("info");
        setConnectionModalPrimaryText("OK");
        setConnectionModalPrimaryAction(null);
        setShowConnectionModal(true);
      } catch (error) {
        console.error("Error cancelling connection request:", error);
        Alert.alert("Error", `Failed to cancel connection request: ${error?.message || "Unknown error"}`);
      } finally {
        setCancellingConnectionId(null);
      }
    },
    [setDiscoverUsers, setConnections, setConnectionMessage, setConnectionModalType, setConnectionModalPrimaryText, setConnectionModalPrimaryAction, setShowConnectionModal, loadUserAndConnections]
  );

  const handleCancelPendingConnection = useCallback(
    (connection) => {
      if (!connection) return;
      const displayName = connection?.dj_name || connection?.full_name || `${connection?.first_name || ""} ${connection?.last_name || ""}`.trim() || "this DJ";
      Alert.alert("Cancel Connection Request?", `Do you want to cancel your pending connection request to ${displayName}?`, [
        { text: "Keep Pending", style: "cancel" },
        {
          text: "Cancel Request",
          style: "destructive",
          onPress: async () => {
            try {
              const connectionId = await resolveConnectionId(connection);
              if (!connectionId) {
                Alert.alert("Error", "We couldn't find the pending request to cancel. Please try again.");
                return;
              }
              await performCancelPendingConnection(connection, connectionId, displayName);
            } catch (error) {
              console.error("Error resolving connection for cancellation:", error);
              Alert.alert("Error", `Failed to cancel connection request: ${error?.message || "Unknown error"}`);
            }
          },
        },
      ]);
    },
    [resolveConnectionId, performCancelPendingConnection]
  );

  const handleAcceptPendingConnection = useCallback(
    async (connection) => {
      if (!connection) return;
      const displayName = connection?.name || connection?.dj_name || connection?.full_name || `${connection?.first_name || ""} ${connection?.last_name || ""}`.trim() || "this DJ";
      try {
        const connectionId = connection.connectionId || connection.connection_id || (await resolveConnectionId(connection));
        if (!connectionId) {
          Alert.alert("Error", "We couldn't find this connection request. Please try again.");
          return;
        }
        setAcceptingUserId(connection.id);
        await db.acceptConnection(connectionId);
        await loadUserAndConnections?.({ showLoader: false });
        await loadDiscoverDJs?.();
        await loadNearbyDJs?.();
      } catch (error) {
        console.error("Error accepting connection request:", error);
        Alert.alert("Error", `Failed to accept connection request: ${error?.message || "Unknown error"}`);
      } finally {
        setAcceptingUserId(null);
      }
    },
    [resolveConnectionId, loadUserAndConnections, loadDiscoverDJs, loadNearbyDJs]
  );

  const handleDeclinePendingConnection = useCallback(
    async (connection) => {
      if (!connection) return;
      const displayName = connection?.name || connection?.dj_name || connection?.full_name || `${connection?.first_name || ""} ${connection?.last_name || ""}`.trim() || "this DJ";
      try {
        const connectionId = connection.connectionId || connection.connection_id || (await resolveConnectionId(connection));
        if (!connectionId) {
          Alert.alert("Error", "We couldn't find this connection request to decline. Please try again.");
          return;
        }
        setDecliningUserId(connection.id);
        await db.declineConnection(connectionId);
        await loadUserAndConnections?.({ showLoader: false });
        await loadDiscoverDJs?.();
        await loadNearbyDJs?.();
        setConnectionMessage(`Connection request from ${displayName} has been declined.`);
        setConnectionModalType("info");
        setConnectionModalPrimaryText("OK");
        setConnectionModalPrimaryAction(null);
        setShowConnectionModal(true);
      } catch (error) {
        console.error("Error declining connection request:", error);
        Alert.alert("Error", `Failed to decline connection request: ${error?.message || "Unknown error"}`);
      } finally {
        setDecliningUserId(null);
      }
    },
    [resolveConnectionId, loadUserAndConnections, loadDiscoverDJs, loadNearbyDJs, setConnectionMessage, setConnectionModalType, setConnectionModalPrimaryText, setConnectionModalPrimaryAction, setShowConnectionModal]
  );

  const handleDiscoverRetry = useCallback(() => {
    discoverData?.setDiscoverLoadError?.(null);
    discoverData?.loadDiscoverDJs?.();
  }, [discoverData]);

  const handleOpenLocationModal = useCallback(() => {
    setNewLocationCity(user?.city || "");
    setShowLocationModal(true);
  }, [user?.city]);

  const handleUpdateLocation = useCallback(async () => {
    if (!newLocationCity?.trim() || !user?.id) return;
    try {
      setUpdatingLocation(true);
      await db.updateUserProfile(user.id, { city: newLocationCity.trim() });
      connectionsData?.setUser?.((prev) => ({ ...prev, city: newLocationCity.trim() }));
      await Promise.all([loadNearbyDJs?.(), loadNearbyOpportunities?.()]);
      setShowLocationModal(false);
      setNewLocationCity("");
      HapticPatterns.success();
      Alert.alert("Success", "Location updated successfully!");
    } catch (error) {
      console.error("Error updating location:", error);
      Alert.alert("Error", "Failed to update location. Please try again.");
    } finally {
      setUpdatingLocation(false);
    }
  }, [newLocationCity, user?.id, connectionsData?.setUser, loadNearbyDJs, loadNearbyOpportunities]);

  const handleUseCurrentLocation = useCallback(async () => {
    try {
      const { getCurrentLocation, reverseGeocode } = await import("../lib/locationService");
      const location = await getCurrentLocation();
      if (!location) {
        Alert.alert("Location Unavailable", "Could not get your current location. Please enter your city manually.");
        return;
      }
      const city = await reverseGeocode(location.latitude, location.longitude);
      if (city) setNewLocationCity(city);
      else Alert.alert("Location Unavailable", "Could not determine your city. Please enter it manually.");
    } catch (error) {
      console.error("Error getting current location:", error);
      Alert.alert("Error", "Failed to get your location. Please enter your city manually.");
    }
  }, []);

  return {
    handleCloseConnectionModal,
    handleConnectionModalPrimaryPress,
    handleConnectionModalSecondaryPress,
    handleGroupChatPress,
    handleConnectionPress,
    handleBrowseCommunity,
    handleConnectionsRetry,
    handleViewProfile,
    handleConnect,
    handleDeleteConnection,
    handleOpenConnectionOptions,
    handleCancelPendingConnection,
    handleAcceptPendingConnection,
    handleDeclinePendingConnection,
    handleDiscoverRetry,
    handleOpenLocationModal,
    handleUpdateLocation,
    handleUseCurrentLocation,
    cancellingConnectionId,
    acceptingUserId,
    decliningUserId,
    showLocationModal,
    setShowLocationModal,
    newLocationCity,
    setNewLocationCity,
    updatingLocation,
  };
}
