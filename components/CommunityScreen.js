import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ProgressiveImage from "./ProgressiveImage";

// Mock communities data
const mockCommunities = [
  {
    id: 1,
    name: "Underground DJs",
    description: "Connect with underground DJs worldwide",
    memberCount: 1234,
    genre: "Underground",
    location: "Global",
    isJoined: true,
    isTrending: true,
    recentActivity: "2 hours ago",
    featuredContent: "New mix from DJ Shadow",
    communityImage:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=200&fit=crop",
    memberAvatars: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&h=50&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop&crop=face",
    ],
    createdDate: "2023-01-15",
    lastPost: "New underground track shared by @technobeats",
  },
  {
    id: 2,
    name: "Techno Collective",
    description: "Share techno tracks and collaborate",
    memberCount: 856,
    genre: "Techno",
    location: "Global",
    isJoined: false,
    isTrending: false,
    recentActivity: "5 hours ago",
    featuredContent: "Weekly techno mix competition",
    communityImage:
      "https://images.unsplash.com/photo-1571266028243-e68f8570c0e8?w=400&h=200&fit=crop",
    memberAvatars: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&h=50&fit=crop&crop=face",
    ],
    createdDate: "2023-03-22",
    lastPost: "New techno production tips from @producer_mike",
  },
  {
    id: 3,
    name: "Miami Music Scene",
    description: "Local Miami DJs and producers",
    memberCount: 432,
    genre: "Local",
    location: "Miami, FL",
    isJoined: true,
    isTrending: false,
    recentActivity: "1 day ago",
    featuredContent: "Miami Music Week highlights",
    communityImage:
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=200&fit=crop",
    memberAvatars: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&h=50&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=50&h=50&fit=crop&crop=face",
    ],
    createdDate: "2022-11-08",
    lastPost: "Miami Music Week afterparty at Club Space",
  },
  {
    id: 4,
    name: "Deep House Vibes",
    description: "Deep house enthusiasts and producers",
    memberCount: 678,
    genre: "Deep House",
    location: "Global",
    isJoined: false,
    isTrending: true,
    recentActivity: "3 hours ago",
    featuredContent: "Deep house production masterclass",
    communityImage:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=200&fit=crop",
    memberAvatars: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&h=50&fit=crop&crop=face",
    ],
    createdDate: "2023-02-14",
    lastPost: "New deep house track from @deepbeats",
  },
  {
    id: 5,
    name: "Berlin Electronic",
    description: "Berlin's electronic music community",
    memberCount: 2341,
    genre: "Electronic",
    location: "Berlin, Germany",
    isJoined: true,
    isTrending: true,
    recentActivity: "30 minutes ago",
    featuredContent: "Berghain resident DJ set",
    communityImage:
      "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=200&fit=crop",
    memberAvatars: [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&h=50&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=50&h=50&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=50&h=50&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&h=50&fit=crop&crop=face",
    ],
    createdDate: "2022-08-30",
    lastPost: "New techno track from @berlin_techno",
  },
];

export default function CommunityScreen({ onNavigate }) {
  const [communities, setCommunities] = useState(mockCommunities);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  const handleCommunityPress = (community) => {
    // Navigate to community group chat
    onNavigate && onNavigate("messages", { 
      communityId: community.id,
      communityName: community.name,
      isGroupChat: true 
    });
  };

  const handleJoinCommunity = (communityId) => {
    setCommunities((prev) =>
      prev.map((community) =>
        community.id === communityId
          ? { ...community, isJoined: !community.isJoined }
          : community
      )
    );
  };

  const handleRefresh = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // Filter communities based on search query and active filter
  const filteredCommunities = useMemo(() => {
    let filtered = communities;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (community) =>
          community.name.toLowerCase().includes(query) ||
          community.description.toLowerCase().includes(query) ||
          community.genre.toLowerCase().includes(query) ||
          community.location.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (activeFilter === "joined") {
      filtered = filtered.filter((community) => community.isJoined);
    } else if (activeFilter === "trending") {
      filtered = filtered.filter((community) => community.isTrending);
    } else if (activeFilter === "local") {
      filtered = filtered.filter(
        (community) => community.location !== "Global"
      );
    }

    // Sort by trending, then by member count, then by name
    filtered = filtered.sort((a, b) => {
      // Trending first
      if (a.isTrending !== b.isTrending) {
        return b.isTrending ? 1 : -1;
      }
      // Then by member count
      if (a.memberCount !== b.memberCount) {
        return b.memberCount - a.memberCount;
      }
      // Then by name
      return a.name.localeCompare(b.name);
    });

    return filtered;
  }, [communities, searchQuery, activeFilter]);

  const getGenreIcon = (genre) => {
    switch (genre.toLowerCase()) {
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
  };

  const formatMemberCount = (count) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`;
    }
    return count.toString();
  };

  const joinedCount = communities.filter((c) => c.isJoined).length;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>COMMUNITY</Text>
            <View style={styles.statsContainer}>
              <Text style={styles.statsText}>
                {joinedCount} joined • {communities.length} total
              </Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            Connect with DJs and producers worldwide
          </Text>

          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="hsl(0, 0%, 50%)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search communities..."
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

          {/* Filter Options */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[
                styles.filterButton,
                activeFilter === "all" && styles.filterButtonActive,
              ]}
              onPress={() => setActiveFilter("all")}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  activeFilter === "all" && styles.filterButtonTextActive,
                ]}
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                activeFilter === "joined" && styles.filterButtonActive,
              ]}
              onPress={() => setActiveFilter("joined")}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  activeFilter === "joined" && styles.filterButtonTextActive,
                ]}
              >
                Joined
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                activeFilter === "trending" && styles.filterButtonActive,
              ]}
              onPress={() => setActiveFilter("trending")}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  activeFilter === "trending" && styles.filterButtonTextActive,
                ]}
              >
                Trending
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                activeFilter === "local" && styles.filterButtonActive,
              ]}
              onPress={() => setActiveFilter("local")}
            >
              <Text
                style={[
                  styles.filterButtonText,
                  activeFilter === "local" && styles.filterButtonTextActive,
                ]}
              >
                Local
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Communities List */}
        <View style={styles.communitiesList}>
          {filteredCommunities.length === 0 ? (
            <View style={styles.noResultsContainer}>
              <Ionicons
                name="people-outline"
                size={48}
                color="hsl(0, 0%, 30%)"
              />
              <Text style={styles.noResultsTitle}>No communities found</Text>
              <Text style={styles.noResultsSubtitle}>
                {searchQuery.trim()
                  ? `No results for "${searchQuery}"`
                  : "Try adjusting your filters"}
              </Text>
            </View>
          ) : (
            filteredCommunities.map((community) => (
              <TouchableOpacity
                key={community.id}
                style={styles.communityCard}
                onPress={() => handleCommunityPress(community)}
                activeOpacity={0.7}
              >
                {/* Community Header */}
                <View style={styles.communityHeader}>
                  <View style={styles.communityInfo}>
                    <View style={styles.communityTitleRow}>
                      <Ionicons
                        name={getGenreIcon(community.genre)}
                        size={20}
                        color="hsl(75, 100%, 60%)"
                        style={styles.genreIcon}
                      />
                      <Text style={styles.communityName}>{community.name}</Text>
                      {community.isTrending && (
                        <View style={styles.trendingBadge}>
                          <Text style={styles.trendingText}>🔥</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.communityDescription}>
                      {community.description}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.joinButton,
                      community.isJoined && styles.joinedButton,
                    ]}
                    onPress={(e) => {
                      e.stopPropagation();
                      handleJoinCommunity(community.id);
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

                {/* Community Stats */}
                <View style={styles.communityStats}>
                  <View style={styles.statItem}>
                    <Ionicons name="people" size={14} color="hsl(0, 0%, 70%)" />
                    <Text style={styles.statText}>
                      {formatMemberCount(community.memberCount)} members
                    </Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons
                      name="location"
                      size={14}
                      color="hsl(0, 0%, 70%)"
                    />
                    <Text style={styles.statText}>{community.location}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Ionicons name="time" size={14} color="hsl(0, 0%, 70%)" />
                    <Text style={styles.statText}>
                      Active {community.recentActivity}
                    </Text>
                  </View>
                </View>

                {/* Member Avatars */}
                {community.memberAvatars.length > 0 && (
                  <View style={styles.memberAvatars}>
                    <Text style={styles.memberAvatarsLabel}>
                      Recent members:
                    </Text>
                    <View style={styles.avatarContainer}>
                      {community.memberAvatars
                        .slice(0, 5)
                        .map((avatar, index) => (
                          <ProgressiveImage
                            key={index}
                            source={{ uri: avatar }}
                            style={[
                              styles.memberAvatar,
                              { marginLeft: index > 0 ? -8 : 0 },
                            ]}
                          />
                        ))}
                      {community.memberAvatars.length > 5 && (
                        <View style={[styles.memberAvatar, styles.moreAvatars]}>
                          <Text style={styles.moreAvatarsText}>
                            +{community.memberAvatars.length - 5}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Featured Content */}
                <View style={styles.featuredContent}>
                  <Ionicons name="star" size={14} color="hsl(75, 100%, 60%)" />
                  <Text style={styles.featuredText}>
                    {community.featuredContent}
                  </Text>
                </View>

                {/* Last Post */}
                <View style={styles.lastPost}>
                  <Text style={styles.lastPostText} numberOfLines={1}>
                    {community.lastPost}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
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
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statsContainer: {
    backgroundColor: "hsl(0, 0%, 8%)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  statsText: {
    fontSize: 12,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
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
    marginBottom: 16,
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
  filterContainer: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  filterButtonActive: {
    backgroundColor: "hsl(75, 100%, 60%)",
    borderColor: "hsl(75, 100%, 60%)",
  },
  filterButtonText: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
  },
  filterButtonTextActive: {
    color: "hsl(0, 0%, 0%)",
    fontWeight: "600",
  },
  noResultsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  noResultsTitle: {
    fontSize: 16,
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
  communitiesList: {
    padding: 20,
  },
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
    fontFamily: "TS-Block-Bold",
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
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Helvetica Neue",
    lineHeight: 20,
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
    backgroundColor: "hsl(0, 0%, 5%)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  featuredText: {
    fontSize: 12,
    color: "hsl(0, 0%, 100%)",
    fontFamily: "Helvetica Neue",
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
    fontSize: 12,
    color: "hsl(0, 0%, 60%)",
    fontFamily: "Helvetica Neue",
    fontStyle: "italic",
  },
});
