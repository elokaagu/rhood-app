/**
 * Connections screen data loaders (extracted from ConnectionsScreen to reduce file size).
 * Each loader receives a context object with setters, refs, and callbacks.
 */
import { Animated } from "react-native";
import { supabase, db } from "./supabase";
import { connectionsService } from "./connectionsService";
import { normalizeConnectionStatus, isAcceptedConnectionStatus } from "./connectionStatusUtils";
import { RHOOD_COMMUNITY_ID, isRhoodCommunityId } from "./communityConstants";

const debugLoaderWarn = (...args) => {
  if (__DEV__) {
    console.warn("[connectionsLoader]", ...args);
  }
};

async function resolveCurrentUser(propUser) {
  if (propUser) return propUser;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return user;
  } catch (error) {
    debugLoaderWarn("resolveCurrentUser:getUser failed", error?.message || error);
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) return session.user;
  } catch (error) {
    debugLoaderWarn("resolveCurrentUser:getSession failed", error?.message || error);
  }

  return null;
}

function buildParticipantConnection(participant) {
  return {
    id: participant.userId,
    name: participant.name,
    username: participant.username
      ? `@${participant.username}`
      : `@${(participant.name || "user").toLowerCase().replace(/\s+/g, "")}`,
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

function normalizeConnectionRow(conn, currentUserId, prevStatusesRef) {
  let profileImage = conn.connected_user_image || null;
  if (profileImage && typeof profileImage === "string" && profileImage.trim()) {
    profileImage = profileImage.trim();
  } else {
    profileImage = null;
  }

  const rawStatus =
    conn.connection_status ||
    conn.status ||
    conn.connectionStatus ||
    conn.state ||
    null;
  const normalizedStatus = normalizeConnectionStatus(rawStatus);
  const connectionId =
    conn.connection_id ||
    conn.id ||
    conn.connectionId ||
    conn.connection_uuid ||
    null;
  const initiatedBy =
    conn.initiated_by ||
    conn.requested_by ||
    conn.requester_id ||
    conn.sent_by ||
    null;
  const threadId = conn.thread_id || null;
  const targetUserId = conn.connected_user_id;

  const previousStatus = prevStatusesRef.current.get(targetUserId);
  prevStatusesRef.current.set(targetUserId, normalizedStatus);

  return {
    connection: {
      id: targetUserId,
      name: conn.connected_user_name,
      username: conn.connected_user_username
        ? `@${conn.connected_user_username}`
        : `@${(conn.connected_user_name || "user").toLowerCase().replace(/\s+/g, "")}`,
      location:
        conn.connected_user_city ||
        conn.connected_user_location ||
        "Location not set",
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
      isIncomingPending:
        normalizedStatus === "pending" &&
        initiatedBy &&
        currentUserId &&
        initiatedBy !== currentUserId,
      isOutgoingPending:
        normalizedStatus === "pending" &&
        initiatedBy &&
        currentUserId &&
        initiatedBy === currentUserId,
    },
    previousStatus,
    normalizedStatus,
    connectionId,
    threadId,
    userId: targetUserId,
    name: conn.connected_user_name || "this DJ",
  };
}

function buildConnectionsFromData({
  connectionsData = [],
  conversationParticipants = [],
  currentUserId,
  prevConnectionStatusesRef,
}) {
  const connectionsMap = {};
  const newlyAcceptedConnections = [];

  connectionsData.forEach((conn) => {
    const normalized = normalizeConnectionRow(
      conn,
      currentUserId,
      prevConnectionStatusesRef
    );
    if (
      normalized.previousStatus === "pending" &&
      isAcceptedConnectionStatus(normalized.normalizedStatus)
    ) {
      newlyAcceptedConnections.push({
        userId: normalized.userId,
        name: normalized.name,
        connectionId: normalized.connectionId,
        threadId: normalized.threadId,
      });
    }
    connectionsMap[normalized.userId] = normalized.connection;
  });

  prevConnectionStatusesRef.current.forEach((_, userId) => {
    if (!connectionsMap[userId]) prevConnectionStatusesRef.current.delete(userId);
  });

  conversationParticipants.forEach((participant) => {
    if (!connectionsMap[participant.userId]) {
      connectionsMap[participant.userId] = buildParticipantConnection(participant);
    }
  });

  return {
    allConnections: Object.values(connectionsMap),
    newlyAcceptedConnections,
  };
}

/**
 * Load connections + participants, merge, then fetch last messages. Single combined backend call.
 * @param {Object} ctx - Loader context with setters/refs/anim/propUser/hasLoadedConnections.
 * @returns {Promise<{requiresAuth?: boolean, newlyAcceptedConnections?: Array}>}
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
    hasLoadedMessagesRef,
    prevConnectionStatusesRef,
    lastLoadedAtRef,
    connectionsFadeAnim,
    propUser,
    hasLoadedConnections,
    onAuthRequired,
  } = ctx;

  try {
    setConnectionsLoadError(null);
    if (showLoader || !hasLoadedConnections) {
      setLoading(true);
    }

    const currentUser = await resolveCurrentUser(propUser);

    if (!currentUser) {
      if (__DEV__) {
        debugLoaderWarn("No authenticated user found while loading connections.");
      }
      if (typeof onAuthRequired === "function") {
        onAuthRequired();
      }
      return { requiresAuth: true };
    }

    setUser(currentUser);

    const { connectionsData, conversationParticipants, lastMessages: lastMessagesData } = await db.getConnectionsParticipantsAndLastMessages(currentUser.id);
    const { allConnections, newlyAcceptedConnections } = buildConnectionsFromData({
      connectionsData: connectionsData || [],
      conversationParticipants: conversationParticipants || [],
      currentUserId: currentUser.id,
      prevConnectionStatusesRef,
    });

    if (allConnections.length > 0) {
      setConnections(allConnections);
      setLastMessages(lastMessagesData || {});
      hasLoadedMessagesRef.current = true;

      return { newlyAcceptedConnections };
    } else {
      setConnections([]);
      return { newlyAcceptedConnections: [] };
    }
  } catch (error) {
    console.error("❌ Error loading connections:", error);
    setConnectionsLoadError(error?.message || "Couldn't load connections");
    if (deferLoadingEnd) {
      setLoading(false);
      setHasLoadedConnections(true);
    }
    return { newlyAcceptedConnections: [] };
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
    const rhoodCommunity = (communities || []).find((c) => isRhoodCommunityId(c.id));
    setCommunitiesData({
      userCommunities: communities || [],
      communityMessages: messagesMap,
      communityUnreadCounts: unreadCountsMap,
      rhoodGroupData: rhoodCommunity || null,
      isRhoodMember: !!rhoodCommunity,
      rhoodMemberCount: rhoodCommunity?.member_count || 0,
      latestGroupMessage: rhoodCommunity ? (messagesMap[RHOOD_COMMUNITY_ID] || null) : null,
      unreadGroupCount: rhoodCommunity ? (unreadCountsMap[RHOOD_COMMUNITY_ID] || 0) : 0,
    });
  } catch (error) {
    console.error("Error loading user communities:", error);
    setCommunitiesData((prev) => ({ ...prev, userCommunities: [] }));
  }
}
