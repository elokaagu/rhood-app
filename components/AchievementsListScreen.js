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
import { db } from "../lib/supabase";
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
} from "../lib/sharedStyles";

export default function AchievementsListScreen({ user, onBack }) {
  const [allAchievements, setAllAchievements] = useState([]);
  const [userAchievements, setUserAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadAchievements();
  }, [user?.id]);

  const loadAchievements = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const [achievementsData, earnedData] = await Promise.all([
        db.getAchievements(),
        db.getUserAchievements(user.id),
      ]);

      // Create a set of earned achievement IDs
      const earnedIds = new Set(
        earnedData.map((ua) => ua.achievement_id)
      );

      // Combine all achievements with earned status
      const achievementsWithStatus = (achievementsData || []).map((achievement) => ({
        id: achievement.id,
        name: achievement.name,
        description: achievement.description || "",
        icon: achievement.icon || "trophy",
        category: achievement.category || "milestones",
        earned: earnedIds.has(achievement.id),
        earnedAt: earnedData.find(
          (ua) => ua.achievement_id === achievement.id
        )?.earned_at || null,
        creditsReward: achievement.credits_reward || 0,
      }));

      // Sort by earned status (earned first), then by sort_order
      achievementsWithStatus.sort((a, b) => {
        if (a.earned !== b.earned) {
          return a.earned ? -1 : 1;
        }
        return (a.sort_order || 0) - (b.sort_order || 0);
      });

      setAllAchievements(achievementsWithStatus);
      setUserAchievements(earnedData);
    } catch (error) {
      console.error("Error loading achievements:", error);
      setAllAchievements([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAchievements();
  };

  const earnedCount = allAchievements.filter((a) => a.earned).length;
  const totalCount = allAchievements.length;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Achievements</Text>
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
          <Text style={styles.headerTitle}>Achievements</Text>
          <Text style={styles.headerSubtitle}>
            {earnedCount} of {totalCount} earned
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Achievements List */}
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
        {allAchievements.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="trophy-outline"
              size={64}
              color={COLORS.textTertiary}
            />
            <Text style={styles.emptyTitle}>No Achievements Available</Text>
            <Text style={styles.emptyText}>
              Achievements will appear here as you progress
            </Text>
          </View>
        ) : (
          allAchievements.map((achievement) => (
            <View
              key={achievement.id}
              style={[
                styles.achievementCard,
                achievement.earned && styles.achievementCardEarned,
              ]}
            >
              <View style={styles.achievementIconContainer}>
                <View
                  style={[
                    styles.achievementIconWrapper,
                    achievement.earned && styles.achievementIconWrapperEarned,
                  ]}
                >
                  <Ionicons
                    name={achievement.icon}
                    size={32}
                    color={
                      achievement.earned
                        ? COLORS.primary
                        : COLORS.textTertiary
                    }
                  />
                </View>
              </View>

              <View style={styles.achievementInfo}>
                <View style={styles.achievementHeader}>
                  <Text
                    style={[
                      styles.achievementName,
                      achievement.earned && styles.achievementNameEarned,
                    ]}
                  >
                    {achievement.name}
                  </Text>
                  {achievement.earned && achievement.creditsReward > 0 && (
                    <View style={styles.creditsBadge}>
                      <Ionicons
                        name="star"
                        size={12}
                        color={COLORS.background}
                      />
                      <Text style={styles.creditsText}>
                        {achievement.creditsReward}
                      </Text>
                    </View>
                  )}
                </View>

                {achievement.description && (
                  <Text
                    style={[
                      styles.achievementDescription,
                      !achievement.earned && styles.achievementDescriptionLocked,
                    ]}
                  >
                    {achievement.description}
                  </Text>
                )}

                {achievement.earned && achievement.earnedAt && (
                  <Text style={styles.achievementDate}>
                    Earned {new Date(achievement.earnedAt).toLocaleDateString()}
                  </Text>
                )}
              </View>

              {achievement.earned ? (
                <View style={styles.earnedBadge}>
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color={COLORS.primary}
                  />
                </View>
              ) : (
                <View style={styles.lockedBadge}>
                  <Ionicons
                    name="lock-closed"
                    size={20}
                    color={COLORS.textTertiary}
                  />
                </View>
              )}
            </View>
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
    paddingHorizontal: SPACING.xl,
  },
  achievementCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    opacity: 0.6,
  },
  achievementCardEarned: {
    borderColor: COLORS.primary,
    borderWidth: 1.5,
    opacity: 1,
  },
  achievementIconContainer: {
    marginRight: SPACING.md,
  },
  achievementIconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.backgroundTertiary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  achievementIconWrapperEarned: {
    backgroundColor: `${COLORS.primary}20`,
    borderColor: COLORS.primary,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    flexWrap: "wrap",
  },
  achievementName: {
    fontSize: TYPOGRAPHY.base,
    fontFamily: "TS Block Bold",
    color: COLORS.textSecondary,
    marginRight: SPACING.xs,
  },
  achievementNameEarned: {
    color: COLORS.textPrimary,
  },
  creditsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xs,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  creditsText: {
    fontSize: TYPOGRAPHY.xs,
    fontFamily: "TS Block Bold",
    color: COLORS.background,
  },
  achievementDescription: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
    lineHeight: 18,
  },
  achievementDescriptionLocked: {
    color: COLORS.textTertiary,
  },
  achievementDate: {
    fontSize: TYPOGRAPHY.xs,
    color: COLORS.primary,
    fontFamily: "Helvetica Neue",
  },
  earnedBadge: {
    marginLeft: SPACING.xs,
  },
  lockedBadge: {
    marginLeft: SPACING.xs,
    opacity: 0.5,
  },
});

