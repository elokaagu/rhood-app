import React, { memo } from "react";
import { View, Text, TouchableOpacity, ScrollView, Animated, SectionList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { CONNECTIONS_LIST_PERFORMANCE } from "../lib/performanceConstants";
import styles from "./ConnectionsScreen.styles";

/**
 * Memoized connections tab content (skeleton / error / SectionList).
 * Isolated so discover-tab state updates don't re-render this list.
 */
function ConnectionsTabContent({
  loading,
  hasLoadedConnections,
  connectionsLoadError,
  connectionsLength,
  connectionSections,
  refreshControl,
  onRetry,
  onBrowseCommunity,
  renderItem,
  getItemLayout,
  fadeAnim,
}) {
  const showSkeleton = loading && !hasLoadedConnections;
  const showError = connectionsLoadError && connectionsLength === 0;

  return (
    <Animated.View style={[styles.flex1, { opacity: fadeAnim }]}>
      {showSkeleton ? (
        <ScrollView
          style={styles.flex1}
          contentContainerStyle={[styles.messagesList, styles.listContent]}
          refreshControl={refreshControl}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={styles.skeletonRow}>
              <View style={styles.skeletonAvatar} />
              <View style={styles.skeletonLines}>
                <View style={styles.skeletonLine} />
                <View style={styles.skeletonLineShort} />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : showError ? (
        <ScrollView
          style={styles.flex1}
          contentContainerStyle={[styles.messagesList, styles.listContent, styles.loadingContainer]}
          refreshControl={refreshControl}
        >
          <Ionicons name="cloud-offline" size={40} color="hsl(0, 0%, 50%)" />
          <Text style={styles.noResultsTitle}>Something went wrong</Text>
          <Text style={styles.noResultsSubtitle}>{connectionsLoadError}</Text>
          <TouchableOpacity style={styles.ctaButton} onPress={onRetry} activeOpacity={0.8}>
            <Text style={styles.ctaButtonText}>Try again</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <SectionList
          sections={connectionSections}
          keyExtractor={(item) => item.id}
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
                <Ionicons name="person-add" size={24} color="hsl(0, 0%, 70%)" />
                <Text style={styles.ctaTitle}>Find More Connections</Text>
                <Text style={styles.ctaDescription}>
                  Connect with DJs and start conversations
                </Text>
                <TouchableOpacity style={styles.ctaButton} onPress={onBrowseCommunity}>
                  <Text style={styles.ctaButtonText}>Browse Communities</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          refreshControl={refreshControl}
          contentContainerStyle={[styles.messagesList, styles.listContent]}
          style={styles.flex1}
        />
      )}
    </Animated.View>
  );
}

export default memo(ConnectionsTabContent);
