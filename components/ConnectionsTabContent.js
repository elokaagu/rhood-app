import React, { memo } from "react";
import { View, Text, TouchableOpacity, ScrollView, Animated, SectionList, RefreshControl } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CONNECTIONS_LIST_PERFORMANCE } from "../lib/performanceConstants";
import styles from "./ConnectionsScreen.styles";

/**
 * Shared scroll shell for skeleton + full-screen error (same layout, avoids duplication).
 */
function ConnectionsTabScrollShell({ refreshControlEl, contentContainerStyle, children }) {
  return (
    <ScrollView
      style={styles.flex1}
      contentContainerStyle={[styles.messagesList, styles.listContent, contentContainerStyle]}
      refreshControl={refreshControlEl}
    >
      {children}
    </ScrollView>
  );
}

/**
 * Memoized connections tab content (skeleton / error / list).
 * Isolated so discover-tab state updates don't re-render this list.
 *
 * SectionList (not FlatList): `renderItem` branches on `section.key` ("communities" vs
 * "connections") and `getItemLayout` walks sections — grouping is structural, not visual.
 */
function ConnectionsTabContent({
  loading,
  hasLoadedConnections,
  connectionsLoadError,
  connectionsLength,
  connectionSections,
  refreshControlProps,
  onRetry,
  onGoToDiscover,
  onBrowseCommunities,
  renderItem,
  getItemLayout,
  fadeAnim,
}) {
  const refreshControlEl = refreshControlProps ? (
    <RefreshControl {...refreshControlProps} />
  ) : undefined;

  const showSkeleton = loading && !hasLoadedConnections;
  const showFullScreenError = connectionsLoadError && connectionsLength === 0;
  const showStaleLoadError = Boolean(connectionsLoadError && connectionsLength > 0);

  return (
    <Animated.View style={[styles.flex1, { opacity: fadeAnim }]}>
      {showSkeleton ? (
        <ConnectionsTabScrollShell refreshControlEl={refreshControlEl}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.skeletonRow}>
              <View style={styles.skeletonAvatar} />
              <View style={styles.skeletonLines}>
                <View style={styles.skeletonLine} />
                <View style={styles.skeletonLineShort} />
              </View>
            </View>
          ))}
        </ConnectionsTabScrollShell>
      ) : showFullScreenError ? (
        <ConnectionsTabScrollShell
          refreshControlEl={refreshControlEl}
          contentContainerStyle={styles.loadingContainer}
        >
          <Ionicons name="cloud-offline" size={40} color="hsl(0, 0%, 50%)" />
          <Text style={styles.noResultsTitle}>Something went wrong</Text>
          <Text style={styles.noResultsSubtitle}>{connectionsLoadError}</Text>
          <TouchableOpacity style={styles.ctaButton} onPress={onRetry} activeOpacity={0.8}>
            <Text style={styles.ctaButtonText}>Try again</Text>
          </TouchableOpacity>
        </ConnectionsTabScrollShell>
      ) : (
        <View style={styles.flex1}>
          {showStaleLoadError ? (
            <View style={styles.listStaleErrorBanner}>
              <Text style={styles.listStaleErrorText} numberOfLines={2}>
                {connectionsLoadError}
              </Text>
              <TouchableOpacity
                onPress={onRetry}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Retry loading connections"
              >
                <Text style={styles.listStaleErrorRetry}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <SectionList
            sections={connectionSections}
            keyExtractor={(item, index, section) => {
              const id = item?.id;
              const base = id != null ? String(id) : `idx-${index}`;
              return `${section?.key ?? "s"}-${base}`;
            }}
            renderItem={renderItem}
            renderSectionHeader={() => null}
            stickySectionHeadersEnabled={false}
            initialNumToRender={CONNECTIONS_LIST_PERFORMANCE.INITIAL_NUM_TO_RENDER}
            maxToRenderPerBatch={CONNECTIONS_LIST_PERFORMANCE.MAX_TO_RENDER_PER_BATCH}
            windowSize={CONNECTIONS_LIST_PERFORMANCE.WINDOW_SIZE}
            removeClippedSubviews={CONNECTIONS_LIST_PERFORMANCE.REMOVE_CLIPPED_SUBVIEWS}
            getItemLayout={getItemLayout}
            ListFooterComponent={
              <View style={styles.ctaSection}>
                <View style={styles.ctaCard}>
                  <Ionicons name="compass" size={24} color="hsl(0, 0%, 70%)" />
                  <Text style={styles.ctaTitle}>Discover DJs</Text>
                  <Text style={styles.ctaDescription}>
                    Find DJs to connect with and start conversations
                  </Text>
                  <TouchableOpacity
                    style={styles.ctaButton}
                    onPress={onGoToDiscover}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.ctaButtonText}>Go to Discover</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.ctaSecondaryLink}
                    onPress={onBrowseCommunities}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.ctaSecondaryLinkText}>Browse communities</Text>
                  </TouchableOpacity>
                </View>
              </View>
            }
            refreshControl={refreshControlEl}
            contentContainerStyle={[styles.messagesList, styles.listContent]}
            style={styles.flex1}
          />
        </View>
      )}
    </Animated.View>
  );
}

export default memo(ConnectionsTabContent);
