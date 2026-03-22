import React, { memo, useMemo } from "react";
import { View, Text, TouchableOpacity, FlatList, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DiscoverListHeader from "./DiscoverListHeader";
import { LIST_PERFORMANCE } from "../lib/performanceConstants";
import styles from "./ConnectionsScreen.styles";

/**
 * Memoized Discover tab (header carousels + user list).
 * Reduces re-renders when only Connections tab state changes.
 */
function DiscoverTabContent({
  filteredDiscoverUsers,
  discoverLoading,
  discoverLoadError,
  onDiscoverRetry,
  refreshControl,
  renderItem,
  getItemLayout,
  fadeAnim,
  popularDJs,
  popularDJsLoading,
  nearbyDJs,
  nearbyDJsLoading,
  nearbyOpportunities,
  nearbyOpportunitiesLoading,
  searchQuery,
  onNavigate,
  onOpenLocationModal,
  incomingConnectionRequests,
  acceptingUserId,
  decliningUserId,
  onAcceptRequest,
  onDeclineRequest,
}) {
  const listHeaderComponent = useMemo(
    () => (
      <DiscoverListHeader
        popularDJs={popularDJs}
        popularDJsLoading={popularDJsLoading}
        nearbyDJs={nearbyDJs}
        nearbyDJsLoading={nearbyDJsLoading}
        nearbyOpportunities={nearbyOpportunities}
        nearbyOpportunitiesLoading={nearbyOpportunitiesLoading}
        searchQuery={searchQuery}
        onNavigate={onNavigate}
        onOpenLocationModal={onOpenLocationModal}
        incomingConnectionRequests={incomingConnectionRequests}
        acceptingUserId={acceptingUserId}
        decliningUserId={decliningUserId}
        onAcceptRequest={onAcceptRequest}
        onDeclineRequest={onDeclineRequest}
      />
    ),
    [
      popularDJs,
      popularDJsLoading,
      nearbyDJs,
      nearbyDJsLoading,
      nearbyOpportunities,
      nearbyOpportunitiesLoading,
      searchQuery,
      onNavigate,
      onOpenLocationModal,
      incomingConnectionRequests,
      acceptingUserId,
      decliningUserId,
      onAcceptRequest,
      onDeclineRequest,
    ]
  );

  const listEmptyComponent = useMemo(() => {
    if (discoverLoadError) {
      return (
        <View style={[styles.discoverList, styles.loadingContainer]}>
          <Ionicons name="cloud-offline" size={40} color="hsl(0, 0%, 50%)" />
          <Text style={styles.noResultsTitle}>Something went wrong</Text>
          <Text style={styles.noResultsSubtitle}>{discoverLoadError}</Text>
          <TouchableOpacity style={styles.ctaButton} onPress={onDiscoverRetry} activeOpacity={0.8}>
            <Text style={styles.ctaButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (discoverLoading) {
      return (
        <View style={styles.discoverList}>
          {[1, 2, 3, 4].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <View style={styles.skeletonCardAvatar} />
              <View style={styles.skeletonCardLines}>
                <View style={styles.skeletonCardLine} />
                <View style={styles.skeletonCardLineSmall} />
                <View style={styles.skeletonCardLineSmall} />
              </View>
            </View>
          ))}
        </View>
      );
    }
    const trimmedSearch = searchQuery?.trim();
    return (
      <View style={[styles.discoverList, styles.loadingContainer]}>
        <Ionicons
          name={trimmedSearch ? "search-outline" : "people-outline"}
          size={40}
          color="hsl(0, 0%, 50%)"
        />
        <Text style={styles.noResultsTitle}>
          {trimmedSearch ? "No DJs match your search" : "No DJs to show yet"}
        </Text>
        <Text style={styles.noResultsSubtitle}>
          {trimmedSearch
            ? "Try a different name or clear the search"
            : "Pull to refresh or check back later"}
        </Text>
      </View>
    );
  }, [discoverLoadError, discoverLoading, onDiscoverRetry, searchQuery]);

  const isEmpty = filteredDiscoverUsers.length === 0;
  const contentContainerStyle = useMemo(
    () => [
      styles.discoverList,
      styles.listContent,
      isEmpty && styles.listContentGrow,
    ],
    [isEmpty]
  );

  return (
    <Animated.View style={[styles.flex1, { opacity: fadeAnim }]}>
      <FlatList
        data={filteredDiscoverUsers}
        keyExtractor={(item, index) =>
          item?.id != null ? String(item.id) : `discover-user-${index}`
        }
        initialNumToRender={LIST_PERFORMANCE.INITIAL_NUM_TO_RENDER}
        maxToRenderPerBatch={LIST_PERFORMANCE.MAX_TO_RENDER_PER_BATCH}
        windowSize={LIST_PERFORMANCE.WINDOW_SIZE}
        removeClippedSubviews={LIST_PERFORMANCE.REMOVE_CLIPPED_SUBVIEWS}
        getItemLayout={getItemLayout}
        renderItem={renderItem}
        ListEmptyComponent={listEmptyComponent}
        ListHeaderComponent={listHeaderComponent}
        refreshControl={refreshControl}
        contentContainerStyle={contentContainerStyle}
        style={styles.flex1}
      />
    </Animated.View>
  );
}

export default memo(DiscoverTabContent);
