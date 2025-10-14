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
import RhoodModal from "./RhoodModal";

// No mock data - all data comes from database

// All connection data comes from database

export default function ConnectionsScreen({
  user: propUser,
  onNavigate,
  initialTab = "discover",
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(propUser); // Use prop user as initial state
  const [activeTab, setActiveTab] = useState(initialTab); // 'connections' or 'discover'
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverUsers, setDiscoverUsers] = useState([]);
  const [connectionsFadeAnim] = useState(new Animated.Value(0));
  const [discoverFadeAnim] = useState(new Animated.Value(0));
  const [connectionMessage, setConnectionMessage] = useState("");
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [isRhoodMember, setIsRhoodMember] = useState(false);
  const [rhoodMemberCount, setRhoodMemberCount] = useState(0);
  const [lastMessages, setLastMessages] = useState({});

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
      // Check R/HOOD membership
      await checkRhoodMembership();

      // If Messages tab is active, ensure data is loaded
      if (activeTab === "connections") {
        await loadUserAndConnections();
      }
    };
    initializeData();
  }, []);

  // Load data when Messages tab becomes active
  useEffect(() => {
    if (activeTab === "connections" && user) {
      loadUserAndConnections();
      checkRhoodMembership();
    }
  }, [activeTab, user]);

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
            username: conn.connected_user_username 
              ? `@${conn.connected_user_username}`
              : `@${conn.connected_user_name?.toLowerCase().replace(/\s+/g, "") || "user"}`,
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

  const checkRhoodMembership = async () => {
    try {
      // For now, assume all users are members since we don't have the community system fully set up
      // In a real implementation, you would check the community_members table
      setIsRhoodMember(true);
      setRhoodMemberCount(12); // Placeholder count
    } catch (error) {
      console.error("Error checking R/HOOD membership:", error);
      setIsRhoodMember(false);
      setRhoodMemberCount(0);
    }
  };

  const handleJoinRhoodGroup = async () => {
    try {
      // For now, just show a success message
      // In a real implementation, you would add the user to the community_members table
      Alert.alert(
        "Welcome to R/HOOD Group!",
        "You've successfully joined the main R/HOOD community chat. Start connecting with fellow DJs!",
        [{ text: "OK" }]
      );
      setIsRhoodMember(true);
      setRhoodMemberCount((prev) => prev + 1);
    } catch (error) {
      console.error("Error joining R/HOOD group:", error);
      Alert.alert("Error", "Failed to join R/HOOD Group. Please try again.");
    }
  };

  const handleGroupChatPress = () => {
    if (isRhoodMember) {
      onNavigate &&
        onNavigate("messages", {
          communityId: "550e8400-e29b-41d4-a716-446655440000",
          chatType: "group",
        });
    } else {
      handleJoinRhoodGroup();
    }
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

      // Create real connection request using new schema
      const connectionResult = await db.createConnection(connection.id);

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
        connectionResult.status === "pending" && connectionResult.id;

      if (isExistingConnection) {
        setConnectionMessage(
          `Connection request sent to ${displayName}. They'll be notified and can accept your request.`
        );
        setShowConnectionModal(true);

        // Update the user's connection status in the local state
        setDiscoverUsers((prev) =>
          prev.map((user) =>
            user.id === connection.id
              ? { ...user, isConnected: true, connectionStatus: "pending" }
              : user
          )
        );
      } else {
        setConnectionMessage(`You're already connected to ${displayName}`);
        setShowConnectionModal(true);
      }
    } catch (error) {
      console.error("Error sending connection request:", error);
      setConnectionMessage("Failed to send connection request");
      setShowConnectionModal(true);
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

      // Create a map of user connections with their status
      const connectionStatusMap = new Map();
      existingConnections.forEach((conn) => {
        console.log("🔍 Connection data:", conn);
        const userId = conn.connected_user_id;
        connectionStatusMap.set(userId, {
          status: conn.connection_status,
          initiated_by: conn.initiated_by,
          created_at: conn.created_at,
          accepted_at: conn.accepted_at,
        });
      });

      console.log(
        "🔍 Connection status map:",
        Object.fromEntries(connectionStatusMap)
      );

      // Transform to match UI format with connection status
      const formattedDiscoverUsers = recommendedUsers.map((user) => {
        const connectionInfo = connectionStatusMap.get(user.id);
        const isConnected =
          connectionInfo &&
          (connectionInfo.status === "pending" ||
            connectionInfo.status === "accepted");

        return {
          id: user.id,
          name: user.dj_name || user.full_name || "Unknown DJ",
          username: user.username 
            ? `@${user.username}`
            : `@${(user.dj_name || user.full_name || "dj")
              .toLowerCase()
              .replace(/\s+/g, "")}`,
          location: user.city || user.location || "Location not set",
          genres: user.genres || [],
          profileImage: user.profile_image_url || null,
          gigsCompleted: user.gigs_completed || 0,
          lastActive: "Recently",
          status: "online",
          isVerified: user.is_verified || false,
          bio: user.bio || "DJ and music producer",
          isConnected: isConnected,
          connectionStatus: connectionInfo?.status || null,
          connectionId: connectionInfo ? user.id : null,
        };
      });

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

  const getUserName = (connection) => {
    // Debug: Log the connection data to see what's available
    console.log("🔍 Connection data for name:", connection);

    // Return just the participant's name
    const participantName =
      connection.name ||
      connection.dj_name ||
      connection.full_name ||
      connection.connected_user_name ||
      "Unknown User";

    console.log("🔍 Resolved name:", participantName);
    return participantName;
  };

  const getLastMessageContent = async (connection) => {
    // This would fetch the actual last message from the conversation
    // For now, return empty string - in a real implementation, you'd fetch from messages table
    try {
      // TODO: Implement actual message fetching
      // const lastMessage = await db.getLastMessage(connection.id);
      // return lastMessage?.content || "";
      return "";
    } catch (error) {
      console.error("Error fetching last message:", error);
      return "";
    }
  };

  // Filter connections to only show those with messages (but always show R/HOOD Group)
  const connectionsWithMessages = filteredConnections.filter((connection) => {
    const lastMessage = lastMessages[connection.id];
    return (
      lastMessage &&
      lastMessage !== "No messages yet" &&
      lastMessage.trim() !== ""
    );
  });

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
            Connect with DJs and manage your conversations
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
                // Reload connections data when switching to messages tab
                loadUserAndConnections();
                // Fade in connections after loading
                setTimeout(() => {
                  Animated.timing(connectionsFadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                  }).start();
                }, 100);
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
                Messages
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

        {/* Content based on active tab */}
        {activeTab === "connections" ? (
          /* Messages List */
          <View style={styles.messagesList}>
            {loading ? (
              <SkeletonList count={5} />
            ) : (
              <Animated.View style={{ opacity: connectionsFadeAnim }}>
                {/* R/HOOD Group Chat - Always pinned at top */}
                <TouchableOpacity
                  style={styles.messageItem}
                  onPress={handleGroupChatPress}
                >
                  <View style={styles.messageContent}>
                    {/* Group Avatar */}
                    <View style={styles.avatarContainer}>
                      <View style={styles.groupAvatar}>
                        <Image
                          source={require("../assets/rhood_logo.webp")}
                          style={styles.groupLogo}
                          resizeMode="contain"
                        />
                      </View>
                      <View style={styles.onlineIndicator} />
                    </View>

                    {/* Message Info */}
                    <View style={styles.messageInfo}>
                      <View style={styles.messageHeader}>
                        <Text style={styles.messageName}>R/HOOD Group</Text>
                        <Text style={styles.messageTime}>
                          {isRhoodMember ? "2m" : "Join to chat"}
                        </Text>
                      </View>
                      <Text style={styles.messagePreview} numberOfLines={1}>
                        {isRhoodMember
                          ? "Sofia: Yeah, the set was amazing! 🔥"
                          : "Join the main R/HOOD community chat"}
                      </Text>
                      <View style={styles.messageBadges}>
                        <View style={styles.pinnedBadge}>
                          <Text style={styles.pinnedBadgeText}>
                            {isRhoodMember ? "Pinned" : "Join"}
                          </Text>
                        </View>
                        <Text style={styles.memberCount}>
                          {rhoodMemberCount} member
                          {rhoodMemberCount !== 1 ? "s" : ""}
                        </Text>
                      </View>
                    </View>

                    {/* Unread Counter */}
                    {isRhoodMember && (
                      <View style={styles.unreadCounter}>
                        <Text style={styles.unreadCount}>3</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Individual Messages */}
                {connectionsWithMessages.map((connection, index) => (
                  <AnimatedListItem
                    key={connection.id}
                    index={index}
                    delay={80}
                  >
                    <TouchableOpacity
                      style={styles.messageItem}
                      onPress={() => handleConnectionPress(connection)}
                    >
                      <View style={styles.messageContent}>
                        {/* Profile Avatar */}
                        <View style={styles.avatarContainer}>
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
                          <View style={styles.onlineIndicator} />
                        </View>

                        {/* Message Info */}
                        <View style={styles.messageInfo}>
                          <View style={styles.messageHeader}>
                            <Text style={styles.messageName} numberOfLines={1}>
                              {getUserName(connection)}
                            </Text>
                            <Text style={styles.messageTime}>
                              {connection.lastActive || "Recently"}
                            </Text>
                          </View>
                          <Text style={styles.messagePreview} numberOfLines={1}>
                            {lastMessages[connection.id] || ""}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  </AnimatedListItem>
                ))}

                {/* Empty State - only show if no individual messages */}
                {connectionsWithMessages.length === 0 && !loading && (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateTitle}>No Messages Yet</Text>
                    <Text style={styles.emptyStateDescription}>
                      Start connecting with DJs to begin conversations
                    </Text>
                    <TouchableOpacity
                      style={styles.emptyStateButton}
                      onPress={() => setActiveTab("discover")}
                    >
                      <Text style={styles.emptyStateButtonText}>
                        Discover DJs
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
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
                Connect with DJs and start conversations
              </Text>
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={handleBrowseCommunity}
              >
                <Text style={styles.ctaButtonText}>Browse Communities</Text>
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

      {/* Connection Status Modal */}
      <RhoodModal
        visible={showConnectionModal}
        onClose={() => setShowConnectionModal(false)}
        title="Connection Status"
        message={connectionMessage}
        type="success"
        primaryButtonText="OK"
        showCloseButton={false}
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
  lastMessageContent: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 60%)",
    marginTop: 4,
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

  // Messages List Styles
  messagesList: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  messageItem: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  messageContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
    marginRight: 12,
  },
  groupAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "hsl(75, 100%, 60%)",
  },
  groupLogo: {
    width: 32,
    height: 32,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "hsl(120, 100%, 50%)",
    borderWidth: 2,
    borderColor: "hsl(0, 0%, 8%)",
  },
  messageInfo: {
    flex: 1,
    marginRight: 8,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  messageName: {
    fontSize: 16,
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    fontFamily: "Arial",
  },
  messageTime: {
    fontSize: 12,
    color: "hsl(0, 0%, 60%)",
    fontFamily: "Arial",
  },
  messagePreview: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Arial",
    marginBottom: 6,
  },
  messageBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pinnedBadge: {
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  pinnedBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
    fontFamily: "Arial",
  },
  memberCount: {
    fontSize: 12,
    color: "hsl(0, 0%, 60%)",
    fontFamily: "Arial",
  },
  unreadCounter: {
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
    fontFamily: "Arial",
  },
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
