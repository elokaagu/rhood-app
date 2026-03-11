import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import ProgressiveImage from "./ProgressiveImage";
import ProfileImagePlaceholder from "./ProfileImagePlaceholder";

/**
 * Single community row in the connections tab (e.g. R/HOOD group).
 * Used by ConnectionsScreen.
 */
export default function CommunityListItem({
  community,
  latestMessage,
  unreadCount,
  isRhood,
  onPress,
  formatMessageTime,
  styles,
}) {
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
              />
            }
          />
          <View style={styles.onlineIndicator} />
        </View>
        <View style={styles.messageInfo}>
          <View style={styles.messageHeader}>
            <Text style={styles.messageName}>
              {String(community.name || "Community")}
            </Text>
            <Text style={styles.messageTime}>
              {latestMessage
                ? String(
                    formatMessageTime(latestMessage.created_at) || ""
                  )
                : String("No messages")}
            </Text>
          </View>
          <Text style={styles.messagePreview} numberOfLines={1}>
            {latestMessage
              ? String(
                  `${String(latestMessage.author?.dj_name || latestMessage.author?.full_name || "User")}: ${String(latestMessage.content || "")}`
                )
              : String("Start a conversation")}
          </Text>
          <View style={styles.messageBadges}>
            {isRhood && (
              <View style={styles.pinnedBadge}>
                <Text style={styles.pinnedBadgeText}>Pinned</Text>
              </View>
            )}
            <Text style={styles.memberCount}>
              {String(
                `${community.member_count || 0} member${(community.member_count || 0) !== 1 ? "s" : ""}`
              )}
            </Text>
          </View>
        </View>
        {unreadCount > 0 && (
          <View style={styles.unreadCounter}>
            <Text style={styles.unreadCount}>
              {String(unreadCount || 0)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
