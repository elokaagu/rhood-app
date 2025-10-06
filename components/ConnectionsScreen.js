import React, { useState, useMemo, useEffect, useRef } from "react";
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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ProgressiveImage from "./ProgressiveImage";
import AnimatedListItem from "./AnimatedListItem";
import * as Haptics from "expo-haptics";
import { connectionsService } from "../lib/connectionsService";
import { supabase, db } from "../lib/supabase";
import { SkeletonList } from "./Skeleton";

// Mock discover users data (fallback when database is empty)
const mockDiscoverUsers = [
  {
    id: "discover-1",
    name: "ELOKA AGU",
    username: "@elokaagu",
    location: "Studio",
    genres: ["Admin", "Studio Management", "Super Admin"],
    profileImage:
      "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=100&h=100&fit=crop",
    rating: 4.5,
    gigsCompleted: 50,
    lastActive: "Recently active",
    status: "online",
    isVerified: true,
    bio: "Rhood Studio Super Administrator - Managing all studio operations, opportunities, and community features.",
  },
  {
    id: "discover-2",
    name: "FATIMA H",
    username: "@fatimah",
    location: "London",
    genres: ["R&B", "Neo-Soul", "Jazz"],
    profileImage:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=100&h=100&fit=crop",
    rating: 4.6,
    gigsCompleted: 14,
    lastActive: "Recently active",
    status: "online",
    isVerified: false,
    bio: "Neo-soul selector with smooth grooves.",
  },
  {
    id: "discover-3",
    name: "MAYA CHEN",
    username: "@mayachen",
    location: "London",
    genres: ["Techno", "House", "Electronic"],
    profileImage:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    rating: 4.9,
    gigsCompleted: 28,
    lastActive: "Recently active",
    status: "online",
    isVerified: true,
    bio: "Techno DJ and producer from London. Resident at Fabric.",
  },
  {
    id: "discover-4",
    name: "SOPHIE A",
    username: "@sophiea",
    location: "Bristol",
    genres: ["Drum & Bass", "Jungle"],
    profileImage:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop",
    rating: 5.0,
    gigsCompleted: 35,
    lastActive: "Recently active",
    status: "online",
    isVerified: true,
    bio: "Bristol DnB selector. High-energy sets for the ravers.",
  },
];

// Mock connections data
const mockConnections = [
  {
    id: "cc00a0ac-9163-4c30-b123-81cc06046e8b",
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
    id: "dd11b1bd-a274-5d41-c234-92dd17157f9c",
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
    id: "ee22c2ce-b385-6e52-d345-a3ee28268g0d",
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
    id: "ff33d3df-c496-7f63-e456-b4ff39379h1e",
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
    id: "gg44e4eg-d5a7-8g74-f567-c5gg40480i2f",
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
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("connections"); // 'connections' or 'discover'
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverUsers, setDiscoverUsers] = useState([]);

  // Load user and connections on mount
  useEffect(() => {
    loadUserAndConnections();
  }, []);

  const loadUserAndConnections = async () => {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser) {
        Alert.alert("Error", "Please log in to view connections");
        return;
      }

      setUser(currentUser);

      // Get user's connections from database
      const connectionsData = await db.getUserConnections(
        currentUser.id,
        "accepted"
      );

      if (connectionsData && connectionsData.length > 0) {
        // Transform database connections to match UI format
        const formattedConnections = connectionsData.map((conn) => ({
          id: conn.connected_user_id,
          name: conn.connected_user_name,
          username: `@${
            conn.connected_user_username ||
            conn.connected_user_name.toLowerCase().replace(/\s+/g, "")
          }`,
          location: conn.connected_user_city,
          genres: conn.connected_user_genres || [],
          profileImage:
            conn.connected_user_image ||
            "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=100&h=100&fit=crop",
          rating: conn.connected_user_rating || 0,
          gigsCompleted: conn.connected_user_gigs || 0,
          lastActive: "Recently", // Could calculate from last_seen if we add that field
          mutualConnections: 0, // Could calculate if needed
          status: "online", // Could be based on last_seen
          isVerified: conn.connected_user_verified || false,
        }));

        setConnections(formattedConnections);
        console.log(
          `✅ Loaded ${formattedConnections.length} connections from database`
        );
      } else {
        // No connections yet, show empty state
        setConnections([]);
        console.log("📭 No connections found");
      }
    } catch (error) {
      console.error("❌ Error loading connections:", error);
      // Show empty state on error
      setConnections([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUserAndConnections();
    setRefreshing(false);
  };

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

  const handleViewProfile = async (connection) => {
    try {
      // Navigate to profile view - you might want to create a separate profile view screen
      console.log(
        "Viewing profile for:",
        connection.dj_name || connection.full_name
      );
      // For now, we'll show an alert, but you can navigate to a profile screen
      Alert.alert(
        "View Profile",
        `Viewing profile for ${connection.dj_name || connection.full_name}`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error viewing profile:", error);
    }
  };

  const handleConnect = async (connection) => {
    try {
      setDiscoverLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Simulate connection request
      await new Promise((resolve) => setTimeout(resolve, 1000));

      Alert.alert(
        "Connection Sent!",
        `Connection request sent to ${
          connection.dj_name || connection.full_name
        }`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error sending connection request:", error);
      Alert.alert("Error", "Failed to send connection request");
    } finally {
      setDiscoverLoading(false);
    }
  };

  const loadDiscoverDJs = async () => {
    try {
      setDiscoverLoading(true);

      // Get all users from database (excluding current user and existing connections)
      const { data: allUsers, error } = await supabase
        .from("user_profiles")
        .select("*")
        .neq("id", user?.id)
        .limit(20);

      if (error) throw error;

      // Filter out users we're already connected to
      const connectedUserIds = connections.map((conn) => conn.id);
      const discoverUsers =
        allUsers?.filter((user) => !connectedUserIds.includes(user.id)) || [];

      // Transform to match UI format
      const formattedDiscoverUsers = discoverUsers.map((user) => ({
        id: user.id,
        name: user.dj_name || user.full_name,
        username: `@${
          user.username || user.dj_name?.toLowerCase().replace(/\s+/g, "")
        }`,
        location: user.city,
        genres: user.genres || [],
        profileImage:
          user.profile_image_url ||
          "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=100&h=100&fit=crop",
        rating: user.rating || 0,
        gigsCompleted: user.gigs_completed || 0,
        lastActive: "Recently",
        status: "online",
        isVerified: user.is_verified || false,
        bio: user.bio || "DJ and music producer",
      }));

      setDiscoverUsers(formattedDiscoverUsers);
    } catch (error) {
      console.error("❌ Error loading discover DJs:", error);
      // Fallback to mock data
      setDiscoverUsers(mockDiscoverUsers);
    } finally {
      setDiscoverLoading(false);
    }
  };

  // Filter connections based on search query
  const filteredConnections = useMemo(() => {
    let filtered = connections;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (connection) =>
          connection.full_name?.toLowerCase().includes(query) ||
          connection.dj_name?.toLowerCase().includes(query) ||
          connection.city?.toLowerCase().includes(query) ||
          connection.genres?.some((genre) =>
            genre.toLowerCase().includes(query)
          )
      );
    }

    return filtered;
  }, [connections, searchQuery]);

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
    // For now, return a placeholder. In a full implementation,
    // this would fetch the last message from the thread
    return "Tap to start a conversation";
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="hsl(0, 0%, 100%)"
            colors={["hsl(0, 0%, 100%)"]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>CONNECTIONS</Text>
          <Text style={styles.headerSubtitle}>
            Discover and connect with DJs worldwide
          </Text>

          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "connections" && styles.tabButtonActive,
              ]}
              onPress={() => setActiveTab("connections")}
            >
              <Ionicons
                name="people"
                size={16}
                color={
                  activeTab === "connections"
                    ? "hsl(75, 100%, 60%)"
                    : "hsl(0, 0%, 70%)"
                }
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "connections" && styles.tabTextActive,
                ]}
              >
                Connections
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "discover" && styles.tabButtonActive,
              ]}
              onPress={() => {
                setActiveTab("discover");
                if (discoverUsers.length === 0) {
                  loadDiscoverDJs();
                }
              }}
            >
              <Ionicons
                name="search"
                size={16}
                color={
                  activeTab === "discover"
                    ? "hsl(75, 100%, 60%)"
                    : "hsl(0, 0%, 70%)"
                }
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === "discover" && styles.tabTextActive,
                ]}
              >
                Discover
              </Text>
            </TouchableOpacity>
          </View>

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

        {/* Content based on active tab */}
        {activeTab === "connections" ? (
          /* Individual Connections List */
          <View style={styles.connectionsList}>
            {loading ? (
              <SkeletonList count={5} />
            ) : filteredConnections.length === 0 ? (
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
              <>
                {filteredConnections.map((connection, index) => (
                  <AnimatedListItem
                    key={connection.id}
                    index={index}
                    delay={80}
                  >
                    <TouchableOpacity
                      style={styles.connectionItem}
                      onPress={() => handleConnectionPress(connection)}
                    >
                      <View style={styles.connectionContent}>
                        {/* Profile Image with Online Status */}
                        <View style={styles.profileContainer}>
                          <ProgressiveImage
                            source={{
                              uri:
                                connection.profile_image_url ||
                                "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop&crop=face",
                            }}
                            style={styles.profileImage}
                          />
                          {/* For now, show all as online. In a real app, you'd track online status */}
                          <View
                            style={[
                              styles.statusIndicator,
                              {
                                backgroundColor: "hsl(120, 100%, 50%)", // Always online for now
                              },
                            ]}
                          />
                        </View>

                        {/* Connection Info */}
                        <View style={styles.connectionInfo}>
                          {/* Name and Last Active Time */}
                          <View style={styles.connectionHeader}>
                            <Text
                              style={styles.connectionName}
                              numberOfLines={1}
                            >
                              {connection.dj_name || connection.full_name}
                            </Text>
                            <Text style={styles.lastActive}>
                              {connection.followedAt
                                ? new Date(
                                    connection.followedAt
                                  ).toLocaleDateString()
                                : "Recently"}
                            </Text>
                          </View>

                          {/* Last Message Preview */}
                          <Text style={styles.lastMessage} numberOfLines={1}>
                            {getLastMessage(connection.id)}
                          </Text>

                          {/* Genre Tags */}
                          <View style={styles.genreTags}>
                            {(connection.genres || [])
                              .slice(0, 2)
                              .map((genre) => (
                                <View key={genre} style={styles.genreTag}>
                                  <Text style={styles.genreTagText}>
                                    {genre}
                                  </Text>
                                </View>
                              ))}
                            {(!connection.genres ||
                              connection.genres.length === 0) && (
                              <View style={styles.genreTag}>
                                <Text style={styles.genreTagText}>
                                  Electronic
                                </Text>
                              </View>
                            )}
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
                  </AnimatedListItem>
                ))}
              </>
            )}
          </View>
        ) : (
          /* Discover Tab */
          <View style={styles.discoverList}>
            {discoverLoading ? (
              <SkeletonList count={4} />
            ) : discoverUsers.length === 0 ? (
              <View style={styles.noResultsContainer}>
                <Ionicons
                  name="people-outline"
                  size={48}
                  color="hsl(0, 0%, 30%)"
                />
                <Text style={styles.noResultsTitle}>No DJs found</Text>
                <Text style={styles.noResultsSubtitle}>
                  Try adjusting your filters or check back later
                </Text>
              </View>
            ) : (
              discoverUsers.map((user, index) => (
                <AnimatedListItem key={user.id} index={index} delay={80}>
                  <View style={styles.discoverCard}>
                    {/* Profile Image with Status */}
                    <View style={styles.discoverProfileContainer}>
                      <ProgressiveImage
                        source={{ uri: user.profileImage }}
                        style={styles.discoverProfileImage}
                      />
                      <View
                        style={[
                          styles.discoverStatusIndicator,
                          { backgroundColor: "hsl(120, 100%, 50%)" },
                        ]}
                      />
                    </View>

                    {/* User Info */}
                    <View style={styles.discoverUserInfo}>
                      <View style={styles.discoverHeader}>
                        <Text style={styles.discoverName}>{user.name}</Text>
                        <View style={styles.discoverRating}>
                          <Ionicons
                            name="star"
                            size={16}
                            color="hsl(45, 100%, 50%)"
                          />
                          <Text style={styles.discoverRatingText}>
                            {user.rating}
                          </Text>
                          <Text style={styles.discoverLastActive}>
                            {user.lastActive}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.discoverUsername}>
                        {user.username}
                      </Text>
                      <Text style={styles.discoverLocation}>
                        {user.location}
                      </Text>
                      <Text style={styles.discoverBio} numberOfLines={2}>
                        {user.bio}
                      </Text>

                      {/* Genre Tags */}
                      <View style={styles.discoverGenreTags}>
                        {user.genres.slice(0, 3).map((genre) => (
                          <View key={genre} style={styles.discoverGenreTag}>
                            <Ionicons
                              name="musical-notes"
                              size={12}
                              color="hsl(75, 100%, 60%)"
                            />
                            <Text style={styles.discoverGenreText}>
                              {genre}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.discoverActions}>
                      <TouchableOpacity
                        style={styles.viewProfileButton}
                        onPress={() => handleViewProfile(user)}
                      >
                        <Ionicons
                          name="person-outline"
                          size={16}
                          color="hsl(0, 0%, 70%)"
                        />
                        <Text style={styles.viewProfileText}>View Profile</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.connectButton}
                        onPress={() => handleConnect(user)}
                        disabled={discoverLoading}
                      >
                        <Ionicons name="add" size={16} color="hsl(0, 0%, 0%)" />
                        <Text style={styles.connectText}>Connect</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </AnimatedListItem>
              ))
            )}
          </View>
        )}

        {/* Add Connection Call-to-Action - only show on connections tab */}
        {activeTab === "connections" && (
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
        )}
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
    marginTop: -12,
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

  // Tab Navigation Styles
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: "hsl(75, 100%, 60%)",
  },
  tabText: {
    fontSize: 14,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 70%)",
  },
  tabTextActive: {
    color: "hsl(0, 0%, 0%)",
  },

  // Discover Tab Styles
  discoverList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  discoverCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  discoverProfileContainer: {
    position: "relative",
    marginRight: 12,
  },
  discoverProfileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  discoverStatusIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "hsl(0, 0%, 8%)",
  },
  discoverUserInfo: {
    flex: 1,
    marginRight: 12,
  },
  discoverHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  discoverName: {
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "700",
    color: "hsl(0, 0%, 100%)",
    flex: 1,
  },
  discoverRating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  discoverRatingText: {
    fontSize: 14,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(45, 100%, 50%)",
  },
  discoverLastActive: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
    marginLeft: 8,
  },
  discoverUsername: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(75, 100%, 60%)",
    marginBottom: 2,
  },
  discoverLocation: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 8,
  },
  discoverBio: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
    lineHeight: 20,
    marginBottom: 12,
  },
  discoverGenreTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  discoverGenreTag: {
    backgroundColor: "hsl(0, 0%, 15%)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  discoverGenreText: {
    fontSize: 10,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
  },
  discoverActions: {
    flexDirection: "column",
    gap: 8,
  },
  viewProfileButton: {
    backgroundColor: "hsl(0, 0%, 15%)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    minWidth: 100,
  },
  viewProfileText: {
    fontSize: 12,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 70%)",
  },
  connectButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
    minWidth: 100,
  },
  connectText: {
    fontSize: 12,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
  },
});
