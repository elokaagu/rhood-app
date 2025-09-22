import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  StyleSheet,
  TextInput,
  Animated,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ProgressiveImage from "./ProgressiveImage";
import * as Haptics from "expo-haptics";

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
    id: 3,
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
    id: 4,
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
    id: 5,
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
  {
    id: 6,
    name: "Khadija Hashi",
    username: "@khadijabeats",
    location: "Nairobi, Kenya",
    genres: ["Afro House", "Deep House"],
    profileImage:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face",
    rating: 4.9,
    gigsCompleted: 35,
    lastActive: "1 hour ago",
    mutualConnections: 6,
    status: "online",
  },
];

export default function ConnectionsScreen({ onNavigate }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(null);

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

  // Filter connections based on search query
  const filteredConnections = useMemo(() => {
    let filtered = mockConnections;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (connection) =>
          connection.name.toLowerCase().includes(query) ||
          connection.username.toLowerCase().includes(query) ||
          connection.location.toLowerCase().includes(query) ||
          connection.genres.some((genre) => genre.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [searchQuery]);

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
      2: "That drum & bass set was incredible! 🎵",
      3: "Love your progressive tracks!",
      4: "When are you back in Berlin?",
      5: "Your synthwave mix was amazing!",
      6: "The Afro House vibes were incredible! 🔥",
    };
    return messages[connectionId] || "New connection";
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="hsl(0, 0%, 50%)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search connections..."
              placeholderTextColor="hsl(0, 0%, 50%)"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.clearButton}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color="hsl(0, 0%, 50%)"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Pinned Group Chat Section */}
        <View style={styles.pinnedGroup}>
          <TouchableOpacity
            style={styles.groupChatItem}
            onPress={handleGroupChatPress}
          >
            {/* Group Avatar */}
            <View style={styles.groupAvatarContainer}>
              <View style={styles.groupAvatar}>
                <Image
                  source={require("../assets/rhood_logo.webp")}
                  style={styles.groupLogo}
                  resizeMode="contain"
                />
              </View>
              {/* Online Status Indicator */}
              <View style={styles.onlineIndicator} />
            </View>

            {/* Group Chat Info */}
            <View style={styles.groupInfo}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupName}>RHOOD Group</Text>
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
          {filteredConnections.length === 0 ? (
            <View style={styles.noResultsContainer}>
              <Ionicons name="search" size={48} color="hsl(0, 0%, 30%)" />
              <Text style={styles.noResultsTitle}>No connections found</Text>
              <Text style={styles.noResultsSubtitle}>
                {searchQuery.trim()
                  ? `No results for "${searchQuery}"`
                  : "Try adjusting your filters"}
              </Text>
            </View>
          ) : (
            filteredConnections.map((connection) => (
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
                          {
                            backgroundColor: getStatusColor(connection.status),
                          },
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
                      <Text style={styles.lastActive}>
                        {connection.lastActive}
                      </Text>
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
                  {connection.id === 1 && (
                    <View style={styles.unreadCounter}>
                      <Text style={styles.unreadCount}>2</Text>
                    </View>
                  )}
                  {connection.id === 2 && (
                    <View style={styles.unreadCounter}>
                      <Text style={styles.unreadCount}>1</Text>
                    </View>
                  )}
                  {connection.id === 6 && (
                    <View style={styles.unreadCounter}>
                      <Text style={styles.unreadCount}>3</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
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

      {/* Bottom gradient fade overlay */}
      <LinearGradient
        colors={["transparent", "rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0.8)"]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  scrollView: {
    flex: 1,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "hsl(0, 0%, 100%)",
    fontFamily: "Helvetica Neue",
  },
  clearButton: {
    padding: 4,
  },
  noResultsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  noResultsTitle: {
    fontSize: 18,
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  noResultsSubtitle: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    lineHeight: 20,
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
    backgroundColor: "transparent",
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  groupLogo: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
