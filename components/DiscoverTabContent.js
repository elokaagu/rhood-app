import React, { memo } from "react";
import { View, Text, TouchableOpacity, FlatList, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DiscoverListHeader from "./DiscoverListHeader";
import DiscoverUserCard from "./DiscoverUserCard";
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
  nearbyDJs,
  nearbyOpportunities,
  searchQuery,
  userCity,
  onNavigate,
  onOpenLocationModal,
  incomingConnectionRequests,
  acceptingUserId,
  decliningUserId,
  onAcceptRequest,
  onDeclineRequest,
}) {
  const listHeader = (
    <DiscoverListHeader
      popularDJs={popularDJs}
      nearbyDJs={nearbyDJs}
      nearbyOpportunities={nearbyOpportunities}
      searchQuery={searchQuery}
      userCity={userCity}
      onNavigate={onNavigate}
      onOpenLocationModal={onOpenLocationModal}
      incomingConnectionRequests={incomingConnectionRequests}
      acceptingUserId={acceptingUserId}
      decliningUserId={decliningUserId}
      onAcceptRequest={onAcceptRequest}
      onDeclineRequest={onDeclineRequest}
    />
  );

  const listEmpty =
    discoverLoadError ? (
      <View style={[styles.discoverList, styles.loadingContainer]}>
        <Ionicons name="cloud-offline" size={40} color="hsl(0, 0%, 50%)" />
        <Text style={styles.noResultsTitle}>Something went wrong</Text>
        <Text style={styles.noResultsSubtitle}>{discoverLoadError}</Text>
        <TouchableOpacity style={styles.ctaButton} onPress={onDiscoverRetry} activeOpacity={0.8}>
          <Text style={styles.ctaButtonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    ) : discoverLoading ? (
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
    ) : null;

  return (
    <Animated.View style={[styles.flex1, { opacity: fadeAnim }]}>
      <FlatList
        data={filteredDiscoverUsers}
        keyExtractor={(item) => item.id}
        initialNumToRender={LIST_PERFORMANCE.INITIAL_NUM_TO_RENDER}
        maxToRenderPerBatch={LIST_PERFORMANCE.MAX_TO_RENDER_PER_BATCH}
        windowSize={LIST_PERFORMANCE.WINDOW_SIZE}
        removeClippedSubviews={LIST_PERFORMANCE.REMOVE_CLIPPED_SUBVIEWS}
        getItemLayout={getItemLayout}
        renderItem={renderItem}
        ListEmptyComponent={listEmpty}
        ListHeaderComponent={listHeader}
        refreshControl={refreshControl}
        contentContainerStyle={[styles.discoverList, styles.listContent]}
        style={styles.flex1}
      />
    </Animated.View>
  );
}

export default memo(DiscoverTabContent);
