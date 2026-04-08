import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  memo,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProgressiveImage from "./ProgressiveImage";
import { db } from "../lib/supabase";
import { HapticPatterns } from "../lib/haptics";
import { connectionsService } from "../lib/connectionsService";
import { CONNECTIONS_LIST_PERFORMANCE } from "../lib/performanceConstants";
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
} from "../lib/sharedStyles";

/** Map API row → list item (mutual count filled in a second phase). */
function mapConnToRow(conn) {
  const userId = conn.connected_user_id;
  return {
    id: conn.id || userId,
    userId,
    djName: conn.connected_user_name ?? null,
    fullName: conn.connected_user_full_name ?? null,
    username: conn.connected_user_username ?? null,
    city: conn.connected_user_city ?? null,
    profileImage: conn.connected_user_image ?? null,
    statusMessage: conn.connected_user_status_message ?? null,
    genres: Array.isArray(conn.connected_user_genres)
      ? conn.connected_user_genres
      : [],
    isVerified: Boolean(conn.connected_user_verified),
    mutualConnections: 0,
  };
}

async function fetchMutualCounts(currentUserId, connectionsData) {
  return Promise.all(
    connectionsData.map(async (conn) => {
      const otherId = conn.connected_user_id;
      try {
        const mutual = await connectionsService.getMutualConnections(
          currentUserId,
          otherId
        );
        return { userId: otherId, count: mutual?.length || 0 };
      } catch (error) {
        if (__DEV__) {
          console.warn(
            `Failed to get mutual connections for ${otherId}:`,
            error
          );
        }
        return { userId: otherId, count: 0 };
      }
    })
  );
}

function ConnectionsListHeader({ onBack, connectionCount, loading }) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>
      <View style={styles.headerContent}>
        <Text style={styles.headerTitle}>Friends</Text>
        {!loading && connectionCount != null ? (
          <Text style={styles.headerSubtitle}>
            {connectionCount}{" "}
            {connectionCount === 1 ? "friend" : "friends"}
          </Text>
        ) : null}
      </View>
      <View style={styles.headerSpacer} />
    </View>
  );
}

const ConnectionRow = memo(function ConnectionRow({ connection, onPress }) {
  const displayName =
    connection.djName || connection.fullName || "Unknown";

  return (
    <TouchableOpacity
      style={styles.connectionCard}
      onPress={() => onPress(connection)}
      activeOpacity={0.7}
    >
      <View style={styles.connectionImageContainer}>
        <ProgressiveImage
          source={
            connection.profileImage ? { uri: connection.profileImage } : null
          }
          style={styles.connectionImage}
          placeholder={
            <View style={styles.connectionImagePlaceholder}>
              <Ionicons name="person" size={24} color={COLORS.textTertiary} />
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
            {displayName}
          </Text>
          {connection.username ? (
            <Text style={styles.connectionUsername}>
              @{connection.username}
            </Text>
          ) : null}
        </View>

        {connection.statusMessage ? (
          <Text style={styles.connectionStatus} numberOfLines={1}>
            {connection.statusMessage}
          </Text>
        ) : null}

        <View style={styles.connectionMeta}>
          {connection.city ? (
            <View style={styles.metaItem}>
              <Ionicons
                name="location-outline"
                size={14}
                color={COLORS.textSecondary}
              />
              <Text style={styles.metaText}>{connection.city}</Text>
            </View>
          ) : null}
          {connection.genres && connection.genres.length > 0 ? (
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
          ) : null}
          {connection.mutualConnections > 0 ? (
            <View style={styles.metaItem}>
              <Ionicons
                name="people-outline"
                size={14}
                color={COLORS.textSecondary}
              />
              <Text style={styles.metaText}>
                {connection.mutualConnections}{" "}
                {connection.mutualConnections === 1
                  ? "mutual connection"
                  : "mutual connections"}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={20}
        color={COLORS.textTertiary}
      />
    </TouchableOpacity>
  );
});

function ListEmptyDiscover({ onNavigate }) {
  return (
    <View style={styles.emptyContainer}>
      <Ionicons name="people-outline" size={64} color={COLORS.textTertiary} />
      <Text style={styles.emptyTitle}>No friends yet</Text>
      <Text style={styles.emptyText}>
        Discover DJs and send a connection request to grow your network
      </Text>
      <TouchableOpacity
        style={styles.discoverButton}
        onPress={() =>
          onNavigate?.("connections", { initialTab: "discover" })
        }
      >
        <Text style={styles.discoverButtonText}>Go to Discover</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ConnectionsListScreen({ user, onBack, onNavigate }) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleBack = useCallback(() => {
    HapticPatterns.backButton();
    onBack();
  }, [onBack]);

  const loadConnections = useCallback(
    async ({ isRefresh = false } = {}) => {
      if (!user?.id) {
        if (mountedRef.current) {
          setLoading(false);
        }
        return;
      }

      try {
        if (!isRefresh && mountedRef.current) {
          setLoading(true);
        }
        if (isRefresh && mountedRef.current) {
          setRefreshing(true);
        }

        const connectionsData = await db.getUserConnections(
          user.id,
          "accepted"
        );
        if (!mountedRef.current) return;

        const baseRows = connectionsData.map(mapConnToRow);
        setConnections(baseRows);

        if (!isRefresh && mountedRef.current) {
          setLoading(false);
        }

        const counts = await fetchMutualCounts(user.id, connectionsData);
        if (!mountedRef.current) return;

        setConnections((prev) => {
          const m = new Map(counts.map((c) => [c.userId, c.count]));
          return prev.map((row) =>
            m.has(row.userId)
              ? { ...row, mutualConnections: m.get(row.userId) ?? 0 }
              : row
          );
        });
      } catch (error) {
        if (__DEV__) {
          console.error("Error loading connections:", error);
        }
        if (mountedRef.current) {
          setConnections([]);
        }
      } finally {
        if (mountedRef.current) {
          if (!isRefresh) {
            setLoading(false);
          }
          setRefreshing(false);
        }
      }
    },
    [user?.id]
  );

  useEffect(() => {
    loadConnections({ isRefresh: false });
  }, [loadConnections]);

  const handleRefresh = useCallback(() => {
    loadConnections({ isRefresh: true });
  }, [loadConnections]);

  const handleConnectionPress = useCallback(
    (connection) => {
      if (onNavigate && connection.userId) {
        onNavigate("user-profile", { userId: connection.userId });
      }
    },
    [onNavigate]
  );

  const renderItem = useCallback(
    ({ item }) => (
      <ConnectionRow connection={item} onPress={handleConnectionPress} />
    ),
    [handleConnectionPress]
  );

  const keyExtractor = useCallback((item) => String(item.id), []);

  const listEmpty = useMemo(
    () => <ListEmptyDiscover onNavigate={onNavigate} />,
    [onNavigate]
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <ConnectionsListHeader
          onBack={handleBack}
          connectionCount={null}
          loading
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ConnectionsListHeader
        onBack={handleBack}
        connectionCount={connections.length}
        loading={false}
      />
      <FlatList
        data={connections}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={
          connections.length === 0
            ? [styles.listContent, styles.listContentEmpty]
            : styles.listContent
        }
        ListEmptyComponent={listEmpty}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        initialNumToRender={CONNECTIONS_LIST_PERFORMANCE.INITIAL_NUM_TO_RENDER}
        maxToRenderPerBatch={
          CONNECTIONS_LIST_PERFORMANCE.MAX_TO_RENDER_PER_BATCH
        }
        windowSize={CONNECTIONS_LIST_PERFORMANCE.WINDOW_SIZE}
        removeClippedSubviews={
          CONNECTIONS_LIST_PERFORMANCE.REMOVE_CLIPPED_SUBVIEWS
        }
      />
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
  listContent: {
    padding: SPACING.md,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: SPACING.xxl * 2,
    minHeight: 400,
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
