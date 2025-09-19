import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import ProgressiveImage from "./ProgressiveImage";
import { RH } from "../src/design/tokens";

// Mock connections data
const mockConnections = [
  {
    id: 1,
    name: "Marcus Chen",
    username: "@marcusbeats",
    location: "Shoreditch, London",
    genres: ["House", "Tech House"],
    profileImage:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
    rating: 4.9,
    gigsCompleted: 24,
    lastActive: "2 hours ago",
    mutualConnections: 3,
    status: "online",
  },
  {
    id: 2,
    name: "Sofia Rodriguez",
    username: "@sofiavibes",
    location: "Camden, London",
    genres: ["Techno", "Progressive"],
    profileImage:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
    rating: 4.7,
    gigsCompleted: 18,
    lastActive: "1 day ago",
    mutualConnections: 7,
    status: "recently_active",
  },
  {
    id: 3,
    name: "Alex Thompson",
    username: "@alexunderground",
    location: "Hackney, London",
    genres: ["Drum & Bass", "Jungle"],
    profileImage:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
    rating: 4.8,
    gigsCompleted: 31,
    lastActive: "30 mins ago",
    mutualConnections: 2,
    status: "online",
  },
  {
    id: 4,
    name: "Luna Martinez",
    username: "@lunabeats",
    location: "Barcelona, Spain",
    genres: ["Progressive", "Trance"],
    profileImage:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
    rating: 4.6,
    gigsCompleted: 15,
    lastActive: "3 hours ago",
    mutualConnections: 5,
    status: "recently_active",
  },
  {
    id: 5,
    name: "Max Blackwood",
    username: "@maxindustrial",
    location: "Berlin, Germany",
    genres: ["Industrial", "Dark Techno"],
    profileImage:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
    rating: 4.9,
    gigsCompleted: 42,
    lastActive: "1 week ago",
    mutualConnections: 1,
    status: "offline",
  },
  {
    id: 6,
    name: "Zara Kim",
    username: "@zarasyntwave",
    location: "Tokyo, Japan",
    genres: ["Synthwave", "Retro"],
    profileImage:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face",
    rating: 4.8,
    gigsCompleted: 28,
    lastActive: "4 hours ago",
    mutualConnections: 4,
    status: "online",
  },
];

export default function ConnectionsScreen({ onNavigate }) {
  // Calculate bottom padding for floating tab bar
  const tabBarHeight = useBottomTabBarHeight();
  const padBottom = tabBarHeight + RH.space.xl; // extra breathing room

  const handleGroupChatPress = () => {
    onNavigate && onNavigate("messages", { isGroupChat: true });
  };

  const handleConnectionPress = (connection) => {
    onNavigate &&
      onNavigate("messages", { isGroupChat: false, djId: connection.id });
  };

  const handleBrowseCommunity = () => {
    onNavigate && onNavigate("community");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "online":
        return "hsl(120, 100%, 50%)";
      case "recently_active":
        return "hsl(45, 100%, 50%)";
      case "offline":
        return "hsl(0, 0%, 50%)";
      default:
        return "hsl(0, 0%, 50%)";
    }
  };

  const getLastMessage = (connectionId) => {
    const messages = {
      1: "Hey! Are you free for that gig next week?",
      2: "Thanks for the connection! Let's collaborate soon",
      3: "That drum & bass set was incredible! 🎵",
      4: "Love your progressive tracks!",
      5: "When are you back in Berlin?",
      6: "Your synthwave mix was amazing!",
    };
    return messages[connectionId] || "New connection";
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: padBottom }}
    >
      {/* Pinned Group Chat Section */}
      <View style={styles.pinnedGroup}>
        <TouchableOpacity
          style={styles.groupChatItem}
          onPress={handleGroupChatPress}
        >
          {/* Group Avatar */}
          <View style={styles.groupAvatarContainer}>
            <View style={styles.groupAvatar}>
              <Ionicons name="people" size={24} color="hsl(0, 0%, 0%)" />
            </View>
            {/* Online Status Indicator */}
            <View style={styles.onlineIndicator} />
          </View>

          {/* Group Chat Info */}
          <View style={styles.groupInfo}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupName}>Rhood Group</Text>
              <Text style={styles.groupTime}>2m</Text>
            </View>
            <Text style={styles.groupMessage} numberOfLines={1}>
              Sofia: Yeah, the set was amazing! 🔥
            </Text>
            <View style={styles.groupBadges}>
              <View style={styles.pinnedBadge}>
                <Text style={styles.pinnedBadgeText}>Pinned</Text>
              </View>
              <Text style={styles.memberCount}>12 members</Text>
            </View>
          </View>

          {/* Unread Messages Counter */}
          <View style={styles.unreadCounter}>
            <Text style={styles.unreadCount}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Individual Connections List */}
      <View style={styles.connectionsList}>
        {mockConnections.map((connection) => (
          <TouchableOpacity
            key={connection.id}
            style={styles.connectionItem}
            onPress={() => handleConnectionPress(connection)}
          >
            <View style={styles.connectionContent}>
              {/* Profile Image with Online Status */}
              <View style={styles.profileContainer}>
                <ProgressiveImage
                  source={{ uri: connection.profileImage }}
                  style={styles.profileImage}
                />
                {connection.status === "online" && (
                  <View
                    style={[
                      styles.statusIndicator,
                      { backgroundColor: getStatusColor(connection.status) },
                    ]}
                  />
                )}
              </View>

              {/* Connection Info */}
              <View style={styles.connectionInfo}>
                {/* Name and Last Active Time */}
                <View style={styles.connectionHeader}>
                  <Text style={styles.connectionName} numberOfLines={1}>
                    {connection.name}
                  </Text>
                  <Text style={styles.lastActive}>{connection.lastActive}</Text>
                </View>

                {/* Last Message Preview */}
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {getLastMessage(connection.id)}
                </Text>

                {/* Genre Tags */}
                <View style={styles.genreTags}>
                  {connection.genres.slice(0, 2).map((genre) => (
                    <View key={genre} style={styles.genreTag}>
                      <Text style={styles.genreTagText}>{genre}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Unread Message Indicator */}
              {connection.id === 1 && <View style={styles.unreadDot} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Add Connection Call-to-Action */}
      <View style={styles.ctaSection}>
        <View style={styles.ctaCard}>
          <Ionicons name="person-add" size={24} color="hsl(0, 0%, 70%)" />
          <Text style={styles.ctaTitle}>Find More Connections</Text>
          <Text style={styles.ctaDescription}>
            Discover DJs and industry professionals
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={handleBrowseCommunity}
          >
            <Text style={styles.ctaButtonText}>Browse Community</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  pinnedGroup: {
    backgroundColor: "hsl(0, 0%, 5%)",
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
    padding: 16,
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  groupChatItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  groupAvatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  groupAvatar: {
    width: 48,
    height: 48,
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  onlineIndicator: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    backgroundColor: "hsl(120, 100%, 50%)",
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "hsl(0, 0%, 5%)",
  },
  groupInfo: {
    flex: 1,
    marginRight: 12,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  groupName: {
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
  groupTime: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
  },
  groupMessage: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
    marginBottom: 8,
  },
  groupBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pinnedBadge: {
    backgroundColor: "hsla(75, 100%, 60%, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "hsla(75, 100%, 60%, 0.3)",
  },
  pinnedBadgeText: {
    fontSize: 10,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(75, 100%, 60%)",
  },
  memberCount: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
  },
  unreadCounter: {
    width: 20,
    height: 20,
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  unreadCount: {
    fontSize: 12,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
  },
  connectionsList: {
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  connectionItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  connectionContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileContainer: {
    position: "relative",
    marginRight: 12,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  statusIndicator: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "hsl(0, 0%, 0%)",
  },
  connectionInfo: {
    flex: 1,
    marginRight: 12,
  },
  connectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  connectionName: {
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    flex: 1,
  },
  lastActive: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
  },
  lastMessage: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
    marginBottom: 8,
  },
  genreTags: {
    flexDirection: "row",
    gap: 6,
  },
  genreTag: {
    backgroundColor: "hsl(0, 0%, 15%)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  genreTagText: {
    fontSize: 10,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
  },
  unreadDot: {
    width: 8,
    height: 8,
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 4,
  },
  ctaSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "hsl(0, 0%, 15%)",
  },
  ctaCard: {
    backgroundColor: "hsl(0, 0%, 5%)",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  ctaTitle: {
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginTop: 8,
    marginBottom: 4,
  },
  ctaDescription: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    marginBottom: 16,
  },
  ctaButton: {
    backgroundColor: "hsl(0, 0%, 15%)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 25%)",
  },
  ctaButtonText: {
    fontSize: 14,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
});
