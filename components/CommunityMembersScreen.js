import React, { useState, useEffect } from "react";
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
import ProgressiveImage from "./ProgressiveImage";
import { supabase } from "../lib/supabase";
import { HapticPatterns } from "../lib/haptics";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, sharedStyles } from "../lib/sharedStyles";

export default function CommunityMembersScreen({
  communityId,
  communityName,
  onBack,
  onNavigate,
}) {
  const insets = useSafeAreaInsets();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadMembers = async ({ isRefresh = false } = {}) => {
    try {
      setError(null);
      if (!isRefresh) {
        setLoading(true);
      }

      // Validate communityId
      if (!communityId) {
        throw new Error("Community ID is missing");
      }

      if (__DEV__) {
        console.log("🔍 Loading members for community:", communityId);
      }

      // Try the foreign key relationship first
      let { data, error: fetchError } = await supabase
        .from("community_members")
        .select(
          `
          *,
          user:user_profiles!community_members_user_id_fkey (
            id,
            dj_name,
            full_name,
            username,
            profile_image_url,
            location,
            city,
            bio
          )
        `
        )
        .eq("community_id", communityId)
        .order("joined_at", { ascending: false });

      // If foreign key relationship fails, try manual join
      if (fetchError) {
        if (__DEV__) {
          console.warn("⚠️ Foreign key query failed, trying manual join:", fetchError);
        }
        
        // Get community members first
        const { data: membersData, error: membersError } = await supabase
          .from("community_members")
          .select("*")
          .eq("community_id", communityId)
          .order("joined_at", { ascending: false });

        if (membersError) throw membersError;

        // Then get user profiles for each member
        if (membersData && membersData.length > 0) {
          const userIds = [
            ...new Set(membersData.map((m) => m.user_id).filter(Boolean)),
          ];
          
          if (userIds.length > 0) {
            const { data: usersData, error: usersError } = await supabase
              .from("user_profiles")
              .select("id, dj_name, full_name, username, profile_image_url, location, city, bio")
              .in("id", userIds);

            if (usersError && __DEV__) {
              console.warn("⚠️ Error fetching user profiles:", usersError);
            }

            // Combine members with user data
            data = membersData.map((member) => ({
              ...member,
              user: usersData?.find((u) => u.id === member.user_id) || null,
            }));
          } else {
            data = [];
          }
        } else {
          data = [];
        }
      }

      // Filter out any members without user data
      const validMembers = (data || []).filter((member) => member?.user?.id);
      
      if (__DEV__) {
        console.log(`✅ Loaded ${validMembers.length} members for community`);
      }
      setMembers(validMembers);
    } catch (err) {
      if (__DEV__) {
        console.error("❌ Error loading community members:", err);
      }
      const errorMessage = err.message || "Failed to load members. Please try again.";
      setError(errorMessage);
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [communityId]);

  const handleRefresh = () => {
    setRefreshing(true);
    setError(null);
    loadMembers({ isRefresh: true });
  };

  const handleRetry = () => {
    setError(null);
    loadMembers();
  };

  const handleMemberPress = (member) => {
    if (!member.user?.id) return;
    HapticPatterns.buttonPress();
    if (onNavigate) {
      onNavigate("user-profile", { userId: member.user.id });
    }
  };

  const getDisplayName = (user) => {
    return user.dj_name || user.full_name || user.username || "DJ";
  };

  const getLocation = (user) => {
    return user.location || user.city || "Unknown Location";
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <View style={styles.headerSide}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                HapticPatterns.backButton();
                onBack();
              }}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {communityName || "Community Members"}
            </Text>
          </View>
          <View style={styles.headerSide} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading members...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.headerSide}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              HapticPatterns.backButton();
              onBack();
            }}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {communityName || "Community Members"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {members.length} member{members.length !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={styles.headerSide} />
      </View>

      {error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={COLORS.textSecondary} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            disabled={loading}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : members.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={64} color={COLORS.textSecondary} />
          <Text style={styles.emptyTitle}>No Members</Text>
          <Text style={styles.emptySubtitle}>
            This community doesn't have any members yet.
          </Text>
        </View>
      ) : (
        <FlatList
          style={styles.membersList}
          contentContainerStyle={styles.membersContent}
          data={members}
          keyExtractor={(member) => String(member.id)}
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
          renderItem={({ item: member }) => {
            const user = member.user;
            if (!user) return null;

            return (
              <TouchableOpacity
                style={styles.memberCard}
                onPress={() => handleMemberPress(member)}
                activeOpacity={0.7}
              >
                <ProgressiveImage
                  source={
                    user.profile_image_url
                      ? { uri: user.profile_image_url }
                      : require("../assets/rhood_logo.webp")
                  }
                  style={styles.memberAvatar}
                  placeholderStyle={styles.memberAvatarPlaceholder}
                />
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{getDisplayName(user)}</Text>
                  <Text style={styles.memberLocation}>{getLocation(user)}</Text>
                  {user.bio && (
                    <Text style={styles.memberBio} numberOfLines={2}>
                      {user.bio}
                    </Text>
                  )}
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            );
          }}
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    ...sharedStyles.bodyText,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
  },
  errorText: {
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
  emptyContainer: {
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
  emptySubtitle: {
    ...sharedStyles.bodyText,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  membersList: {
    flex: 1,
  },
  membersContent: {
    padding: SPACING.md,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.backgroundCard,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  memberAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: SPACING.md,
  },
  memberAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.border,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    ...sharedStyles.tsBlockBoldHeading,
    fontSize: TYPOGRAPHY.md,
    color: COLORS.primary,
    marginBottom: 2,
  },
  memberLocation: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
    fontFamily: "Helvetica Neue",
    marginBottom: 4,
  },
  memberBio: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
    fontFamily: "Helvetica Neue",
    lineHeight: 18,
  },
});

