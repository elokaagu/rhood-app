/**
 * Discover tab state, loaders, and derived list data.
 */
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Animated } from "react-native";
import {
  loadPopularDJsImpl,
  loadNearbyDJsImpl,
  loadNearbyOpportunitiesImpl,
  loadDiscoverDJsImpl,
} from "../lib/discoverLoaders";
import DiscoverUserCard from "../components/DiscoverUserCard";
import { normalizeConnectionStatus } from "../lib/connectionStatusUtils";
import { LIST_PERFORMANCE } from "../lib/performanceConstants";
import styles from "../components/ConnectionsScreen.styles";

export function useDiscoverData(user, searchQuery) {
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverUsers, setDiscoverUsers] = useState([]);
  const [popularDJs, setPopularDJs] = useState([]);
  /** Start true so carousels reserve space above “Our community” until first fetch settles. */
  const [popularDJsLoading, setPopularDJsLoading] = useState(true);
  const [nearbyDJs, setNearbyDJs] = useState([]);
  const [nearbyDJsLoading, setNearbyDJsLoading] = useState(true);
  const [nearbyOpportunities, setNearbyOpportunities] = useState([]);
  const [nearbyOpportunitiesLoading, setNearbyOpportunitiesLoading] = useState(() => Boolean(user?.id));
  const [discoverLoadError, setDiscoverLoadError] = useState(null);
  const [discoverFadeAnim] = useState(() => new Animated.Value(1));

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

  const loadDiscoverDJs = useCallback(() => loadDiscoverDJsImpl(discoverCtxRef.current), []);
  const loadPopularDJs = useCallback(() => loadPopularDJsImpl(discoverCtxRef.current), []);
  const loadNearbyDJs = useCallback(() => loadNearbyDJsImpl(discoverCtxRef.current), []);
  const loadNearbyOpportunities = useCallback(() => loadNearbyOpportunitiesImpl(discoverCtxRef.current), []);

  useEffect(() => {
    if (user?.id) {
      loadNearbyOpportunities();
    } else {
      setNearbyOpportunitiesLoading(false);
    }
  }, [user?.id, user?.city, loadNearbyOpportunities]);

  const filteredDiscoverUsers = useMemo(() => {
    if (!searchQuery?.trim()) return discoverUsers;
    const query = searchQuery.toLowerCase().trim();
    return discoverUsers.filter((u) => {
      const searchableFields = [u.name, u.dj_name, u.username, u.location, u.city, u.statusMessage].filter(Boolean);
      const matchesName = searchableFields.some((f) => f.toLowerCase().includes(query));
      const matchesGenre = u.genres?.some((g) => g.toLowerCase().includes(query));
      return matchesName || matchesGenre;
    });
  }, [discoverUsers, searchQuery]);

  const getDiscoverItemLayout = useCallback((_, index) => ({
    length: LIST_PERFORMANCE.ESTIMATED_ROW_HEIGHT_DISCOVER,
    offset: LIST_PERFORMANCE.ESTIMATED_ROW_HEIGHT_DISCOVER * index,
    index,
  }), []);

  return {
    discoverUsers,
    setDiscoverUsers,
    discoverLoading,
    setDiscoverLoading,
    discoverLoadError,
    setDiscoverLoadError,
    popularDJs,
    popularDJsLoading,
    nearbyDJs,
    nearbyDJsLoading,
    nearbyOpportunities,
    nearbyOpportunitiesLoading,
    discoverFadeAnim,
    loadDiscoverDJs,
    loadPopularDJs,
    loadNearbyDJs,
    loadNearbyOpportunities,
    filteredDiscoverUsers,
    getDiscoverItemLayout,
    discoverCtxRef,
  };
}

export function useDiscoverRenderItem(discoverData, actions) {
  const {
    handleViewProfile,
    handleConnectionPress,
    handleConnect,
    handleCancelPendingConnection,
    handleOpenConnectionOptions,
    cancellingConnectionId,
    connectingUserId,
  } = actions;
  return useCallback(
    ({ item: u }) => {
      const normalizedStatus = normalizeConnectionStatus(u.connectionStatus);
      const isPending = normalizedStatus === "pending";
      const isCancelling = isPending && (u.connectionId || u.id) === cancellingConnectionId;
      const isConnecting = !isPending && u.id === connectingUserId;
      return (
        <DiscoverUserCard
          user={u}
          onViewProfile={handleViewProfile}
          onConnectionPress={handleConnectionPress}
          onConnect={handleConnect}
          onCancelPending={handleCancelPendingConnection}
          onLongPress={handleOpenConnectionOptions}
          isPending={isPending}
          isCancelling={isCancelling}
          isConnecting={isConnecting}
          styles={styles}
        />
      );
    },
    [
      cancellingConnectionId,
      connectingUserId,
      handleViewProfile,
      handleConnectionPress,
      handleConnect,
      handleCancelPendingConnection,
      handleOpenConnectionOptions,
    ]
  );
}
