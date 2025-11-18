import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProgressiveImage from "./ProgressiveImage";
import { db } from "../lib/supabase";
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  sharedStyles,
} from "../lib/sharedStyles";

export default function ConnectionsListScreen({ user, onBack, onNavigate }) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadConnections();
  }, [user?.id]);

  const loadConnections = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Get only accepted connections
      const connectionsData = await db.getUserConnections(user.id, "accepted");
      
      // Transform to get the connected user (not the current user)
      const transformedConnections = connectionsData.map((conn) => {
        // The getUserConnections function returns data with connected_user_id and connected_user_* fields
        // Handle both RPC format and fallback format
        const userId = conn.connected_user_id;
        const djName = conn.connected_user_name || "Unknown";
        const fullName = conn.connected_user_full_name || null;
        const username = conn.connected_user_username || null;
        const city = conn.connected_user_city || null;
        const profileImage = conn.connected_user_image || null;
        const statusMessage = conn.connected_user_status_message || null;
        const genres = conn.connected_user_genres || [];
        const isVerified = conn.connected_user_verified || false;
        
        return {
          id: conn.id || userId,
          userId: userId,
          djName: djName,
          fullName: fullName,
          username: username,
          city: city,
          profileImage: profileImage,
          statusMessage: statusMessage,
          genres: genres,
          isVerified: isVerified,
        };
      });

      setConnections(transformedConnections);
    } catch (error) {
      console.error("Error loading connections:", error);
      setConnections([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadConnections();
  };

  const handleConnectionPress = (connection) => {
    if (onNavigate && connection.userId) {
      onNavigate("user-profile", { userId: connection.userId });
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Connections</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Connections</Text>
          <Text style={styles.headerSubtitle}>
            {connections.length} {connections.length === 1 ? "connection" : "connections"}
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Connections List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {connections.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="people-outline"
              size={64}
              color={COLORS.textTertiary}
            />
            <Text style={styles.emptyTitle}>No Connections Yet</Text>
            <Text style={styles.emptyText}>
              Start connecting with other DJs to build your network
            </Text>
            <TouchableOpacity
              style={styles.discoverButton}
              onPress={() => onNavigate && onNavigate("connections")}
            >
              <Text style={styles.discoverButtonText}>Discover DJs</Text>
            </TouchableOpacity>
          </View>
        ) : (
          connections.map((connection) => (
            <TouchableOpacity
              key={connection.id}
              style={styles.connectionCard}
              onPress={() => handleConnectionPress(connection)}
              activeOpacity={0.7}
            >
              <View style={styles.connectionImageContainer}>
                <ProgressiveImage
                  source={connection.profileImage ? { uri: connection.profileImage } : null}
                  style={styles.connectionImage}
                  placeholder={
                    <View style={styles.connectionImagePlaceholder}>
                      <Ionicons
                        name="person"
                        size={24}
                        color={COLORS.textTertiary}
                      />
                    </View>
                  }
                />
                {connection.isVerified && (
                  <View style={styles.verifiedBadge}>
                    <Ionicons name="checkmark" size={10} color={COLORS.background} />
                  </View>
                )}
              </View>

              <View style={styles.connectionInfo}>
                <View style={styles.connectionHeader}>
                  <Text style={styles.connectionName} numberOfLines={1}>
                    {connection.djName}
                  </Text>
                  {connection.username && (
                    <Text style={styles.connectionUsername}>
                      @{connection.username}
                    </Text>
                  )}
                </View>

                {connection.statusMessage && (
                  <Text style={styles.connectionStatus} numberOfLines={1}>
                    {connection.statusMessage}
                  </Text>
                )}

                <View style={styles.connectionMeta}>
                  {connection.city && (
                    <View style={styles.metaItem}>
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color={COLORS.textSecondary}
                      />
                      <Text style={styles.metaText}>{connection.city}</Text>
                    </View>
                  )}
                  {connection.genres && connection.genres.length > 0 && (
                    <View style={styles.metaItem}>
                      <Ionicons
                        name="musical-notes-outline"
                        size={14}
                        color={COLORS.textSecondary}
                      />
                      <Text style={styles.metaText} numberOfLines={1}>
                        {connection.genres.slice(0, 2).join(", ")}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <Ionicons
                name="chevron-forward"
                size={20}
                color={COLORS.textTertiary}
              />
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontFamily: "TS Block Bold",
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: SPACING.xxl * 2,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontFamily: "TS Block Bold",
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.base,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.xl,
    paddingHorizontal: SPACING.xl,
  },
  discoverButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
  },
  discoverButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontFamily: "TS Block Bold",
    color: COLORS.background,
  },
  connectionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  connectionImageContainer: {
    position: "relative",
    marginRight: SPACING.md,
  },
  connectionImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  connectionImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.backgroundTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.background,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  connectionName: {
    fontSize: TYPOGRAPHY.base,
    fontFamily: "TS Block Bold",
    color: COLORS.textPrimary,
    marginRight: SPACING.xs,
  },
  connectionUsername: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
  },
  connectionStatus: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  connectionMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  metaText: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
});

