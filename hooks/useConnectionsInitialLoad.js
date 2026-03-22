import { useEffect } from "react";
import { Animated } from "react-native";

/**
 * One-time bootstrap: connections + discover lists (mount only; cache fast-path preserved).
 */
export function useConnectionsInitialLoad({
  userId,
  connectionsData,
  discoverData,
}) {
  useEffect(() => {
    const initializeData = async () => {
      if (userId && connectionsData.hydrateFromCacheIfAvailable(userId)) {
        discoverData.loadDiscoverDJs().catch(() => {});
        discoverData.loadPopularDJs().catch(() => {});
        discoverData.loadNearbyDJs().catch(() => {});
        discoverData.loadNearbyOpportunities().catch(() => {});
        return;
      }
      const connectionsPromise = connectionsData
        .loadUserAndConnections({ showLoader: true, deferLoadingEnd: true })
        .then(async () => {
          await connectionsData.checkRhoodMembership();
          connectionsData.setLoading(false);
          connectionsData.setHasLoadedConnections(true);
          connectionsData.lastLoadedAtRef.current = Date.now();
          Animated.timing(connectionsData.connectionsFadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
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
    // Intentionally run once on mount; sub-hooks hold latest loaders in closures.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap only
  }, []);
}
