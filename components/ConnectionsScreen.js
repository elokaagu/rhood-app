import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
  ActivityIndicator,
  Pressable,
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
  route = null, // Add route prop for share mode
  onPlayAudio, // Add audio playback handler
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
  const [popularDJs, setPopularDJs] = useState([]);
  const [popularDJsLoading, setPopularDJsLoading] = useState(false);
  const [connectionsFadeAnim] = useState(new Animated.Value(0));
  const [discoverFadeAnim] = useState(new Animated.Value(0));
  const [hasLoadedConnections, setHasLoadedConnections] = useState(false);
  const hasLoadedMessagesRef = useRef(false);
  const [connectionMessage, setConnectionMessage] = useState("");
  const [connectionModalType, setConnectionModalType] = useState("success");
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connectionModalPrimaryText, setConnectionModalPrimaryText] =
    useState("OK");
  const [connectionModalPrimaryAction, setConnectionModalPrimaryAction] =
    useState(null);
  const [connectionModalSecondaryText, setConnectionModalSecondaryText] =
    useState(null);
  const [connectionModalSecondaryAction, setConnectionModalSecondaryAction] =
    useState(null);
  const [isRhoodMember, setIsRhoodMember] = useState(false);
  const [rhoodMemberCount, setRhoodMemberCount] = useState(0);
  const [lastMessages, setLastMessages] = useState({});
  const [rhoodGroupData, setRhoodGroupData] = useState(null);
  const [latestGroupMessage, setLatestGroupMessage] = useState(null);
  const [unreadGroupCount, setUnreadGroupCount] = useState(0);
  const [cancellingConnectionId, setCancellingConnectionId] = useState(null);
  const [acceptingUserId, setAcceptingUserId] = useState(null);
  const [decliningUserId, setDecliningUserId] = useState(null);
  const [isDeletingConnectionId, setIsDeletingConnectionId] = useState(null);
  const prevConnectionStatusesRef = useRef(new Map());

  const handleCloseConnectionModal = useCallback(() => {
    setShowConnectionModal(false);
    setConnectionModalPrimaryAction(null);
    setConnectionModalPrimaryText("OK");
    setConnectionModalSecondaryText(null);
    setConnectionModalSecondaryAction(null);
    setSelectedConnection(null);
  }, []);

  const handleConnectionModalPrimaryPress = useCallback(() => {
    if (connectionModalPrimaryAction) {
      connectionModalPrimaryAction();
    } else {
      handleCloseConnectionModal();
    }
  }, [connectionModalPrimaryAction, handleCloseConnectionModal]);

  const handleConnectionModalSecondaryPress = useCallback(() => {
    if (connectionModalSecondaryAction) {
      connectionModalSecondaryAction();
    } else {
      handleCloseConnectionModal();
    }
  }, [connectionModalSecondaryAction, handleCloseConnectionModal]);

  const normalizeConnectionStatus = (status) => {
    if (status === undefined || status === null) return null;
    const normalized = status.toString().trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
  };

  const isAcceptedConnectionStatus = (status) => {
    const normalized = normalizeConnectionStatus(status);
    return (
      normalized === "accepted" ||
      normalized === "approved" ||
      normalized === "connected"
    );
  };

  const isPendingConnectionStatus = (status) =>
    normalizeConnectionStatus(status) === "pending";

  // Update user state when prop changes
  useEffect(() => {
    if (propUser && propUser !== user) {
      console.log("User prop changed, updating user state");
      setUser(propUser);
    }
  }, [propUser]);

  // Load popular DJs (trending DJs)
  const loadPopularDJs = async () => {
    try {
      setPopularDJsLoading(true);
      
      // Get popular DJs based on recent activity, credits, and mix uploads
      const { data: popularUsers, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          dj_name,
          profile_image_url,
          city,
          genres,
          credits,
          gigs_completed,
          created_at
        `)
        .not('dj_name', 'is', null)
        .order('credits', { ascending: false })
        .order('gigs_completed', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error loading popular DJs:", error);
        // Fallback: get recent DJs
        const { data: recentUsers } = await supabase
          .from('user_profiles')
          .select('id, dj_name, profile_image_url, city, genres')
          .not('dj_name', 'is', null)
          .order('created_at', { ascending: false })
          .limit(10);
        
        setPopularDJs(recentUsers || []);
        return;
      }

      setPopularDJs(popularUsers || []);
    } catch (error) {
      console.error("Error loading popular DJs:", error);
      setPopularDJs([]);
    } finally {
      setPopularDJsLoading(false);
    }
  };

  // Load user and discover data on mount
  useEffect(() => {
    const initializeData = async () => {
      await loadUserAndConnections({ showLoader: true });
      // Load discover data after connections are loaded
      await loadDiscoverDJs();
      // Load popular DJs
      await loadPopularDJs();
      // Check R/HOOD membership
      await checkRhoodMembership();
    };
    initializeData();
  }, []);

  // Load data when Messages tab becomes active (only if not already loaded)
  useEffect(() => {
    if (activeTab === "connections" && user && !hasLoadedConnections) {
      loadUserAndConnections();
      checkRhoodMembership();
    }
  }, [activeTab, user, hasLoadedConnections]);

  const loadUserAndConnections = async ({ showLoader = false } = {}) => {
    try {
      if (showLoader || !hasLoadedConnections) {
      setLoading(true);
      }

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

      // Get all conversation participants (even if not connected)
      const conversationParticipants = await db.getAllConversationParticipants(
        currentUser.id
      );

      // Debug: Log the data
      console.log(
        "🔍 Connections tab - Raw connections data:",
        connectionsData
      );
      console.log(
        "🔍 Connections tab - Number of connections:",
        connectionsData?.length || 0
      );
      console.log(
        "🔍 Conversations tab - Number of conversation participants:",
        conversationParticipants?.length || 0
      );

      // Create a map of existing connections
      const connectionsMap = {};
      const newlyAcceptedConnections = [];
      if (connectionsData && connectionsData.length > 0) {
        connectionsData.forEach((conn) => {
          // Log connection data for debugging
          console.log("🔍 Connection data:", {
            id: conn.connected_user_id,
            name: conn.connected_user_name,
            image: conn.connected_user_image,
            hasImage: !!conn.connected_user_image,
          });

          // Ensure profileImage is a valid URL string or null
          let profileImage = conn.connected_user_image || null;
          if (
            profileImage &&
            typeof profileImage === "string" &&
            profileImage.trim()
          ) {
            // Ensure it's a valid URL
            profileImage = profileImage.trim();
          } else {
            profileImage = null;
          }

          const rawStatus =
            conn.connection_status ||
            conn.status ||
            conn.connectionStatus ||
            conn.state ||
            null;
          const normalizedStatus = normalizeConnectionStatus(rawStatus);
          const connectionId =
            conn.connection_id ||
            conn.id ||
            conn.connectionId ||
            conn.connection_uuid ||
            null;
          const initiatedBy =
            conn.initiated_by ||
            conn.requested_by ||
            conn.requester_id ||
            conn.sent_by ||
            null;
          const threadId = conn.thread_id || null;

          const previousStatus = prevConnectionStatusesRef.current.get(
            conn.connected_user_id
          );
          prevConnectionStatusesRef.current.set(
            conn.connected_user_id,
            normalizedStatus
          );
          if (
            previousStatus === "pending" &&
            isAcceptedConnectionStatus(normalizedStatus)
          ) {
            newlyAcceptedConnections.push({
              userId: conn.connected_user_id,
              name: conn.connected_user_name || "this DJ",
              connectionId: connectionId,
              threadId: threadId,
            });
          }

          connectionsMap[conn.connected_user_id] = {
            id: conn.connected_user_id,
            name: conn.connected_user_name,
            username: conn.connected_user_username
              ? `@${conn.connected_user_username}`
              : `@${
                  conn.connected_user_name?.toLowerCase().replace(/\s+/g, "") ||
                  "user"
                }`,
            location:
              conn.connected_user_city ||
              conn.connected_user_location ||
              "Location not set",
            genres: conn.connected_user_genres || [],
            profileImage: profileImage,
            rating: conn.connected_user_rating || 0,
            gigsCompleted: conn.connected_user_gigs || 0,
            lastActive: "Recently",
            mutualConnections: 0,
            status: "online",
            isVerified: conn.connected_user_verified || false,
            connectionStatus: normalizedStatus,
            connectionStatusRaw: rawStatus,
            isConnected: isAcceptedConnectionStatus(normalizedStatus),
            statusMessage: conn.connected_user_status_message || "",
            connectionId,
            threadId,
            connectionInitiatedBy: initiatedBy,
            isIncomingPending:
              normalizeConnectionStatus(rawStatus) === "pending" &&
              initiatedBy &&
              currentUser.id &&
              initiatedBy !== currentUser.id,
            isOutgoingPending:
              normalizeConnectionStatus(rawStatus) === "pending" &&
              initiatedBy &&
              currentUser.id &&
              initiatedBy === currentUser.id,
          };
        });

        prevConnectionStatusesRef.current.forEach((_, userId) => {
          if (!connectionsMap[userId]) {
            prevConnectionStatusesRef.current.delete(userId);
          }
        });
      }

      // Add conversation participants who aren't already in connections
      if (conversationParticipants && conversationParticipants.length > 0) {
        conversationParticipants.forEach((participant) => {
          if (!connectionsMap[participant.userId]) {
            // This user has a conversation but is not a connection
            connectionsMap[participant.userId] = {
              id: participant.userId,
              name: participant.name,
              username: participant.username
                ? `@${participant.username}`
                : `@${
                    participant.name?.toLowerCase().replace(/\s+/g, "") ||
                    "user"
                  }`,
              location: participant.location || "Location not set",
              genres: participant.genres || [],
              profileImage: participant.profileImage || null,
              rating: 0,
              gigsCompleted: 0,
              lastActive: "Recently",
              mutualConnections: 0,
              status: "online",
              isVerified: participant.isVerified || false,
              connectionStatus: null, // No connection status
              statusMessage: participant.statusMessage || "",
              connectionId: null,
              threadId: participant.threadId || null,
              connectionInitiatedBy: null,
              isIncomingPending: false,
              isOutgoingPending: false,
            };
          }
        });
      }

      // Convert map to array
      const allConnections = Object.values(connectionsMap);

      if (allConnections.length > 0) {
        setConnections(allConnections);
        console.log(
          `✅ Loaded ${allConnections.length} total conversations (connections + participants)`
        );

        // Load last messages for all connections
        await loadLastMessagesForConnections(currentUser.id, allConnections);

        if (newlyAcceptedConnections.length > 0) {
          const accepted = newlyAcceptedConnections[0];
          setConnectionMessage(
            `You are now connected with ${accepted.name}! Click below to chat.`
          );
          setConnectionModalType("success");
          setConnectionModalPrimaryText("Click to Chat");
          setConnectionModalPrimaryAction(
            () =>
              () => {
                if (onNavigate) {
                  onNavigate("messages", {
                    isGroupChat: false,
                    djId: accepted.userId,
                    connectionId: accepted.connectionId || null,
                    threadId: accepted.threadId || null,
                    returnToConnectionsTab: "connections",
                  });
                }
                handleCloseConnectionModal();
              }
          );
          setShowConnectionModal(true);
        }
      } else {
        // No connections yet, show empty state
        setConnections([]);
        console.log("📭 No conversations found");
      }
    } catch (error) {
      console.error("❌ Error loading connections:", error);
      // Show empty state on error
      setConnections([]);
    } finally {
      setLoading(false);
      if (!hasLoadedConnections) {
        setHasLoadedConnections(true);
      }
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

  // Load messages once when connections are first loaded
  useEffect(() => {
    const loadMessages = async () => {
      // Only load if we have connections, user, and haven't loaded messages yet
      // Also check that connections have actually been loaded (hasLoadedConnections)
      if (user?.id && connections.length > 0 && hasLoadedConnections && !hasLoadedMessagesRef.current) {
        hasLoadedMessagesRef.current = true;
        await loadLastMessagesForConnections(user.id, connections);
      }
    };

    loadMessages();
  }, [user?.id, connections.length, hasLoadedConnections]);

  // Set up real-time subscription for messages to keep chat list updated
  useEffect(() => {
    if (!user?.id || !hasLoadedConnections || connections.length === 0) return;

    console.log("📨 Setting up real-time subscription for messages list");

    // Subscribe to all messages for the current user
    const channel = supabase
      .channel("messages-list-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("📨 New message received in list:", payload.new);
          // Refresh last messages when a new message arrives (only after initial load)
          if (user?.id && connections.length > 0 && hasLoadedMessagesRef.current) {
            loadLastMessagesForConnections(user.id, connections);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "community_posts",
        },
        (payload) => {
          console.log("📨 New group message received in list:", payload.new);
          // Check if user is part of the R/HOOD group
          if (
            payload.new.community_id === "550e8400-e29b-41d4-a716-446655440000"
          ) {
            checkRhoodMembership();
          }
        }
      )
      .subscribe();

    return () => {
      console.log("📨 Cleaning up messages list subscription");
      supabase.removeChannel(channel);
    };
  }, [user?.id, connections.length, hasLoadedConnections]);

  // Periodic refresh to ensure accuracy (every 10 seconds) - only after initial load
  useEffect(() => {
    if (!user?.id || connections.length === 0 || !hasLoadedMessagesRef.current) return;

    const refreshInterval = setInterval(() => {
      console.log("🔄 Periodic refresh of messages list");
      loadLastMessagesForConnections(user.id, connections);
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(refreshInterval);
  }, [user?.id, connections.length]);

  // Listen for connection status changes to keep UI in sync
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`connections-updates-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connections",
        },
        (payload) => {
          const involvesUser =
            payload.new?.user_id_1 === user.id ||
            payload.new?.user_id_2 === user.id ||
            payload.old?.user_id_1 === user.id ||
            payload.old?.user_id_2 === user.id;

          if (involvesUser) {
            console.log("🔗 Connection change detected:", payload);
            loadUserAndConnections({ showLoader: false });
            loadDiscoverDJs();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const checkRhoodMembership = async () => {
    try {
      if (!user?.id) return;

      const rhoodCommunityId = "550e8400-e29b-41d4-a716-446655440000";

      // Load community data
      const communityData = await db.getCommunityData(rhoodCommunityId);
      setRhoodGroupData(communityData);

      // Check membership
      const isMember = await db.isUserCommunityMember(
        rhoodCommunityId,
        user.id
      );
      setIsRhoodMember(isMember);

      // Get member count
      const memberCount = await db.getCommunityMemberCount(rhoodCommunityId);
      setRhoodMemberCount(memberCount);

      // Get latest message if user is a member
      if (isMember) {
        const latestMessage = await db.getLatestGroupMessage(rhoodCommunityId);
        setLatestGroupMessage(latestMessage);

        // Get unread count
        const unreadCount = await db.getUnreadGroupMessageCount(
          rhoodCommunityId,
          user.id
        );
        setUnreadGroupCount(unreadCount);
      }
    } catch (error) {
      console.error("Error checking R/HOOD membership:", error);
      setIsRhoodMember(false);
      setRhoodMemberCount(0);
    }
  };

  const handleJoinRhoodGroup = async () => {
    try {
      if (!user?.id) {
        Alert.alert("Error", "Please log in to join the R/HOOD Group");
        return;
      }

      const rhoodCommunityId = "550e8400-e29b-41d4-a716-446655440000";

      // Join the community
      await db.joinCommunity(rhoodCommunityId, user.id);

      // Update local state
      setIsRhoodMember(true);
      setRhoodMemberCount((prev) => prev + 1);

      Alert.alert(
        "Welcome to R/HOOD Group!",
        "You've successfully joined the main R/HOOD community chat. Start connecting with fellow DJs!",
        [{ text: "OK" }]
      );
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
    // Check if we're in share mode
    const routeParams = route?.params || {};
    if (routeParams.shareMode && routeParams.onShareSelect) {
      // Handle sharing opportunity to this connection
      routeParams.onShareSelect(connection.id);
      return;
    }

    const payload = {
      isGroupChat: false,
      djId: connection.id,
    };

    if (connection.threadId) {
      payload.threadId = connection.threadId;
    }
    if (connection.connectionId) {
      payload.connectionId = connection.connectionId;
    }

    onNavigate &&
      onNavigate("messages", {
        ...payload,
        returnToConnectionsTab: "connections",
      });
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
        setConnectionModalType("success");
        setConnectionModalPrimaryText("OK");
        setConnectionModalPrimaryAction(null);
        setShowConnectionModal(true);

        // Update the user's connection status in the local state
        setDiscoverUsers((prev) =>
          prev.map((user) =>
            user.id === connection.id
              ? {
                  ...user,
                  isConnected: false,
                  connectionStatus: "pending",
                  connectionStatusRaw: "pending",
                  connectionId:
                    connectionResult?.id ||
                    connectionResult?.connection_id ||
                    user.connectionId ||
                    null,
                }
              : user
          )
        );
        await loadUserAndConnections({ showLoader: false });
      } else {
        setConnectionMessage(`You're already connected to ${displayName}`);
        setConnectionModalType("info");
        setConnectionModalPrimaryText("OK");
        setConnectionModalPrimaryAction(
          () =>
            () => {
              handleConnectionPress({
                id: connection.id,
                connectionId:
                  connectionResult?.id ||
                  connectionResult?.connection_id ||
                  connection.connectionId ||
                  null,
                threadId: connection.threadId || null,
              });
              handleCloseConnectionModal();
            }
        );
        setShowConnectionModal(true);
      }
    } catch (error) {
      console.error("Error sending connection request:", error);
      setConnectionMessage("Failed to send connection request");
      setConnectionModalType("error");
      setConnectionModalPrimaryText("OK");
      setConnectionModalPrimaryAction(null);
      setShowConnectionModal(true);
    } finally {
      setDiscoverLoading(false);
    }
  };

  const resolveConnectionId = async (target) => {
    if (target?.connectionId) return target.connectionId;
    if (!user?.id || !target?.id) return null;

    try {
      const connectionRecord = await db.getConnectionStatus(user.id, target.id);
      if (connectionRecord) {
        return (
          connectionRecord.id ||
          connectionRecord.connection_id ||
          connectionRecord.connectionId ||
          null
        );
      }
    } catch (error) {
      console.warn("resolveConnectionId failed:", error);
    }

    return null;
  };

  const handleDeleteConnection = useCallback(
    async (connection) => {
      if (!connection) return;

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const deletionKey = connection.connectionId || connection.id;
        setIsDeletingConnectionId(deletionKey);
        setConnectionModalPrimaryText("Removing...");
        setConnectionModalPrimaryAction(() => () => {});

        const resolvedConnectionId =
          connection.connectionId || (await resolveConnectionId(connection));

        if (!resolvedConnectionId) {
          setConnectionModalType("error");
          setConnectionMessage(
            "We couldn't find this connection. Please refresh and try again."
          );
          setConnectionModalPrimaryText("Close");
          setConnectionModalPrimaryAction(null);
          setConnectionModalSecondaryText(null);
          setConnectionModalSecondaryAction(null);
          return;
        }

        await db.deleteConnection(resolvedConnectionId);

        setConnections((prev) =>
          prev.filter((item) => item.id !== connection.id)
        );
        setDiscoverUsers((prev) =>
          prev.map((userItem) =>
            userItem.id === connection.id
              ? {
                  ...userItem,
                  isConnected: false,
                  connectionStatus: null,
                  connectionStatusRaw: null,
                  connectionId: null,
                  threadId: null,
                }
              : userItem
          )
        );
        setLastMessages((prev) => {
          const updated = { ...prev };
          delete updated[connection.id];
          return updated;
        });
        prevConnectionStatusesRef.current.delete(connection.id);

        const displayName = getUserName(connection);
        setConnectionModalType("success");
        setConnectionMessage(
          `${displayName} has been removed from your connections.`
        );
        setConnectionModalPrimaryText("OK");
        setConnectionModalPrimaryAction(null);
        setConnectionModalSecondaryText(null);
        setConnectionModalSecondaryAction(null);
        setSelectedConnection(null);
      } catch (error) {
        console.error("Error removing connection:", error);
        setConnectionModalType("error");
        setConnectionMessage(
          "Failed to remove this connection. Please try again."
        );
        setConnectionModalPrimaryText("Close");
        setConnectionModalPrimaryAction(null);
        setConnectionModalSecondaryText(null);
        setConnectionModalSecondaryAction(null);
      } finally {
        setIsDeletingConnectionId(null);
      }
    },
    [
      resolveConnectionId,
      setConnections,
      setDiscoverUsers,
      setLastMessages,
      getUserName,
    ]
  );

  const handleOpenConnectionOptions = useCallback(
    (connection) => {
      if (!connection) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedConnection(connection);
      const displayName = getUserName(connection);

      setConnectionMessage(
        `Remove ${displayName} from your connections? You can reconnect anytime by sending a new request.`
      );
      setConnectionModalType("warning");
      setConnectionModalPrimaryText("Remove Connection");
      setConnectionModalPrimaryAction(
        () =>
          () => {
            handleDeleteConnection(connection);
          }
      );
      setConnectionModalSecondaryText("Keep Connection");
      setConnectionModalSecondaryAction(() => () => {
        handleCloseConnectionModal();
      });
      setShowConnectionModal(true);
    },
    [getUserName, handleDeleteConnection, handleCloseConnectionModal]
  );

  const performCancelPendingConnection = async (connection, connectionId, displayName) => {
    try {
      setCancellingConnectionId(connectionId || connection.id);
      await db.cancelConnectionRequest(connectionId);

      setDiscoverUsers((prev) =>
        prev.map((userItem) =>
          userItem.id === connection.id
            ? {
                ...userItem,
                isConnected: false,
                connectionStatus: null,
                connectionStatusRaw: null,
                connectionId: null,
              }
            : userItem
        )
      );

      setConnections((prev) =>
        prev.map((item) =>
          item.id === connection.id
            ? {
                ...item,
                connectionStatus: null,
                connectionStatusRaw: null,
                connectionId: null,
              }
            : item
        )
      );

      await loadUserAndConnections({ showLoader: false });

      setConnectionMessage(
        `Connection request to ${displayName} has been cancelled.`
      );
      setConnectionModalType("info");
      setConnectionModalPrimaryText("OK");
      setConnectionModalPrimaryAction(null);
      setShowConnectionModal(true);
    } catch (error) {
      console.error("Error cancelling connection request:", error);
      Alert.alert(
        "Error",
        `Failed to cancel connection request: ${error.message || "Unknown error"}`
      );
    } finally {
      setCancellingConnectionId(null);
    }
  };

  const handleCancelPendingConnection = (connection) => {
    if (!connection) return;

    const displayName =
      connection?.dj_name ||
      connection?.full_name ||
      `${connection?.first_name || ""} ${
        connection?.last_name || ""
      }`.trim() ||
      "this DJ";

    Alert.alert(
      "Cancel Connection Request?",
      `Do you want to cancel your pending connection request to ${displayName}?`,
      [
        {
          text: "Keep Pending",
          style: "cancel",
        },
        {
          text: "Cancel Request",
          style: "destructive",
          onPress: async () => {
            try {
              const connectionId = await resolveConnectionId(connection);
              if (!connectionId) {
                Alert.alert(
                  "Error",
                  "We couldn't find the pending request to cancel. Please try again."
                );
                return;
              }
              await performCancelPendingConnection(
                connection,
                connectionId,
                displayName
              );
            } catch (error) {
              console.error("Error resolving connection for cancellation:", error);
              Alert.alert(
                "Error",
                `Failed to cancel connection request: ${
                  error.message || "Unknown error"
                }`
              );
            }
          },
        },
      ]
    );
  };

  const handleAcceptPendingConnection = async (connection) => {
    if (!connection) return;

    const displayName =
      connection?.name ||
      connection?.dj_name ||
      connection?.full_name ||
      `${connection?.first_name || ""} ${connection?.last_name || ""}`.trim() ||
      "this DJ";

    try {
      const connectionId =
        connection.connectionId ||
        connection.connection_id ||
        (await resolveConnectionId(connection));

      if (!connectionId) {
        Alert.alert(
          "Error",
          "We couldn't find this connection request. Please try again."
        );
        return;
      }

      setAcceptingUserId(connection.id);
      await db.acceptConnection(connectionId);

      await loadUserAndConnections({ showLoader: false });
      await loadDiscoverDJs();
    } catch (error) {
      console.error("Error accepting connection request:", error);
      Alert.alert(
        "Error",
        `Failed to accept connection request: ${error.message || "Unknown error"}`
      );
    } finally {
      setAcceptingUserId(null);
    }
  };

  const handleDeclinePendingConnection = async (connection) => {
    if (!connection) return;

    const displayName =
      connection?.name ||
      connection?.dj_name ||
      connection?.full_name ||
      `${connection?.first_name || ""} ${connection?.last_name || ""}`.trim() ||
      "this DJ";

    try {
      const connectionId =
        connection.connectionId ||
        connection.connection_id ||
        (await resolveConnectionId(connection));

      if (!connectionId) {
        Alert.alert(
          "Error",
          "We couldn't find this connection request to decline. Please try again."
        );
        return;
      }

      setDecliningUserId(connection.id);
      await db.declineConnection(connectionId);

      await loadUserAndConnections({ showLoader: false });
      await loadDiscoverDJs();

      setConnectionMessage(
        `Connection request from ${displayName} has been declined.`
      );
      setConnectionModalType("info");
      setConnectionModalPrimaryText("OK");
      setConnectionModalPrimaryAction(null);
      setShowConnectionModal(true);
    } catch (error) {
      console.error("Error declining connection request:", error);
      Alert.alert(
        "Error",
        `Failed to decline connection request: ${
          error.message || "Unknown error"
        }`
      );
    } finally {
      setDecliningUserId(null);
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
        const rawStatus =
          conn.connection_status ||
          conn.status ||
          conn.connectionStatus ||
          conn.state ||
          null;
        const normalizedStatus = normalizeConnectionStatus(rawStatus);
        connectionStatusMap.set(userId, {
          status: normalizedStatus,
          statusRaw: rawStatus,
          initiated_by: conn.initiated_by,
          created_at: conn.created_at,
          accepted_at: conn.accepted_at,
          // Include the connection record id for navigation
          connection_id: conn.connection_id || conn.id || conn.connectionId || conn.connection_uuid || null,
          thread_id: conn.thread_id || null,
        });
      });

      console.log(
        "🔍 Connection status map:",
        Object.fromEntries(connectionStatusMap)
      );

      // Transform to match UI format with connection status
      const formattedDiscoverUsers = recommendedUsers.map((user) => {
        const connectionInfo = connectionStatusMap.get(user.id);
        const normalizedStatus = connectionInfo?.status
          ? normalizeConnectionStatus(connectionInfo.status)
          : null;
        const isConnected = isAcceptedConnectionStatus(normalizedStatus);

        // Ensure profileImage is properly formatted
        let profileImage = user.profile_image_url || null;
        if (profileImage && typeof profileImage === "string") {
          profileImage = profileImage.trim();
          if (
            profileImage === "" ||
            profileImage === "null" ||
            profileImage === "undefined"
          ) {
            profileImage = null;
          }
        } else {
          profileImage = null;
        }

        const formattedUser = {
          id: user.id,
          name: user.dj_name || user.full_name || "Unknown DJ",
          username: user.username
            ? `@${user.username}`
            : `@${(user.dj_name || user.full_name || "dj")
                .toLowerCase()
                .replace(/\s+/g, "")}`,
          location: user.city || user.location || "Location not set",
          genres: user.genres || [],
          profileImage: profileImage,
          gigsCompleted: user.gigs_completed || 0,
          lastActive: "Recently",
          status: "online",
          isVerified: user.is_verified || false,
          bio: user.bio || "DJ and music producer",
          statusMessage: user.status_message || "",
          isConnected: isConnected,
          connectionStatus: normalizedStatus,
          connectionStatusRaw:
            connectionInfo?.statusRaw || connectionInfo?.status || null,
          connectionId:
            connectionInfo?.connection_id ||
            connectionInfo?.connectionId ||
            connectionInfo?.connection_uuid ||
            null,
          threadId: connectionInfo?.thread_id || null,
          connectionId:
            connectionInfo?.connection_id ||
            connectionInfo?.connectionId ||
            connectionInfo?.connection_uuid ||
            null,
        };

        // Log for debugging
        if (profileImage) {
          console.log(
            `🖼️ Discover user ${formattedUser.name} has profileImage:`,
            profileImage
          );
        }

        return formattedUser;
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
    let filtered = connections.filter((connection) => {
      const normalizedStatus = normalizeConnectionStatus(
        connection.connectionStatus || connection.connectionStatusRaw
      );

      if (!normalizedStatus) return true;

      return (
        isAcceptedConnectionStatus(normalizedStatus) ||
        isPendingConnectionStatus(normalizedStatus)
      );
    });

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (connection) =>
          [
            connection.name,
            connection.dj_name,
            connection.full_name,
            connection.username,
            connection.location,
            connection.statusMessage,
          ]
            .filter(Boolean)
            .some((field) => field.toLowerCase().includes(query)) ||
          connection.genres?.some((genre) =>
            genre.toLowerCase().includes(query)
          )
      );
    }

    return filtered;
  }, [connections, searchQuery]);

  const filteredDiscoverUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return discoverUsers;
    }
    const query = searchQuery.toLowerCase();
    return discoverUsers.filter(
      (user) =>
        [
          user.name,
          user.username,
          user.location,
          user.statusMessage,
        ]
          .filter(Boolean)
          .some((field) => field.toLowerCase().includes(query)) ||
        user.genres?.some((genre) => genre.toLowerCase().includes(query))
    );
  }, [discoverUsers, searchQuery]);

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

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return "";

    const now = new Date();
    const messageTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60));

    if (diffInMinutes < 1) return "now";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;

    return messageTime.toLocaleDateString();
  };

  const loadLastMessagesForConnections = async (userId, connections) => {
    try {
      console.log("📨 Loading last messages for connections...");
      console.log("📨 User ID:", userId);
      console.log(
        "📨 Connections:",
        connections.map((c) => ({ id: c.id, name: c.name }))
      );

      // Get last messages for all connections
      const lastMessagesData = await db.getLastMessagesForAllConnections(
        userId
      );

      console.log("📨 Last messages loaded:", lastMessagesData);
      console.log("📨 Last messages keys:", Object.keys(lastMessagesData));
      setLastMessages(lastMessagesData);
    } catch (error) {
      console.error("❌ Error loading last messages:", error);
      setLastMessages({});
    }
  };

  const getLastMessageContent = (connection) => {
    // Get the last message from state
    const lastMessage = lastMessages[connection.id];
    console.log(
      `🔍 Getting last message for ${connection.name} (ID: ${connection.id}):`,
      lastMessage
    );

    if (!lastMessage) {
      console.log(`❌ No last message found for ${connection.name}`);
      return "No messages yet";
    }

    // Format the message content based on type
    if (lastMessage.messageType === "image") {
      return "📷 Photo";
    } else if (lastMessage.messageType === "video") {
      return "🎥 Video";
    } else if (lastMessage.messageType === "audio") {
      return "🎵 Audio";
    } else if (lastMessage.messageType === "file") {
      return "📎 File";
    } else {
      return lastMessage.content || "No messages yet";
    }
  };

  const getLastMessageTime = (connection) => {
    const lastMessage = lastMessages[connection.id];
    if (!lastMessage || !lastMessage.timestamp) return "";

    return formatMessageTime(lastMessage.timestamp);
  };

  const getLastMessageSender = (connection) => {
    const lastMessage = lastMessages[connection.id];
    console.log(`🔍 Getting sender for ${connection.name}:`, lastMessage);

    if (!lastMessage) {
      console.log(`❌ No sender info for ${connection.name}`);
      return "";
    }

    // Show sender name if it's not the current user
    if (lastMessage.senderId !== user?.id) {
      return `${lastMessage.senderName}: `;
    }
    return "You: ";
  };

  // Filter out connections with no messages
  const connectionsWithMessages = useMemo(() => {
    return filteredConnections.filter((connection) => {
      const lastMessage = lastMessages[connection.id];
      // Show if there's a message (text or media)
      return (
        lastMessage &&
        (lastMessage.content ||
          lastMessage.messageType === "image" ||
          lastMessage.messageType === "video" ||
          lastMessage.messageType === "audio" ||
          lastMessage.messageType === "file")
      );
    });
  }, [filteredConnections, lastMessages]);

  const incomingConnectionRequests = useMemo(() => {
    if (!user?.id) return [];
    return filteredConnections.filter(
      (connection) =>
        isPendingConnectionStatus(connection.connectionStatus) &&
        connection.connectionInitiatedBy &&
        connection.connectionInitiatedBy !== user.id
    );
  }, [filteredConnections, user?.id]);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
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
                // Reset fade animation for connections tab only on first load
                if (!hasLoadedConnections) {
                  connectionsFadeAnim.setValue(0);
                }
                // Reload connections data when switching to messages tab
                loadUserAndConnections();
                // Ensure connections stay visible without flicker
                Animated.timing(connectionsFadeAnim, {
                  toValue: 1,
                  duration: 300,
                  useNativeDriver: true,
                }).start();
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
                        <Text style={styles.messageName}>
                          {rhoodGroupData?.name || "R/HOOD Group"}
                        </Text>
                        <Text style={styles.messageTime}>
                          {isRhoodMember && latestGroupMessage
                            ? formatMessageTime(latestGroupMessage.created_at)
                            : "Join to chat"}
                        </Text>
                      </View>
                      <Text style={styles.messagePreview} numberOfLines={1}>
                        {isRhoodMember && latestGroupMessage
                          ? `${
                              latestGroupMessage.author?.dj_name ||
                              latestGroupMessage.author?.full_name ||
                              "User"
                            }: ${latestGroupMessage.content}`
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
                    {isRhoodMember && unreadGroupCount > 0 && (
                      <View style={styles.unreadCounter}>
                        <Text style={styles.unreadCount}>
                          {unreadGroupCount}
                        </Text>
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
                      onLongPress={
                        connection.isConnected
                          ? () => handleOpenConnectionOptions(connection)
                          : undefined
                      }
                      delayLongPress={350}
                      activeOpacity={0.85}
                    >
                      <View style={styles.messageContent}>
                        {/* Profile Avatar */}
                        <View style={styles.avatarContainer}>
                          <ProgressiveImage
                            source={
                              connection.profileImage &&
                              typeof connection.profileImage === "string" &&
                              connection.profileImage.trim()
                                ? { uri: connection.profileImage.trim() }
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
                          <View style={styles.messageHeaderMeta}>
                            <Text style={styles.messageTime}>
                              {connection.lastActive || "Recently"}
                            </Text>
                          </View>
                        </View>
                          {/* Location removed per design */}
                          {connection.statusMessage ? (
                            <Text
                              style={styles.connectionStatusMessage}
                              numberOfLines={1}
                            >
                              {connection.statusMessage}
                            </Text>
                          ) : null}
                          <View style={styles.messagePreview}>
                            <Text style={styles.messageText} numberOfLines={1}>
                              {getLastMessageSender(connection)}
                              {getLastMessageContent(connection)}
                            </Text>
                            <Text style={styles.messageTime}>
                              {getLastMessageTime(connection)}
                            </Text>
                          </View>
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
                {/* Popular DJs - Trending DJs */}
                {popularDJs.length > 0 && (
                  <View style={styles.recommendationsSection}>
                    <View style={styles.recommendationsHeader}>
                      <Ionicons
                        name="trending-up"
                        size={18}
                        color="hsl(75, 100%, 60%)"
                      />
                      <Text style={styles.recommendationsTitle}>
                        Popular DJs
                      </Text>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.recommendationsScroll}
                      contentContainerStyle={styles.recommendationsContent}
                    >
                      {popularDJs.map((dj) => (
                        <TouchableOpacity
                          key={dj.id}
                          style={styles.recommendationCard}
                          onPress={() => {
                            if (onNavigate) {
                              onNavigate("user-profile", { userId: dj.id, djName: dj.dj_name });
                            }
                          }}
                          activeOpacity={0.8}
                        >
                          <View style={styles.recommendationImageContainer}>
                            <ProgressiveImage
                              source={
                                dj.profile_image_url
                                  ? { uri: dj.profile_image_url }
                                  : null
                              }
                              style={styles.recommendationImage}
                              placeholder={
                                <View style={[styles.recommendationImage, { backgroundColor: "hsl(0, 0%, 12%)", justifyContent: "center", alignItems: "center" }]}>
                                  <Ionicons name="person" size={40} color="hsl(75, 100%, 60%)" />
                                </View>
                              }
                            />
                            {/* Dark gradient overlay at bottom for text visibility */}
                            <LinearGradient
                              colors={["transparent", "rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0.8)", "rgba(0, 0, 0, 0.95)"]}
                              style={styles.recommendationGradient}
                            />
                            {/* Text overlay */}
                            <View style={styles.recommendationInfo}>
                              <Text
                                style={styles.recommendationTitle}
                                numberOfLines={1}
                              >
                                {dj.dj_name || "DJ"}
                              </Text>
                              {dj.city && (
                                <Text
                                  style={styles.recommendationArtist}
                                  numberOfLines={1}
                                >
                                  {dj.city}
                                </Text>
                              )}
                              {dj.genres && dj.genres.length > 0 && (
                                <Text
                                  style={styles.recommendationGenre}
                                  numberOfLines={1}
                                >
                                  {dj.genres.slice(0, 2).join(", ")}
                                </Text>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    {/* Divider line */}
                    <View style={styles.recommendationsDivider} />
                  </View>
                )}

                {incomingConnectionRequests.length > 0 && (
                  <View style={[styles.pendingRequestsSection, { marginTop: 0 }]}>
                    <View style={styles.pendingRequestsHeader}>
                      <Ionicons
                        name="person-add"
                        size={18}
                        color="hsl(75, 100%, 60%)"
                      />
                      <Text style={styles.pendingRequestsTitle}>
                        Connection Requests
                      </Text>
                    </View>
                    {incomingConnectionRequests.map((request) => {
                      const isAccepting =
                        acceptingUserId && request.id === acceptingUserId;
                      const isDeclining =
                        decliningUserId && request.id === decliningUserId;
                      const isProcessing = isAccepting || isDeclining;

                      return (
                        <View
                          key={request.id}
                          style={styles.pendingRequestCard}
                        >
                          <View style={styles.pendingRequestInfo}>
                            <ProgressiveImage
                              source={
                                request.profileImage &&
                                typeof request.profileImage === "string" &&
                                request.profileImage.trim()
                                  ? { uri: request.profileImage.trim() }
                                  : null
                              }
                              style={styles.pendingRequestAvatar}
                              placeholder={
                                <ProfileImagePlaceholder
                                  size={48}
                                  style={styles.pendingRequestAvatar}
                                />
                              }
                            />
                            <View style={styles.pendingRequestDetails}>
                              <Text
                                style={styles.pendingRequestName}
                                numberOfLines={1}
                              >
                                {getUserName(request)}
                              </Text>
                              {request.statusMessage ? (
                                <Text
                                  style={styles.pendingRequestStatus}
                                  numberOfLines={1}
                                >
                                  {request.statusMessage}
                                </Text>
                              ) : null}
                              {request.username ? (
                                <Text
                                  style={styles.pendingRequestSubtitle}
                                  numberOfLines={1}
                                >
                                  {request.username}
                                </Text>
                              ) : null}
                            </View>
                          </View>
                          <View style={styles.pendingRequestActions}>
                            <TouchableOpacity
                              style={[
                                styles.pendingActionButton,
                                styles.pendingAcceptButton,
                                isProcessing && styles.pendingActionDisabled,
                              ]}
                              onPress={() =>
                                handleAcceptPendingConnection(request)
                              }
                              disabled={isProcessing}
                              activeOpacity={0.8}
                            >
                              {isAccepting ? (
                                <ActivityIndicator
                                  size="small"
                                  color="hsl(0, 0%, 0%)"
                                />
                              ) : (
                                <>
                                  <Ionicons
                                    name="checkmark"
                                    size={16}
                                    color="hsl(0, 0%, 0%)"
                                  />
                                  <Text style={styles.pendingActionText}>
                                    Accept
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[
                                styles.pendingActionButton,
                                styles.pendingDeclineButton,
                                isProcessing && styles.pendingActionDisabled,
                              ]}
                              onPress={() =>
                                handleDeclinePendingConnection(request)
                              }
                              disabled={isProcessing}
                              activeOpacity={0.8}
                            >
                              {isDeclining ? (
                                <ActivityIndicator
                                  size="small"
                                  color="hsl(0, 0%, 70%)"
                                />
                              ) : (
                                <>
                                  <Ionicons
                                    name="close"
                                    size={16}
                                    color="hsl(0, 0%, 70%)"
                                  />
                                  <Text
                                    style={[
                                      styles.pendingActionText,
                                      styles.pendingDeclineText,
                                    ]}
                                  >
                                    Decline
                                  </Text>
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
                {filteredDiscoverUsers.map((user, index) => {
                  const normalizedStatus = normalizeConnectionStatus(
                    user.connectionStatus
                  );
                  const isPending = normalizedStatus === "pending";
                  const pendingKey = user.connectionId || user.id;
                  const isCancelling =
                    isPending && pendingKey === cancellingConnectionId;
                  const pressableProps = user.isConnected
                    ? {
                        onLongPress: () => handleOpenConnectionOptions(user),
                        delayLongPress: 350,
                      }
                    : {};

                  return (
                  <AnimatedListItem key={user.id} index={index} delay={80}>
                      <Pressable style={styles.discoverCard} {...pressableProps}>
                      {/* Top Row: Profile Image + Name Info + Rating */}
                      <View style={styles.discoverTopRow}>
                        {/* Profile Image */}
                        <View style={styles.discoverProfileContainer}>
                          <ProgressiveImage
                            source={
                              user.profileImage &&
                              typeof user.profileImage === "string" &&
                              user.profileImage.trim()
                                ? { uri: user.profileImage.trim() }
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
                            {user.statusMessage ? (
                              <Text
                                style={styles.discoverStatus}
                                numberOfLines={1}
                              >
                                {user.statusMessage}
                              </Text>
                            ) : null}
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
                          {user.isConnected ? (
                        <TouchableOpacity
                          style={[
                            styles.discoverConnectButton,
                                styles.discoverMessageButton,
                              ]}
                              onPress={() =>
                                handleConnectionPress({
                                  id: user.id,
                                  connectionId: user.connectionId,
                                  threadId: user.threadId,
                                })
                          }
                        >
                          <Ionicons
                                name="chatbubble-outline"
                                size={16}
                                color="hsl(0, 0%, 0%)"
                              />
                              <Text style={styles.discoverMessageText}>
                                Message
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              style={[
                                styles.discoverConnectButton,
                                isPending && styles.discoverPendingButton,
                              ]}
                              onPress={() =>
                                isPending
                                  ? handleCancelPendingConnection(user)
                                  : handleConnect(user)
                              }
                              disabled={
                                discoverLoading || (isPending && isCancelling)
                              }
                            >
                              {isPending && isCancelling ? (
                                <ActivityIndicator
                                  size="small"
                                  color="hsl(75, 100%, 60%)"
                                />
                              ) : (
                                <Ionicons
                                  name={isPending ? "close" : "add"}
                            size={16}
                            color={
                                    isPending
                                      ? "hsl(75, 100%, 60%)"
                                : "hsl(0, 0%, 0%)"
                            }
                          />
                              )}
                          <Text
                            style={[
                              styles.discoverConnectText,
                                  isPending && styles.discoverPendingText,
                                ]}
                              >
                                {isPending
                                  ? isCancelling
                                    ? "Cancelling..."
                                    : "Cancel Request"
                              : "Connect"}
                          </Text>
                        </TouchableOpacity>
                          )}
                      </View>
                      </Pressable>
                  </AnimatedListItem>
                  );
                })}
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
        onClose={handleCloseConnectionModal}
        title="Connection Status"
        message={connectionMessage}
        type={connectionModalType}
        primaryButtonText={connectionModalPrimaryText}
        onPrimaryPress={handleConnectionModalPrimaryPress}
        secondaryButtonText={connectionModalSecondaryText}
        onSecondaryPress={handleConnectionModalSecondaryPress}
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
  scrollViewContent: {
    paddingBottom: 80, // Reduced padding to prevent bottom navigation cut-off
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80, // Reduced height to match padding
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "TS Block Bold",
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
    fontFamily: "TS Block Bold",
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
    fontFamily: "TS Block Bold",
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
    color: "hsl(0, 0%, 100%)",
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
    fontFamily: "TS Block Bold",
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
  messageHeaderMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  connectionStatusMessage: {
    fontSize: 13,
    color: "hsl(75, 100%, 70%)",
    fontFamily: "Arial",
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
    flex: 1,
    justifyContent: "space-between",
    marginBottom: 6,
    color: "hsl(0, 0%, 100%)",
    fontSize: 14,
    fontFamily: "Helvetica Neue",
  },
  messageText: {
    fontSize: 14,
    color: "hsl(0, 0%, 100%)",
    fontFamily: "Helvetica Neue",
    flex: 1,
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
  pendingRequestsSection: {
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: "hsl(0, 0%, 6%)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%, 0.12)",
    padding: 16,
    gap: 16,
  },
  pendingRequestsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pendingRequestsTitle: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    letterSpacing: 0.5,
  },
  pendingRequestCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%, 0.08)",
    padding: 12,
    gap: 12,
  },
  pendingRequestInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pendingRequestAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "hsl(0, 0%, 12%)",
  },
  pendingRequestDetails: {
    flex: 1,
    gap: 4,
  },
  pendingRequestName: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "700",
    color: "hsl(0, 0%, 100%)",
  },
  pendingRequestStatus: {
    fontSize: 13,
    color: "hsl(0, 0%, 70%)",
  },
  pendingRequestSubtitle: {
    fontSize: 12,
    color: "hsl(0, 0%, 55%)",
  },
  pendingRequestActions: {
    flexDirection: "row",
    gap: 10,
  },
  pendingActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  pendingAcceptButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
  },
  pendingDeclineButton: {
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 30%)",
  },
  pendingActionDisabled: {
    opacity: 0.6,
  },
  pendingActionText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
  },
  pendingDeclineText: {
    color: "hsl(0, 0%, 70%)",
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
    fontFamily: "TS Block Bold",
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
  discoverStatus: {
    fontSize: 13,
    fontFamily: "Arial",
    color: "hsl(75, 100%, 70%)",
    marginBottom: 6,
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
  // Recommendations Section Styles
  recommendationsSection: {
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  recommendationsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  recommendationsTitle: {
    fontSize: 18,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    letterSpacing: 0.5,
  },
  recommendationsScroll: {
    marginHorizontal: -20,
  },
  recommendationsContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  recommendationCard: {
    width: 160,
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%, 0.1)",
  },
  recommendationImageContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  recommendationImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "hsl(0, 0%, 12%)",
  },
  recommendationGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
  },
  recommendationInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    gap: 4,
  },
  recommendationTitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
  recommendationArtist: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
  },
  recommendationGenre: {
    fontSize: 11,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    marginTop: 2,
  },
  recommendationsDivider: {
    height: 1,
    backgroundColor: "hsl(0, 0%, 15%)",
    marginTop: 24,
    marginHorizontal: 20,
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
    fontFamily: "TS Block Bold",
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
  discoverMessageButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
  },
  discoverMessageText: {
    fontSize: 14,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
  },
  discoverConnectedButton: {
    backgroundColor: "hsl(0, 0%, 30%)",
    opacity: 0.8,
  },
  discoverPendingButton: {
    backgroundColor: "hsl(0, 0%, 12%)",
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%)",
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
  discoverPendingText: {
    color: "hsl(75, 100%, 60%)",
  },
});
