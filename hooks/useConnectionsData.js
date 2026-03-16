/**
 * Connections tab state, loaders, realtime, and derived list data.
 */
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Animated, RefreshControl } from "react-native";
import { supabase, db } from "../lib/supabase";
import { HapticPatterns } from "../lib/haptics";
import { LIST_PERFORMANCE, CONNECTIONS_LIST_PERFORMANCE } from "../lib/performanceConstants";
import { SCREEN_CACHE_STALE_MS } from "../lib/cacheConstants";
import {
  normalizeConnectionStatus,
  isAcceptedConnectionStatus,
  isPendingConnectionStatus,
} from "../lib/connectionStatusUtils";
import { formatMessageTime, getUserName } from "../lib/connectionListUtils";
import { loadUserAndConnectionsImpl, loadUserCommunitiesImpl } from "../lib/connectionsScreenLoaders";
import ConnectionListItem from "../components/ConnectionListItem";
import CommunityListItem from "../components/CommunityListItem";
import styles from "../components/ConnectionsScreen.styles";

const STALE_MS = SCREEN_CACHE_STALE_MS;
const PERIODIC_REFRESH_INTERVAL_MS = 30 * 1000;
const REALTIME_DEBOUNCE_MS = 600;

// Cache connections data by userId so revisiting the tab doesn't refetch every time (screen unmounts when switching tabs)
const connectionsCacheByUser = {};

export function useConnectionsData(propUser, activeTab, searchQuery, discoverLoaders, modalCtx) {
  const [user, setUser] = useState(() =>
    propUser && typeof propUser === "object" && !Array.isArray(propUser) ? propUser : null
  );
  const [connections, setConnections] = useState([]);
  const [lastMessages, setLastMessages] = useState({});
  const [loading, setLoading] = useState(true);
  const [hasLoadedConnections, setHasLoadedConnections] = useState(false);
  const [connectionsLoadError, setConnectionsLoadError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
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
  const [connectionsFadeAnim] = useState(() => new Animated.Value(1));

  const hasLoadedMessagesRef = useRef(false);
  const lastLoadedAtRef = useRef(0);
  const mountedWithConnectionsTabRef = useRef(activeTab === "connections");
  const prevConnectionStatusesRef = useRef(new Map());
  const realtimeDebounceRef = useRef(null);

  const { userCommunities, communityMessages, communityUnreadCounts } = communitiesData;
  const loadDiscoverDJs = discoverLoaders?.loadDiscoverDJs ?? (() => {});
  const loadNearbyDJs = discoverLoaders?.loadNearbyDJs ?? (() => {});

  const connectionsLoaderCtxRef = useRef({});
  connectionsLoaderCtxRef.current = {
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
    setCommunitiesData,
    user,
    ...(modalCtx || {}),
  };

  useEffect(() => {
    if (propUser && typeof propUser === "object" && !Array.isArray(propUser) && propUser !== user) {
      setUser(propUser);
    }
  }, [propUser, user]);

  const loadUserAndConnections = useCallback((opts) => loadUserAndConnectionsImpl(connectionsLoaderCtxRef.current, opts), []);
  const loadUserCommunities = useCallback(() => loadUserCommunitiesImpl(connectionsLoaderCtxRef.current), []);

  const checkRhoodMembership = useCallback(() => loadUserCommunities(), [loadUserCommunities]);

  // If we have cached data for this user that's not stale, hydrate state and return true so caller can skip refetch.
  const hydrateFromCacheIfAvailable = useCallback((userId) => {
    if (!userId) return false;
    const cached = connectionsCacheByUser[userId];
    if (!cached || !cached.connections || !Number.isFinite(cached.lastLoadedAt)) return false;
    if (Date.now() - cached.lastLoadedAt > STALE_MS) return false;
    setUser((prev) => prev?.id === userId ? prev : cached.user || prev);
    setConnections(cached.connections);
    setLastMessages(cached.lastMessages || {});
    setCommunitiesData(cached.communitiesData || { userCommunities: [], communityMessages: {}, communityUnreadCounts: {}, rhoodGroupData: null, isRhoodMember: false, rhoodMemberCount: 0, latestGroupMessage: null, unreadGroupCount: 0 });
    setLoading(false);
    setHasLoadedConnections(true);
    setConnectionsLoadError(null);
    lastLoadedAtRef.current = cached.lastLoadedAt;
    Animated.timing(connectionsFadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    return true;
  }, [connectionsFadeAnim]);

  // Persist to cache after successful load so next time we open the tab we can show cached data.
  const writeCache = useCallback(() => {
    const uid = connectionsLoaderCtxRef.current?.user?.id || connectionsLoaderCtxRef.current?.propUser?.id;
    if (!uid) return;
    connectionsCacheByUser[uid] = {
      userId: uid,
      user: connectionsLoaderCtxRef.current.user,
      connections,
      lastMessages,
      communitiesData,
      lastLoadedAt: lastLoadedAtRef.current,
    };
  }, [connections, lastMessages, communitiesData]);

  const loadLastMessagesForConnections = useCallback(async (userId) => {
    try {
      const data = await db.getLastMessagesForAllConnections(userId);
      setLastMessages(data || {});
    } catch (e) {
      console.error("❌ Error loading last messages:", e);
      setLastMessages({});
    }
  }, []);

  // After a successful load, write to cache so revisiting the tab can show cached data without refetch.
  useEffect(() => {
    if (user?.id && hasLoadedConnections) writeCache();
  }, [user?.id, hasLoadedConnections, connections, lastMessages, communitiesData, writeCache]);

  useEffect(() => {
    if (activeTab !== "connections" || !user?.id) return;
    const isStale = Date.now() - lastLoadedAtRef.current > STALE_MS;
    if (!hasLoadedConnections) {
      if (mountedWithConnectionsTabRef.current) {
        mountedWithConnectionsTabRef.current = false;
        return;
      }
      const run = async () => {
        setLoading(true);
        await loadUserAndConnections({ showLoader: true, deferLoadingEnd: true });
        await loadUserCommunities();
        setLoading(false);
        setHasLoadedConnections(true);
        lastLoadedAtRef.current = Date.now();
        Animated.timing(connectionsFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      };
      run();
    } else if (isStale) {
      loadUserAndConnections({ showLoader: false });
      loadUserCommunities();
    }
  }, [activeTab, user?.id, hasLoadedConnections, loadUserAndConnections, loadUserCommunities, connectionsFadeAnim]);
  useEffect(() => {
    if (user?.id && connections.length > 0 && hasLoadedConnections && !hasLoadedMessagesRef.current) {
      hasLoadedMessagesRef.current = true;
      loadLastMessagesForConnections(user.id);
    }
  }, [user?.id, connections.length, hasLoadedConnections, loadLastMessagesForConnections]);

  useEffect(() => {
    if (!user?.id || !hasLoadedConnections || connections.length === 0) return;
    const channel = supabase
      .channel("messages-list-updates")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` }, (payload) => {
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
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_posts" }, (payload) => {
        if (payload?.new?.community_id === "550e8400-e29b-41d4-a716-446655440000") checkRhoodMembership();
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user?.id, connections.length, hasLoadedConnections, checkRhoodMembership]);

  useEffect(() => {
    if (!user?.id || connections.length === 0 || !hasLoadedMessagesRef.current) return;
    const id = setInterval(() => loadLastMessagesForConnections(user.id), PERIODIC_REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [user?.id, connections.length, loadLastMessagesForConnections]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`connections-updates-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "connections" }, (payload) => {
        const involves =
          payload.new?.user_id_1 === user.id ||
          payload.new?.user_id_2 === user.id ||
          payload.old?.user_id_1 === user.id ||
          payload.old?.user_id_2 === user.id;
        if (involves) {
          if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
          realtimeDebounceRef.current = setTimeout(() => {
            realtimeDebounceRef.current = null;
            loadUserAndConnections({ showLoader: false });
            loadDiscoverDJs();
            loadNearbyDJs();
          }, REALTIME_DEBOUNCE_MS);
        }
      })
      .subscribe();
    return () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [user?.id, loadUserAndConnections, loadDiscoverDJs, loadNearbyDJs]);

  const handleRefresh = useCallback(async () => {
    HapticPatterns.pullToRefresh();
    setRefreshing(true);
    await Promise.all([loadUserAndConnections(), loadUserCommunities()]);
    setRefreshing(false);
  }, [loadUserAndConnections, loadUserCommunities]);

  const filteredConnections = useMemo(() => {
    let filtered = connections.filter((c) => {
      const status = normalizeConnectionStatus(c.connectionStatus || c.connectionStatusRaw);
      if (!status) return true;
      return isAcceptedConnectionStatus(status) || isPendingConnectionStatus(status);
    });
    if (searchQuery?.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((c) => {
        const fields = [c.name, c.dj_name, c.full_name, c.username, c.location, c.city, c.statusMessage].filter(Boolean);
        return fields.some((f) => f.toLowerCase().includes(q)) || c.genres?.some((g) => g.toLowerCase().includes(q));
      });
    }
    return filtered;
  }, [connections, searchQuery]);

  const connectionsWithMessages = useMemo(
    () =>
      filteredConnections.filter((c) => {
        const lm = lastMessages[c.id];
        return lm && (lm.content || lm.messageType === "image" || lm.messageType === "video" || lm.messageType === "audio" || lm.messageType === "file");
      }),
    [filteredConnections, lastMessages]
  );

  const incomingConnectionRequests = useMemo(
    () =>
      user?.id
        ? filteredConnections.filter(
            (c) =>
              isPendingConnectionStatus(c.connectionStatus) &&
              c.connectionInitiatedBy &&
              c.connectionInitiatedBy !== user.id
          )
        : [],
    [filteredConnections, user?.id]
  );

  const connectionSections = useMemo(
    () => [
      { key: "communities", data: userCommunities || [] },
      { key: "connections", data: connectionsWithMessages || [] },
    ],
    [userCommunities, connectionsWithMessages]
  );

  const getLastMessageContent = useCallback(
    (connection) => {
      const lm = lastMessages[connection.id];
      if (!lm) return "No messages yet";
      if (lm.messageType === "image") return "📷 Photo";
      if (lm.messageType === "video") return "🎥 Video";
      if (lm.messageType === "audio") return "🎵 Audio";
      if (lm.messageType === "file") return "📎 File";
      return String(lm.content || "No messages yet");
    },
    [lastMessages]
  );
  const getLastMessageTime = useCallback(
    (connection) => (lastMessages[connection.id]?.timestamp ? formatMessageTime(lastMessages[connection.id].timestamp) : ""),
    [lastMessages]
  );
  const getLastMessageSender = useCallback(
    (connection) => {
      const lm = lastMessages[connection.id];
      if (!lm) return "";
      return lm.senderId !== user?.id ? (lm.senderName ? `${lm.senderName}: ` : "") : "You: ";
    },
    [lastMessages, user?.id]
  );

  const getConnectionListItemLayout = useCallback(
    (data, index) => {
      const rowHeight = CONNECTIONS_LIST_PERFORMANCE.ESTIMATED_ROW_HEIGHT_MESSAGES;
      let globalIndex = 0;
      for (const section of connectionSections) {
        const arr = section.data || [];
        const pos = arr.findIndex((item) => item === data || (item?.id != null && item.id === data?.id));
        if (pos !== -1) {
          globalIndex += pos;
          return {
            length: rowHeight,
            offset: rowHeight * globalIndex,
            index: globalIndex,
          };
        }
        globalIndex += arr.length;
      }
      return { length: rowHeight, offset: rowHeight * index, index };
    },
    [connectionSections]
  );

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="hsl(0, 0%, 100%)" colors={["hsl(0, 0%, 100%)"]} />
  );

  return {
    user,
    setUser,
    connections,
    setConnections,
    lastMessages,
    setLastMessages,
    loading,
    setLoading,
    hasLoadedConnections,
    setHasLoadedConnections,
    connectionsLoadError,
    setConnectionsLoadError,
    communitiesData,
    setCommunitiesData,
    userCommunities,
    communityMessages,
    communityUnreadCounts,
    connectionsFadeAnim,
    refreshing,
    loadUserAndConnections,
    loadUserCommunities,
    loadLastMessagesForConnections,
    checkRhoodMembership,
    hydrateFromCacheIfAvailable,
    handleRefresh,
    filteredConnections,
    connectionsWithMessages,
    connectionSections,
    incomingConnectionRequests,
    getLastMessageContent,
    getLastMessageTime,
    getLastMessageSender,
    getConnectionListItemLayout,
    refreshControl,
    hasLoadedMessagesRef,
    lastLoadedAtRef,
    prevConnectionStatusesRef,
    connectionsLoaderCtxRef,
  };
}
