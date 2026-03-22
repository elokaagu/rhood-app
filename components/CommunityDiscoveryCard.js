import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProgressiveImage from "./ProgressiveImage";

function getGenreIcon(genre) {
  switch ((genre || "").toLowerCase()) {
    case "underground":
      return "musical-notes";
    case "techno":
      return "pulse";
    case "local":
      return "location";
    case "deep house":
      return "headset";
    case "electronic":
      return "flash";
    default:
      return "people";
  }
}

function formatMemberCount(count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n < 0) return "0";
  if (n >= 1000) {
    return `${(n / 1000).toFixed(1)}k`;
  }
  return String(n);
}

/**
 * Single community row on the discovery / Community screen.
 */
export default function CommunityDiscoveryCard({
  community,
  onPress,
  onJoinPress,
}) {
  const avatars = community.memberAvatars || [];
  const featured = (community.featuredContent || "").trim();
  const lastPost = (community.lastPost || "").trim();

  return (
    <TouchableOpacity
      style={styles.communityCard}
      onPress={() => onPress(community)}
      activeOpacity={0.7}
    >
      <View style={styles.communityHeader}>
        <View style={styles.communityInfo}>
          <View style={styles.communityTitleRow}>
            <Ionicons
              name={getGenreIcon(community.genre)}
              size={20}
              color="hsl(75, 100%, 60%)"
              style={styles.genreIcon}
            />
            <Text style={styles.communityName}>
              {community.name || "Community"}
            </Text>
            {community.isTrending && (
              <View style={styles.trendingBadge}>
                <Text style={styles.trendingText}>🔥</Text>
              </View>
            )}
          </View>
          {(community.description || "").trim() ? (
            <Text style={styles.communityDescription} numberOfLines={3}>
              {community.description}
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={[
            styles.joinButton,
            community.isJoined && styles.joinedButton,
          ]}
          onPress={(e) => {
            e.stopPropagation();
            onJoinPress(community.id);
          }}
        >
          <Ionicons
            name={community.isJoined ? "checkmark" : "add"}
            size={16}
            color={
              community.isJoined
                ? "hsl(0, 0%, 0%)"
                : "hsl(75, 100%, 60%)"
            }
          />
          <Text
            style={[
              styles.joinButtonText,
              community.isJoined && styles.joinedButtonText,
            ]}
          >
            {community.isJoined ? "Joined" : "Join"}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.communityStats}>
        <View style={styles.statItem}>
          <Ionicons name="people" size={14} color="hsl(0, 0%, 70%)" />
          <Text style={styles.statText}>
            {formatMemberCount(community.memberCount)} members
          </Text>
        </View>
        <View style={[styles.statItem, styles.statItemRight]}>
          <Ionicons name="location" size={14} color="hsl(0, 0%, 70%)" />
          <Text style={styles.statText}>
            {community.location || "—"}
          </Text>
        </View>
      </View>

      {avatars.length > 0 && (
        <View style={styles.memberAvatars}>
          <Text style={styles.memberAvatarsLabel}>Recent members:</Text>
          <View style={styles.avatarContainer}>
            {avatars.slice(0, 5).map((avatar, index) => (
              <ProgressiveImage
                key={index}
                source={{ uri: avatar }}
                style={[
                  styles.memberAvatar,
                  { marginLeft: index > 0 ? -8 : 0 },
                ]}
              />
            ))}
            {avatars.length > 5 && (
              <View style={[styles.memberAvatar, styles.moreAvatars]}>
                <Text style={styles.moreAvatarsText}>
                  +{avatars.length - 5}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {featured ? (
        <View style={styles.featuredContent}>
          <Ionicons name="star" size={14} color="hsl(75, 100%, 60%)" />
          <Text style={styles.featuredText}>{featured}</Text>
        </View>
      ) : null}

      {lastPost ? (
        <View style={styles.lastPost}>
          <Text style={styles.lastPostText} numberOfLines={1}>
            {lastPost}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  communityCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    padding: 16,
  },
  communityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  communityInfo: {
    flex: 1,
    marginRight: 12,
  },
  communityTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  genreIcon: {
    marginRight: 8,
  },
  communityName: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    color: "hsl(75, 100%, 60%)",
    flex: 1,
  },
  trendingBadge: {
    marginLeft: 8,
  },
  trendingText: {
    fontSize: 14,
  },
  communityDescription: {
    fontSize: 14,
    color: "hsl(0, 0%, 65%)",
    fontFamily: "Helvetica Neue",
    lineHeight: 18,
  },
  joinButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "transparent",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%)",
  },
  joinedButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    borderColor: "hsl(75, 100%, 60%)",
  },
  joinButtonText: {
    fontSize: 12,
    color: "hsl(75, 100%, 60%)",
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    marginLeft: 4,
  },
  joinedButtonText: {
    color: "hsl(0, 0%, 0%)",
  },
  communityStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statItemRight: {
    flex: 0,
    marginLeft: "auto",
  },
  statText: {
    fontSize: 12,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Helvetica Neue",
    marginLeft: 4,
  },
  memberAvatars: {
    marginBottom: 12,
  },
  memberAvatarsLabel: {
    fontSize: 12,
    color: "hsl(0, 0%, 50%)",
    fontFamily: "Helvetica Neue",
    marginBottom: 8,
  },
  avatarContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  memberAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "hsl(0, 0%, 15%)",
  },
  moreAvatars: {
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
  },
  moreAvatarsText: {
    fontSize: 10,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
  },
  featuredContent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 11%)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "hsl(75, 55%, 28%)",
  },
  featuredText: {
    fontSize: 13,
    color: "hsl(0, 0%, 96%)",
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
    marginLeft: 6,
    flex: 1,
  },
  lastPost: {
    backgroundColor: "hsl(0, 0%, 5%)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  lastPostText: {
    fontSize: 11,
    color: "hsl(0, 0%, 45%)",
    fontFamily: "Helvetica Neue",
    fontStyle: "italic",
  },
});
