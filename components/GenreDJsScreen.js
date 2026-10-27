import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import ProgressiveImage from "./ProgressiveImage";
import { loadGenreDJs } from "../lib/discoverLoaders";
import { canonicalGenre } from "../lib/opportunityGenres";
import { HapticPatterns } from "../lib/haptics";
import { SCREENS } from "../navigation/routes";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, sharedStyles } from "../lib/sharedStyles";

/**
 * Every DJ who lists a genre — opened by tapping a genre tag on a profile.
 *
 * Stack screens share one screenParams object, so opening a DJ from here
 * overwrites it. On regaining focus this screen hands `paramsOnReturn` (as
 * first rendered) back to `onRestoreParams`, so going back keeps this genre
 * and the profile underneath still shows the right DJ.
 */
export default function GenreDJsScreen({
  genre: genreParam,
  paramsOnReturn,
  onRestoreParams,
  onBack,
  onNavigate,
}) {
  const insets = useSafeAreaInsets();
  const [genre] = useState(() => canonicalGenre(genreParam));
  const [savedParams] = useState(paramsOnReturn);
  const [djs, setDjs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(
    async ({ isRefresh = false } = {}) => {
      try {
        setError(null);
        if (!isRefresh) setLoading(true);
        setDjs(await loadGenreDJs(genre));
      } catch (err) {
        if (__DEV__) console.error("Error loading genre DJs:", err);
        setError("Couldn't load DJs. Please try again.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [genre]
  );

  useEffect(() => {
    load();
  }, [load]);

  const hasBlurred = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (hasBlurred.current && savedParams) onRestoreParams?.(savedParams);
      return () => {
        hasBlurred.current = true;
      };
    }, [savedParams, onRestoreParams])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    load({ isRefresh: true });
  };

  const openDj = (dj) => {
    HapticPatterns.buttonPress();
    onNavigate?.(SCREENS.USER_PROFILE, { userId: dj.id, djName: dj.dj_name });
  };

  const renderHeader = (subtitle) => (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            HapticPatterns.backButton();
            onBack();
          }}
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
      <View style={styles.headerTitleContainer}>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {genre}
        </Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      <View style={styles.headerSide} />
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {renderHeader(null)}
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {renderHeader(error ? null : `${djs.length} DJ${djs.length === 1 ? "" : "s"}`)}

      {error ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle" size={48} color={COLORS.textSecondary} />
          <Text style={styles.messageText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => load()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : djs.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>No DJs yet</Text>
          <Text style={styles.messageText}>
            Nobody else lists {genre} on their profile yet.
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={djs}
          keyExtractor={(dj) => String(dj.id)}
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={11}
          removeClippedSubviews
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
          renderItem={({ item: dj }) => (
            <TouchableOpacity
              style={styles.djCard}
              onPress={() => openDj(dj)}
              activeOpacity={0.7}
            >
              <ProgressiveImage
                source={
                  dj.profile_image_url
                    ? { uri: dj.profile_image_url }
                    : require("../assets/rhood_logo.webp")
                }
                style={styles.avatar}
                placeholderStyle={styles.avatarPlaceholder}
              />
              <View style={styles.djInfo}>
                <Text style={styles.djName} numberOfLines={1}>
                  {dj.dj_name || dj.full_name || "DJ"}
                </Text>
                <Text style={styles.djLocation} numberOfLines={1}>
                  {dj.city || dj.location || "Location not set"}
                </Text>
                <Text style={styles.djGenres} numberOfLines={1}>
                  {dj.genres.map(canonicalGenre).join(" · ")}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        />
      )}
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
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  /** Same width as right rail so title stays visually centered */
  headerSide: {
    width: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    padding: SPACING.sm,
    marginLeft: -SPACING.sm,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...sharedStyles.tsBlockBoldHeading,
    fontSize: TYPOGRAPHY.lg,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
    fontFamily: "Helvetica Neue",
    marginTop: 2,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    ...sharedStyles.tsBlockBoldHeading,
    fontSize: TYPOGRAPHY.xl,
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  messageText: {
    ...sharedStyles.bodyText,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  retryButtonText: {
    ...sharedStyles.buttonText,
    color: COLORS.background,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: SPACING.md,
  },
  djCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.backgroundCard,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: SPACING.md,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.border,
  },
  djInfo: {
    flex: 1,
  },
  djName: {
    ...sharedStyles.tsBlockBoldHeading,
    fontSize: TYPOGRAPHY.md,
    color: COLORS.primary,
    marginBottom: 2,
  },
  djLocation: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
    fontFamily: "Helvetica Neue",
    marginBottom: 2,
  },
  djGenres: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textTertiary,
    fontFamily: "Helvetica Neue",
  },
});
