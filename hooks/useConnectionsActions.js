/**
 * Connection / discover action handlers + composed location actions (see useConnectionsLocationActions).
 */
import { useState, useCallback } from "react";
import { Alert } from "react-native";
import { supabase, db } from "../lib/supabase";
import { HapticPatterns } from "../lib/haptics";
import { getUserName } from "../lib/connectionListUtils";
import { useConnectionsLocationActions } from "./useConnectionsLocationActions";
import { RHOOD_COMMUNITY_ID } from "../lib/communityConstants";

/**
 * Store a zero-arg callback in useState without React treating the outer function as a state updater incorrectly.
 * The setter receives an updater `() => callback` so the stored state is `callback`.
 * Pass `null` to clear.
 */
function setStoredCallback(setter, callback) {
  if (callback == null) {
    setter(null);
    return;
  }
  setter(() => callback);
}

export function useConnectionsActions(
  connectionsData,
  discoverData,
  modalActions,
  modalState,
  onNavigate,
  route
) {
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
  } = modalActions;

  const locationActions = useConnectionsLocationActions(connectionsData, discoverData);

  const [cancellingConnectionId, setCancellingConnectionId] = useState(null);
  const [connectingUserId, setConnectingUserId] = useState(null);
  const [acceptingUserId, setAcceptingUserId] = useState(null);
  const [decliningUserId, setDecliningUserId] = useState(null);
  const [isDeletingConnectionId, setIsDeletingConnectionId] = useState(null);

  const user = connectionsData?.user;
  const setConnections = connectionsData?.setConnections;
  const setLastMessages = connectionsData?.setLastMessages;
  const setDiscoverUsers = discoverData?.setDiscoverUsers;
  const setDiscoverLoading = discoverData?.setDiscoverLoading;
  const loadUserAndConnections = connectionsData?.loadUserAndConnections;
  const loadUserCommunities = connectionsData?.loadUserCommunities;
  const loadDiscoverDJs = discoverData?.loadDiscoverDJs;
  const loadNearbyDJs = connectionsData?.loadNearbyDJs;
  const prevConnectionStatusesRef = connectionsData?.prevConnectionStatusesRef;
  const userCommunities = connectionsData?.userCommunities;

  const openConnectionModal = useCallback(
    ({
      message,
      type = "info",
      primaryText = "OK",
      primaryAction = null,
      secondaryText = null,
      secondaryAction = null,
    }) => {
      setConnectionMessage(message);
      setConnectionModalType(type);
      setConnectionModalPrimaryText(primaryText);
      setStoredCallback(setConnectionModalPrimaryAction, primaryAction);
      setConnectionModalSecondaryText(secondaryText);
      setStoredCallback(setConnectionModalSecondaryAction, secondaryAction);
      setShowConnectionModal(true);
    },
    [
      setConnectionMessage,
      setConnectionModalType,
      setConnectionModalPrimaryText,
      setConnectionModalPrimaryAction,
      setConnectionModalSecondaryText,
      setConnectionModalSecondaryAction,
      setShowConnectionModal,
    ]
  );

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
    const action = modalState.connectionModalPrimaryAction;
    if (typeof action === "function") {
      action();
      return;
    }
    handleCloseConnectionModal();
  }, [modalState.connectionModalPrimaryAction, handleCloseConnectionModal]);

  const handleConnectionModalSecondaryPress = useCallback(() => {
    const action = modalState.connectionModalSecondaryAction;
    if (typeof action === "function") {
      action();
      return;
    }
    handleCloseConnectionModal();
  }, [modalState.connectionModalSecondaryAction, handleCloseConnectionModal]);

  const handleJoinRhoodGroup = useCallback(async () => {
    try {
      if (!user?.id) {
        Alert.alert("Error", "Please log in to join the R/HOOD Group");
        return;
      }
      await db.joinCommunity(RHOOD_COMMUNITY_ID, user.id);
      await loadUserCommunities?.();
      Alert.alert(
        "Welcome to R/HOOD Group!",
        "You've successfully joined the main R/HOOD community chat. Start connecting with fellow DJs!",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error joining R/HOOD group:", error);
      Alert.alert("Error", "Failed to join R/HOOD Group. Please try again.");
    }
  }, [user?.id, loadUserCommunities]);

  const handleGroupChatPress = useCallback(
    (communityId = null) => {
      const targetCommunityId = communityId || RHOOD_COMMUNITY_ID;
      const community = userCommunities?.find((c) => c.id === targetCommunityId);
      if (community) {
        onNavigate?.("messages", { communityId: targetCommunityId, chatType: "group" });
      } else if (!communityId) {
        handleJoinRhoodGroup();
      }
    },
    [userCommunities, onNavigate, handleJoinRhoodGroup]
  );

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
      if (!connection?.id || connectingUserId != null) return;
      HapticPatterns.buttonPress();
      setConnectingUserId(connection.id);
      try {
        setDiscoverLoading?.(true);
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();
        if (!currentUser) {
          Alert.alert("Error", "Please log in to connect with users");
          return;
        }
        const connectionResult = await db.createConnection(connection.id);
        const displayName =
          connection?.dj_name ||
          connection?.full_name ||
          `${connection?.first_name || ""} ${connection?.last_name || ""}`.trim() ||
          "this user";
        const isExistingConnection = connectionResult?.status === "pending" && connectionResult?.id;
        if (isExistingConnection) {
          openConnectionModal({
            message: `Connection request sent to ${displayName}. They'll be notified and can accept your request.`,
            type: "success",
            primaryText: "OK",
            primaryAction: null,
            secondaryText: null,
            secondaryAction: null,
          });
          setDiscoverUsers?.((prev) =>
            prev.map((u) =>
              u.id === connection.id
                ? {
                    ...u,
                    isConnected: false,
                    connectionStatus: "pending",
                    connectionStatusRaw: "pending",
                    connectionId:
                      connectionResult?.id || connectionResult?.connection_id || u.connectionId || null,
                  }
                : u
            )
          );
          await loadUserAndConnections?.({ showLoader: false });
        } else {
          openConnectionModal({
            message: `You're already connected to ${displayName}`,
            type: "info",
            primaryText: "Open chat",
            primaryAction: () => {
              handleConnectionPress({
                id: connection.id,
                connectionId:
                  connectionResult?.id || connectionResult?.connection_id || connection.connectionId || null,
                threadId: connection.threadId || null,
              });
              handleCloseConnectionModal();
            },
            secondaryText: null,
            secondaryAction: null,
          });
        }
      } catch (error) {
        console.error("Error sending connection request:", error);
        openConnectionModal({
          message: "Failed to send connection request",
          type: "error",
          primaryText: "OK",
          primaryAction: null,
          secondaryText: null,
          secondaryAction: null,
        });
      } finally {
        setDiscoverLoading?.(false);
        setConnectingUserId(null);
      }
    },
    [
      connectingUserId,
      setDiscoverLoading,
      setDiscoverUsers,
      openConnectionModal,
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
        setStoredCallback(setConnectionModalPrimaryAction, () => {});

        const resolvedConnectionId = connection.connectionId || (await resolveConnectionId(connection));
        if (!resolvedConnectionId) {
          openConnectionModal({
            message: "We couldn't find this connection. Please refresh and try again.",
            type: "error",
            primaryText: "Close",
            primaryAction: null,
            secondaryText: null,
            secondaryAction: null,
          });
          return;
        }

        await db.deleteConnection(resolvedConnectionId);
        setConnections?.((prev) => prev.filter((item) => item.id !== connection.id));
        setDiscoverUsers?.((prev) =>
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
        setLastMessages?.((prev) => {
          const updated = { ...prev };
          delete updated[connection.id];
          return updated;
        });
        prevConnectionStatusesRef?.current?.delete(connection.id);
        await loadNearbyDJs?.();

        const displayName = getUserName(connection);
        openConnectionModal({
          message: `${displayName} has been removed from your connections.`,
          type: "success",
          primaryText: "OK",
          primaryAction: null,
          secondaryText: null,
          secondaryAction: null,
        });
        setSelectedConnection?.(null);
      } catch (error) {
        console.error("Error removing connection:", error);
        openConnectionModal({
          message: "Failed to remove this connection. Please try again.",
          type: "error",
          primaryText: "Close",
          primaryAction: null,
          secondaryText: null,
          secondaryAction: null,
        });
      } finally {
        setIsDeletingConnectionId(null);
      }
    },
    [
      setConnections,
      setDiscoverUsers,
      setLastMessages,
      setConnectionModalPrimaryText,
      setConnectionModalPrimaryAction,
      setSelectedConnection,
      prevConnectionStatusesRef,
      loadNearbyDJs,
      resolveConnectionId,
      openConnectionModal,
    ]
  );

  const handleOpenConnectionOptions = useCallback(
    (connection) => {
      if (!connection) return;
      HapticPatterns.buttonPress();
      setSelectedConnection?.(connection);
      const displayName = getUserName(connection);
      openConnectionModal({
        message: `Remove ${displayName} from your connections? You can reconnect anytime by sending a new request.`,
        type: "warning",
        primaryText: "Remove Connection",
        primaryAction: () => {
          void handleDeleteConnection(connection);
        },
        secondaryText: "Keep Connection",
        secondaryAction: () => {
          handleCloseConnectionModal();
        },
      });
    },
    [handleDeleteConnection, handleCloseConnectionModal, setSelectedConnection, openConnectionModal]
  );

  const performCancelPendingConnection = useCallback(
    async (connection, connectionId, displayName) => {
      try {
        setCancellingConnectionId(connectionId || connection.id);
        await db.cancelConnectionRequest(connectionId);
        setDiscoverUsers?.((prev) =>
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
        setConnections?.((prev) =>
          prev.map((item) =>
            item.id === connection.id
              ? { ...item, connectionStatus: null, connectionStatusRaw: null, connectionId: null }
              : item
          )
        );
        await loadUserAndConnections?.({ showLoader: false });
        openConnectionModal({
          message: `Connection request to ${displayName} has been cancelled.`,
          type: "info",
          primaryText: "OK",
          primaryAction: null,
          secondaryText: null,
          secondaryAction: null,
        });
      } catch (error) {
        console.error("Error cancelling connection request:", error);
        Alert.alert("Error", `Failed to cancel connection request: ${error?.message || "Unknown error"}`);
      } finally {
        setCancellingConnectionId(null);
      }
    },
    [setDiscoverUsers, setConnections, openConnectionModal, loadUserAndConnections]
  );

  const handleCancelPendingConnection = useCallback(
    (connection) => {
      if (!connection) return;
      const displayName =
        connection?.dj_name ||
        connection?.full_name ||
        `${connection?.first_name || ""} ${connection?.last_name || ""}`.trim() ||
        "this DJ";
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
      try {
        const connectionId =
          connection.connectionId || connection.connection_id || (await resolveConnectionId(connection));
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
      const displayName =
        connection?.name ||
        connection?.dj_name ||
        connection?.full_name ||
        `${connection?.first_name || ""} ${connection?.last_name || ""}`.trim() ||
        "this DJ";
      try {
        const connectionId =
          connection.connectionId || connection.connection_id || (await resolveConnectionId(connection));
        if (!connectionId) {
          Alert.alert("Error", "We couldn't find this connection request to decline. Please try again.");
          return;
        }
        setDecliningUserId(connection.id);
        await db.declineConnection(connectionId);
        await loadUserAndConnections?.({ showLoader: false });
        await loadDiscoverDJs?.();
        await loadNearbyDJs?.();
        openConnectionModal({
          message: `Connection request from ${displayName} has been declined.`,
          type: "info",
          primaryText: "OK",
          primaryAction: null,
          secondaryText: null,
          secondaryAction: null,
        });
      } catch (error) {
        console.error("Error declining connection request:", error);
        Alert.alert("Error", `Failed to decline connection request: ${error?.message || "Unknown error"}`);
      } finally {
        setDecliningUserId(null);
      }
    },
    [resolveConnectionId, loadUserAndConnections, loadDiscoverDJs, loadNearbyDJs, openConnectionModal]
  );

  const handleDiscoverRetry = useCallback(() => {
    discoverData?.setDiscoverLoadError?.(null);
    discoverData?.loadDiscoverDJs?.();
  }, [discoverData]);

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
    cancellingConnectionId,
    connectingUserId,
    acceptingUserId,
    decliningUserId,
    isDeletingConnectionId,
    ...locationActions,
  };
}
