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
import ProfileImagePlaceholder from "./ProfileImagePlaceholder";
import * as Haptics from "expo-haptics";
import { connectionsService } from "../lib/connectionsService";
import { supabase, db } from "../lib/supabase";
import { SkeletonList } from "./Skeleton";

// No mock data - all data comes from database

// All connection data comes from database

export default function ConnectionsScreen({ user: propUser, onNavigate }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(propUser); // Use prop user as initial state
  const [activeTab, setActiveTab] = useState("discover"); // 'connections' or 'discover'
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverUsers, setDiscoverUsers] = useState([]);
  const [connectionsFadeAnim] = useState(new Animated.Value(0));
  const [discoverFadeAnim] = useState(new Animated.Value(0));

  // Update user state when prop changes
  useEffect(() => {
    if (propUser && propUser !== user) {
      console.log("User prop changed, updating user state");
      setUser(propUser);
    }
  }, [propUser]);

  // Load user and discover data on mount
  useEffect(() => {
    const initializeData = async () => {
      await loadUserAndConnections();
      // Load discover data after connections are loaded
      await loadDiscoverDJs();
    };
    initializeData();
  }, []);

  // Handle initial discover fade-in
  useEffect(() => {
    if (discoverUsers.length > 0 && !discoverLoading) {
      discoverFadeAnim.setValue(0);
      Animated.timing(discoverFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [discoverUsers, discoverLoading]);

  const loadUserAndConnections = async () => {
    try {
      setLoading(true);

      // Use prop user first, then try to fetch if not available
      let currentUser = propUser;

      if (!currentUser) {
        console.log("No user prop provided, attempting to fetch user...");

        // Add a small delay to ensure auth state is fully initialized
        await new Promise((resolve) => setTimeout(resolve, 100));

        try {
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();
          if (userError) {
            console.log("getUser error:", userError);
          } else {
            currentUser = user;
          }
        } catch (getUserError) {
          console.log("getUser failed:", getUserError);
        }

        // If getUser didn't work, try getSession
        if (!currentUser) {
          try {
            const {
              data: { session },
              error: sessionError,
            } = await supabase.auth.getSession();
            if (sessionError) {
              console.log("getSession error:", sessionError);
            } else if (session?.user) {
              currentUser = session.user;
            }
          } catch (getSessionError) {
            console.log("getSession failed:", getSessionError);
          }
        }
      }

      if (!currentUser) {
        console.log("❌ No user found - user might not be authenticated");
        Alert.alert("Error", "Please log in to view connections");
        return;
      }

      console.log("✅ User found:", currentUser.id);
      setUser(currentUser);

      // Get user's connections from database (both pending and accepted)
      const connectionsData = await db.getUserConnections(
        currentUser.id,
        null // Get all connections regardless of status
      );

      // Debug: Log the connections data
      console.log(
        "🔍 Connections tab - Raw connections data:",
        connectionsData
      );
      console.log(
        "🔍 Connections tab - Number of connections:",
        connectionsData?.length || 0
      );

      if (connectionsData && connectionsData.length > 0) {
        // Transform database connections to match UI format
        const formattedConnections = connectionsData.map((conn) => {
          console.log(`🔍 Connection ${conn.connected_user_name}:`, {
            id: conn.connected_user_id,
            name: conn.connected_user_name,
            image: conn.connected_user_image,
            hasImage: !!conn.connected_user_image,
            status: conn.connection_status,
          });

          return {
            id: conn.connected_user_id,
            name: conn.connected_user_name,
            username: `@${
              conn.connected_user_username ||
              conn.connected_user_name.toLowerCase().replace(/\s+/g, "")
            }`,
            location:
              conn.connected_user_city ||
              conn.connected_user_location ||
              "Location not set",
            genres: conn.connected_user_genres || [],
            profileImage: conn.connected_user_image || null,
            rating: conn.connected_user_rating || 0,
            gigsCompleted: conn.connected_user_gigs || 0,
            lastActive: "Recently", // Could calculate from last_seen if we add that field
            mutualConnections: 0, // Could calculate if needed
            status: "online", // Could be based on last_seen
            isVerified: conn.connected_user_verified || false,
            connectionStatus: conn.connection_status, // Add actual connection status
          };
        });

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
      // Always fade in connections after loading completes (even if empty)
      Animated.timing(connectionsFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
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
      // Navigate to profile view
      if (onNavigate) {
        onNavigate("user-profile", { userId: connection.id });
      }
    } catch (error) {
      console.error("Error viewing profile:", error);
      Alert.alert("Error", "Failed to open profile");
    }
  };

  const handleConnect = async (connection) => {
    try {
      setDiscoverLoading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Debug: Log connection data
      console.log("🔍 Connection data:", connection);
      console.log("🔍 Connection dj_name:", connection?.dj_name);
      console.log("🔍 Connection full_name:", connection?.full_name);

      // Get current user
      const { supabase } = await import("../lib/supabase");
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        Alert.alert("Error", "Please log in to connect with users");
        return;
      }

      // Create real connection request
      const connectionResult = await db.createConnection(
        currentUser.id,
        connection.id
      );

      // Get the display name with better fallbacks
      const displayName =
        connection?.dj_name ||
        connection?.full_name ||
        `${connection?.first_name || ""} ${
          connection?.last_name || ""
        }`.trim() ||
        "this user";

      // Check if this was a new connection or existing one
      const isExistingConnection =
        connectionResult.created_at !== new Date().toISOString();

      if (isExistingConnection) {
        Alert.alert(
          "Already Connected",
          `You're already connected to ${displayName}`,
          [{ text: "OK" }]
        );
      } else {
        Alert.alert(
          "Connection Sent!",
          `Connection request sent to ${displayName}`,
          [{ text: "OK" }]
        );

        // Update the user's connection status in the local state
        setDiscoverUsers((prev) =>
          prev.map((user) =>
            user.id === connection.id ? { ...user, isConnected: true } : user
          )
        );
      }
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

      // Get current user first
      const { supabase } = await import("../lib/supabase");
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        console.log("❌ No current user found for connection status");
        setDiscoverUsers([]);
        return;
      }

      // Use the connectionsService to get recommended users
      const recommendedUsers = await connectionsService.getRecommendedUsers(20);

      // Get existing connections to check status (both pending and accepted)
      const existingConnections = await db.getUserConnections(
        currentUser.id,
        null // Get all connections regardless of status
      );

      // Debug: Log the connections data
      console.log("🔍 Existing connections:", existingConnections);
      console.log("🔍 Current user ID:", currentUser.id);

      const existingConnectionIds = new Set(
        existingConnections.map((conn) => {
          console.log("🔍 Connection data:", conn);
          return conn.connected_user_id || conn.id;
        })
      );

      console.log(
        "🔍 Existing connection IDs:",
        Array.from(existingConnectionIds)
      );

      // Transform to match UI format with connection status
      const formattedDiscoverUsers = recommendedUsers.map((user) => ({
        id: user.id,
        name: user.dj_name || user.full_name || "Unknown DJ",
        username: `@${
          user.username ||
          user.dj_name?.toLowerCase().replace(/\s+/g, "") ||
          "dj"
        }`,
        location: user.city || user.location || "Location not set",
        genres: user.genres || [],
        profileImage: user.profile_image_url || null,
        gigsCompleted: user.gigs_completed || 0,
        lastActive: "Recently",
        status: "online",
        isVerified: user.is_verified || false,
        bio: user.bio || "DJ and music producer",
        isConnected: existingConnectionIds.has(user.id), // Add connection status (pending or accepted)
      }));

      setDiscoverUsers(formattedDiscoverUsers);
      console.log(
        `✅ Loaded ${formattedDiscoverUsers.length} discover users from database`
      );
      console.log("🔍 Sample user data:", formattedDiscoverUsers[0]);
      console.log(
        "🔍 Connected users:",
        formattedDiscoverUsers.filter((u) => u.isConnected).length
      );
    } catch (error) {
      console.error("❌ Error loading discover DJs:", error);
      // No fallback to mock data - show empty state
      setDiscoverUsers([]);
    } finally {
      setDiscoverLoading(false);
      // Always fade in discover users after loading completes (even if empty)
      Animated.timing(discoverFadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
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
                activeTab === "discover" && styles.tabButtonActive,
              ]}
              onPress={() => {
                setActiveTab("discover");
                // Reset fade animation for discover tab
                discoverFadeAnim.setValue(0);
                if (discoverUsers.length === 0) {
                  loadDiscoverDJs();
                } else {
                  // If data already exists, fade it in
                  Animated.timing(discoverFadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                  }).start();
                }
              }}
            >
              <Ionicons
                name="compass"
                size={16}
                color={
                  activeTab === "discover"
                    ? "hsl(0, 0%, 0%)"
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

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "connections" && styles.tabButtonActive,
              ]}
              onPress={() => {
                setActiveTab("connections");
                // Reset fade animation for connections tab
                connectionsFadeAnim.setValue(0);
                // Fade in connections if they exist
                if (connections.length > 0) {
                  Animated.timing(connectionsFadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                  }).start();
                }
                // Reset discover fade animation
                discoverFadeAnim.setValue(0);
              }}
            >
              <Ionicons
                name="people"
                size={16}
                color={
                  activeTab === "connections"
                    ? "hsl(0, 0%, 0%)"
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

        {/* Pinned Group Chat Section - Only show on connections tab */}
        {activeTab === "connections" && (
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
                  <Text style={styles.groupName}>R/HOOD Group</Text>
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
        )}

        {/* Content based on active tab */}
        {activeTab === "connections" ? (
          /* Individual Connections List */
          <View style={styles.connectionsList}>
            {loading ? (
              <SkeletonList count={5} />
            ) : (
              <Animated.View style={{ opacity: connectionsFadeAnim }}>
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
                            source={
                              connection.profileImage
                                ? { uri: connection.profileImage }
                                : null
                            }
                            style={styles.profileImage}
                            placeholder={
                              <ProfileImagePlaceholder
                                size={48}
                                style={styles.profileImage}
                              />
                            }
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
              </Animated.View>
            )}
          </View>
        ) : (
          /* Discover Tab */
          <View style={styles.discoverList}>
            {discoverLoading ? (
              <SkeletonList count={4} />
            ) : (
              <Animated.View style={{ opacity: discoverFadeAnim }}>
                {discoverUsers.map((user, index) => (
                  <AnimatedListItem key={user.id} index={index} delay={80}>
                    <View style={styles.discoverCard}>
                      {/* Top Row: Profile Image + Name Info + Rating */}
                      <View style={styles.discoverTopRow}>
                        {/* Profile Image */}
                        <View style={styles.discoverProfileContainer}>
                          <ProgressiveImage
                            source={
                              user.profileImage &&
                              typeof user.profileImage === "string"
                                ? { uri: user.profileImage }
                                : null
                            }
                            style={styles.discoverProfileImage}
                            placeholder={
                              <ProfileImagePlaceholder
                                size={80}
                                style={styles.discoverProfileImage}
                              />
                            }
                          />
                          <View style={styles.discoverOnlineIndicator} />
                        </View>

                        {/* Name Info */}
                        <View style={styles.discoverNameSection}>
                          <View style={styles.discoverHeader}>
                            <Text style={styles.discoverName}>{user.name}</Text>
                          </View>
                          <Text style={styles.discoverUsername}>
                            {user.username}
                          </Text>
                          <Text style={styles.discoverLocation}>
                            {user.location}
                          </Text>
                        </View>

                        {/* Activity */}
                        <View style={styles.discoverRatingSection}>
                          <Text style={styles.discoverLastActive}>
                            {user.lastActive}
                          </Text>
                        </View>
                      </View>

                      {/* Description - Full Width - Hidden for now */}
                      {/* <Text style={styles.discoverBio}>{user.bio}</Text> */}

                      {/* Genre Tags */}
                      <View style={styles.discoverGenres}>
                        {user.genres.slice(0, 3).map((genre, index) => (
                          <View key={index} style={styles.discoverGenreTag}>
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

                      {/* Bottom Row: Action Buttons */}
                      <View style={styles.discoverActions}>
                        <TouchableOpacity
                          style={styles.discoverViewProfileButton}
                          onPress={() => handleViewProfile(user)}
                        >
                          <Ionicons
                            name="person-outline"
                            size={16}
                            color="hsl(0, 0%, 100%)"
                          />
                          <Text style={styles.discoverViewProfileText}>
                            View Profile
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.discoverConnectButton,
                            user.isConnected && styles.discoverConnectedButton,
                          ]}
                          onPress={() => handleConnect(user)}
                          disabled={discoverLoading || user.isConnected}
                        >
                          <Ionicons
                            name={user.isConnected ? "checkmark" : "add"}
                            size={16}
                            color={
                              user.isConnected
                                ? "hsl(0, 0%, 100%)"
                                : "hsl(0, 0%, 0%)"
                            }
                          />
                          <Text
                            style={[
                              styles.discoverConnectText,
                              user.isConnected && styles.discoverConnectedText,
                            ]}
                          >
                            {user.isConnected ? "Connected" : "Connect"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </AnimatedListItem>
                ))}
              </Animated.View>
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
    paddingTop: 32,
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
    justifyContent: "center",
    alignItems: "center",
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
    fontSize: 14,
    fontFamily: "TS-Block-Bold",
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
    fontFamily: "TS-Block-Bold",
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
    marginBottom: 36,
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
    paddingTop: 20,
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
    justifyContent: "center",
    alignItems: "center",
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
    fontFamily: "TS-Block-Bold",
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

  // Discover Card Styles (matching the image layout)
  discoverCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  discoverTopRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-start",
  },
  discoverProfileContainer: {
    marginRight: 16,
    position: "relative",
  },
  discoverProfileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  discoverNameSection: {
    flex: 1,
    marginRight: 12,
  },
  discoverHeader: {
    marginBottom: 4,
  },
  discoverName: {
    fontSize: 16,
    fontFamily: "TS-Block-Bold",
    fontWeight: "700",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 2,
  },
  discoverOnlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "hsl(120, 100%, 50%)",
    borderWidth: 3,
    borderColor: "hsl(0, 0%, 8%)",
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
    color: "hsl(0, 0%, 70%)",
    marginBottom: 8,
  },
  discoverBio: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
    lineHeight: 18,
    marginBottom: 12,
  },
  discoverGenres: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  discoverGenreTag: {
    backgroundColor: "hsl(0, 0%, 15%)",
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 4,
  },
  discoverGenreText: {
    fontSize: 11,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "500",
    marginLeft: 4,
  },
  discoverRatingSection: {
    alignItems: "flex-end",
    minWidth: 60,
  },
  discoverRatingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  discoverRating: {
    fontSize: 14,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(45, 100%, 50%)",
    marginLeft: 4,
  },
  discoverLastActive: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
  },
  discoverActions: {
    flexDirection: "row",
    gap: 12,
  },
  discoverViewProfileButton: {
    backgroundColor: "hsl(0, 0%, 15%)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    flex: 1,
  },
  discoverViewProfileText: {
    fontSize: 14,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
  discoverConnectButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
    flex: 1,
  },
  discoverConnectedButton: {
    backgroundColor: "hsl(0, 0%, 30%)",
    opacity: 0.8,
  },
  discoverConnectText: {
    fontSize: 14,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
  },
  discoverConnectedText: {
    color: "hsl(0, 0%, 100%)",
  },
});
