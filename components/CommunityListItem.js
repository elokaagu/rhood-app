import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import ProgressiveImage from "./ProgressiveImage";
import ProfileImagePlaceholder from "./ProfileImagePlaceholder";

/**
 * Single community row in the connections tab (e.g. R/HOOD group).
 * Plain layout wrapper (no per-row fade) — scroll performance + section-level fade on ConnectionsScreen.
 */
function CommunityListItem({
  community,
  latestMessage,
  unreadCount,
  isRhood,
  onPress,
  formatMessageTime,
  styles,
}) {
  const authorName =
    latestMessage?.author?.dj_name ||
    latestMessage?.author?.full_name ||
    "User";
  const previewText = latestMessage
    ? `${authorName}: ${latestMessage.content?.trim() || "shared an update"}`
    : "Start a conversation";

  const memberCount = community.member_count || 0;
  const memberLabel = `${memberCount} member${memberCount !== 1 ? "s" : ""}`;

  return (
    <TouchableOpacity
      style={styles.messageItem}
      onPress={() => onPress(community.id)}
    >
      <View style={styles.messageContent}>
        <View style={styles.avatarContainer}>
          <ProgressiveImage
            source={
              community.image_url
                ? { uri: community.image_url }
                : require("../assets/rhood_logo.webp")
            }
            style={styles.profileImage}
            placeholder={
              <ProfileImagePlaceholder
                size={48}
                style={styles.profileImage}
                name={community.name}
              />
            }
            transition={0}
          />
        </View>
        <View style={styles.messageInfo}>
          <View style={styles.messageHeader}>
            <Text style={styles.messageName}>
              {community.name || "Community"}
            </Text>
            <Text style={styles.messageTime}>
              {latestMessage
                ? formatMessageTime(latestMessage.created_at) || ""
                : "No messages"}
            </Text>
          </View>
          <Text style={styles.messagePreview} numberOfLines={1}>
            {previewText}
          </Text>
          <View style={styles.messageBadges}>
            {isRhood && (
              <View style={styles.pinnedBadge}>
                <Text style={styles.pinnedBadgeText}>Pinned</Text>
              </View>
            )}
            <Text style={styles.memberCount}>{memberLabel}</Text>
          </View>
        </View>
        {unreadCount > 0 && (
          <View style={styles.unreadCounter}>
            <Text style={styles.unreadCount}>{unreadCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default memo(CommunityListItem);
