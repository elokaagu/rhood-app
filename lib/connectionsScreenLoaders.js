/**
 * Connections screen data loaders (extracted from ConnectionsScreen to reduce file size).
 * Each loader receives a context object with setters, refs, and callbacks.
 */
import { Alert, Animated } from "react-native";
import { supabase, db } from "./supabase";
import { connectionsService } from "./connectionsService";
import { normalizeConnectionStatus, isAcceptedConnectionStatus } from "./connectionStatusUtils";

/**
 * Load connections + participants, merge, then fetch last messages. Single combined backend call.
 * @param {Object} ctx - { setConnectionsLoadError, setLoading, setHasLoadedConnections, setUser, setConnections, setLastMessages, setConnectionMessage, setConnectionModalType, setConnectionModalPrimaryText, setConnectionModalPrimaryAction, setShowConnectionModal, hasLoadedMessagesRef, prevConnectionStatusesRef, lastLoadedAtRef, connectionsFadeAnim, propUser, onNavigate, handleCloseConnectionModal, hasLoadedConnections }
 */
export async function loadUserAndConnectionsImpl(ctx, opts = {}) {
  const { showLoader = false, deferLoadingEnd = false } = opts;
  const {
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
  } = ctx;

  try {
    setConnectionsLoadError(null);
    if (showLoader || !hasLoadedConnections) {
      setLoading(true);
    }

    let currentUser = propUser;
    if (!currentUser) {
      await new Promise((r) => setTimeout(r, 100));
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!userError) currentUser = user;
      } catch (_) {}
      if (!currentUser) {
        try {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (!sessionError && session?.user) currentUser = session.user;
        } catch (_) {}
      }
    }

    if (!currentUser) {
      Alert.alert("Error", "Please log in to view connections");
      return;
    }

    setUser(currentUser);

    const { connectionsData, conversationParticipants, lastMessages: lastMessagesData } = await db.getConnectionsParticipantsAndLastMessages(currentUser.id);
    const connectionsMap = {};
    const newlyAcceptedConnections = [];

    if (connectionsData && connectionsData.length > 0) {
      connectionsData.forEach((conn) => {
        let profileImage = conn.connected_user_image || null;
        if (profileImage && typeof profileImage === "string" && profileImage.trim()) {
          profileImage = profileImage.trim();
        } else {
          profileImage = null;
        }
        const rawStatus = conn.connection_status || conn.status || conn.connectionStatus || conn.state || null;
        const normalizedStatus = normalizeConnectionStatus(rawStatus);
        const connectionId = conn.connection_id || conn.id || conn.connectionId || conn.connection_uuid || null;
        const initiatedBy = conn.initiated_by || conn.requested_by || conn.requester_id || conn.sent_by || null;
        const threadId = conn.thread_id || null;

        const previousStatus = prevConnectionStatusesRef.current.get(conn.connected_user_id);
        prevConnectionStatusesRef.current.set(conn.connected_user_id, normalizedStatus);
        if (previousStatus === "pending" && isAcceptedConnectionStatus(normalizedStatus)) {
          newlyAcceptedConnections.push({
            userId: conn.connected_user_id,
            name: conn.connected_user_name || "this DJ",
            connectionId,
            threadId,
          });
        }

        connectionsMap[conn.connected_user_id] = {
          id: conn.connected_user_id,
          name: conn.connected_user_name,
          username: conn.connected_user_username ? `@${conn.connected_user_username}` : `@${(conn.connected_user_name || "user").toLowerCase().replace(/\s+/g, "")}`,
          location: conn.connected_user_city || conn.connected_user_location || "Location not set",
          genres: conn.connected_user_genres || [],
          profileImage,
          rating: conn.connected_user_rating || 0,
          gigsCompleted: conn.connected_user_gigs || 0,
          lastActive: "Recently",
          mutualConnections: 0,
          status: "online",
          isVerified: conn.connected_user_verified || false,
          connectionStatus: normalizedStatus,
          connectionStatusRaw: rawStatus,
          isConnected: isAcceptedConnectionStatus(normalizedStatus),
          statusMessage: conn.connected_user_status_message || "",
          connectionId,
          threadId,
          connectionInitiatedBy: initiatedBy,
          isIncomingPending: normalizeConnectionStatus(rawStatus) === "pending" && initiatedBy && currentUser.id && initiatedBy !== currentUser.id,
          isOutgoingPending: normalizeConnectionStatus(rawStatus) === "pending" && initiatedBy && currentUser.id && initiatedBy === currentUser.id,
        };
      });

      prevConnectionStatusesRef.current.forEach((_, userId) => {
        if (!connectionsMap[userId]) prevConnectionStatusesRef.current.delete(userId);
      });
    }

    if (conversationParticipants && conversationParticipants.length > 0) {
      conversationParticipants.forEach((participant) => {
        if (!connectionsMap[participant.userId]) {
          connectionsMap[participant.userId] = {
            id: participant.userId,
            name: participant.name,
            username: participant.username ? `@${participant.username}` : `@${(participant.name || "user").toLowerCase().replace(/\s+/g, "")}`,
            location: participant.location || "Location not set",
            genres: participant.genres || [],
            profileImage: participant.profileImage || null,
            rating: 0,
            gigsCompleted: 0,
            lastActive: "Recently",
            mutualConnections: 0,
            status: "online",
            isVerified: participant.isVerified || false,
            connectionStatus: null,
            statusMessage: participant.statusMessage || "",
            connectionId: null,
            threadId: participant.threadId || null,
            connectionInitiatedBy: null,
            isIncomingPending: false,
            isOutgoingPending: false,
          };
        }
      });
    }

    const allConnections = Object.values(connectionsMap);

    if (allConnections.length > 0) {
      setConnections(allConnections);
      setLastMessages(lastMessagesData || {});
      hasLoadedMessagesRef.current = true;

      if (newlyAcceptedConnections.length > 0) {
        const accepted = newlyAcceptedConnections[0];
        setConnectionMessage(`You are now connected with ${accepted.name}! Click below to chat.`);
        setConnectionModalType("success");
        setConnectionModalPrimaryText("Click to Chat");
        setConnectionModalPrimaryAction(() => () => {
          if (onNavigate) {
            onNavigate("messages", {
              isGroupChat: false,
              djId: accepted.userId,
              connectionId: accepted.connectionId || null,
              threadId: accepted.threadId || null,
              returnToConnectionsTab: "connections",
            });
          }
          handleCloseConnectionModal();
        });
        setShowConnectionModal(true);
      }
    } else {
      setConnections([]);
    }
  } catch (error) {
    console.error("❌ Error loading connections:", error);
    setConnections([]);
    setConnectionsLoadError(error?.message || "Couldn't load connections");
    if (deferLoadingEnd) {
      setLoading(false);
      setHasLoadedConnections(true);
    }
  } finally {
    if (!deferLoadingEnd) {
      setLoading(false);
      if (!hasLoadedConnections) setHasLoadedConnections(true);
      lastLoadedAtRef.current = Date.now();
      Animated.timing(connectionsFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }
}

/**
 * Load user communities and latest group messages; single setCommunitiesData.
 */
export async function loadUserCommunitiesImpl(ctx) {
  const { setCommunitiesData, user } = ctx;
  if (!user?.id) return;
  try {
    const communities = await connectionsService.getUserCommunities();
    const ids = (communities || []).map((c) => c.id);
    const [messagesMap, unreadCountsMap] = await Promise.all([
      ids.length ? db.getLatestGroupMessagesBatch(ids) : Promise.resolve({}),
      Promise.resolve(ids.reduce((acc, id) => ({ ...acc, [id]: 0 }), {})),
    ]);
    const rhoodCommunityId = "550e8400-e29b-41d4-a716-446655440000";
    const rhoodCommunity = (communities || []).find((c) => c.id === rhoodCommunityId);
    setCommunitiesData({
      userCommunities: communities || [],
      communityMessages: messagesMap,
      communityUnreadCounts: unreadCountsMap,
      rhoodGroupData: rhoodCommunity || null,
      isRhoodMember: !!rhoodCommunity,
      rhoodMemberCount: rhoodCommunity?.member_count || 0,
      latestGroupMessage: rhoodCommunity ? (messagesMap[rhoodCommunityId] || null) : null,
      unreadGroupCount: rhoodCommunity ? (unreadCountsMap[rhoodCommunityId] || 0) : 0,
    });
  } catch (error) {
    console.error("Error loading user communities:", error);
    setCommunitiesData((prev) => ({ ...prev, userCommunities: [] }));
  }
}
