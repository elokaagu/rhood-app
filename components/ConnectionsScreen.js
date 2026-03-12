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
  Modal,
  FlatList,
  SectionList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ProgressiveImage from "./ProgressiveImage";
import ProfileImagePlaceholder from "./ProfileImagePlaceholder";
import ConnectionListItem from "./ConnectionListItem";
import CommunityListItem from "./CommunityListItem";
import DiscoverUserCard from "./DiscoverUserCard";
import { HapticPatterns } from "../lib/haptics";
import { connectionsService } from "../lib/connectionsService";
import { supabase, db } from "../lib/supabase";
import RhoodModal from "./RhoodModal";
import { LIST_PERFORMANCE } from "../lib/performanceConstants";

// No mock data - all data comes from database

// All connection data comes from database

function ConnectionsScreenComponent({
  user: propUser,
  onNavigate,
  initialTab = "discover",
  route = null, // Add route prop for share mode
  onPlayAudio, // Add audio playback handler
}) {
  // Ensure propUser is valid - return early if invalid
  // Check for string type first (common mistake)
  if (typeof propUser === 'string') {
    console.warn('ConnectionsScreen: user prop is a string, expected object');
    return null;
  }
  if (!propUser) {
    return null;
  }
  if (typeof propUser !== 'object' || propUser === null || Array.isArray(propUser)) {
    return null;
  }
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  // Safely initialize user state - ensure it's always an object
  const [user, setUser] = useState(() => {
    if (!propUser || typeof propUser !== 'object' || Array.isArray(propUser)) {
      return null;
    }
    return propUser;
  });
  const [activeTab, setActiveTab] = useState(initialTab); // 'connections' or 'discover'
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverUsers, setDiscoverUsers] = useState([]);
  const [popularDJs, setPopularDJs] = useState([]);
  const [popularDJsLoading, setPopularDJsLoading] = useState(false);
  const [nearbyDJs, setNearbyDJs] = useState([]);
  const [nearbyDJsLoading, setNearbyDJsLoading] = useState(false);
  const [nearbyOpportunities, setNearbyOpportunities] = useState([]);
  const [nearbyOpportunitiesLoading, setNearbyOpportunitiesLoading] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newLocationCity, setNewLocationCity] = useState("");
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [connectionsFadeAnim] = useState(new Animated.Value(1)); // Start visible for smooth rendering
  const [discoverFadeAnim] = useState(new Animated.Value(1)); // Start visible for smooth rendering
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
  const [lastMessages, setLastMessages] = useState({});
  const [communitiesData, setCommunitiesData] = useState({
    userCommunities: [],
    communityMessages: {},
    communityUnreadCounts: {},
    rhoodGroupData: null,
    isRhoodMember: false,
    rhoodMemberCount: 0,
    latestGroupMessage: null,
    unreadGroupCount: 0,
  });
  const userCommunities = communitiesData.userCommunities;
  const communityMessages = communitiesData.communityMessages;
  const communityUnreadCounts = communitiesData.communityUnreadCounts;
  const rhoodGroupData = communitiesData.rhoodGroupData;
  const isRhoodMember = communitiesData.isRhoodMember;
  const rhoodMemberCount = communitiesData.rhoodMemberCount;
  const latestGroupMessage = communitiesData.latestGroupMessage;
  const unreadGroupCount = communitiesData.unreadGroupCount;
  const [cancellingConnectionId, setCancellingConnectionId] = useState(null);
  const [acceptingUserId, setAcceptingUserId] = useState(null);
  const [decliningUserId, setDecliningUserId] = useState(null);
  const [isDeletingConnectionId, setIsDeletingConnectionId] = useState(null);
  const prevConnectionStatusesRef = useRef(new Map());
  const lastLoadedAtRef = useRef(0);
  const STALE_MS = 60 * 1000; // Don't full-reload if data is under 1 min old
  const PERIODIC_REFRESH_INTERVAL_MS = 30 * 1000; // Softer than 10s (audit §8)
  const REALTIME_DEBOUNCE_MS = 600; // Debounce connection-update handler
  const [connectionsLoadError, setConnectionsLoadError] = useState(null);
  const [discoverLoadError, setDiscoverLoadError] = useState(null);
  const realtimeDebounceRef = useRef(null);

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

  // Update user state when prop changes - ensure it's always valid
  useEffect(() => {
    if (propUser && typeof propUser === 'object' && !Array.isArray(propUser) && propUser !== user) {
      setUser(propUser);
    } else if (!propUser || typeof propUser !== 'object' || Array.isArray(propUser)) {
      // If propUser becomes invalid, don't update state
      console.warn('ConnectionsScreen: propUser became invalid, keeping current user state');
    }
  }, [propUser, user]);

  // Load popular DJs (trending DJs)
  const loadPopularDJs = async () => {
    try {
      setPopularDJsLoading(true);
      
      // Helper function to check if an email belongs to a brand account
      const isBrandAccount = (email) => {
        if (!email || typeof email !== "string") return false;
        const emailLower = email.toLowerCase();
        const brandPatterns = [
          /^team@/i,
          /^support@/i,
          /^info@/i,
          /^admin@/i,
          /^contact@/i,
          /^hello@/i,
          /^noreply@/i,
          /^no-reply@/i,
        ];
        return brandPatterns.some(pattern => pattern.test(emailLower));
      };
      
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
          created_at,
          email
        `)
        .not('dj_name', 'is', null)
        .order('credits', { ascending: false })
        .order('gigs_completed', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(15); // Get more to account for filtering

      if (error) {
        console.error("Error loading popular DJs:", error);
        // Fallback: get recent DJs
        const { data: recentUsers } = await supabase
          .from('user_profiles')
          .select('id, dj_name, profile_image_url, city, genres, email')
          .not('dj_name', 'is', null)
          .order('created_at', { ascending: false })
          .limit(15);
        
        // Filter out brand accounts
        const filteredRecent = (recentUsers || []).filter(user => !isBrandAccount(user.email));
        setPopularDJs(filteredRecent.slice(0, 10));
        return;
      }

      const filteredPopular = (popularUsers || []).filter(user => !isBrandAccount(user.email));
      setPopularDJs(filteredPopular.slice(0, 10));
    } catch (error) {
      console.error("Error loading popular DJs:", error);
      setPopularDJs([]);
    } finally {
      setPopularDJsLoading(false);
    }
  };

  // Load nearby opportunities based on user's city
  const loadNearbyOpportunities = async () => {
    try {
      setNearbyOpportunitiesLoading(true);

      // Get current user
      const { supabase } = await import("../lib/supabase");
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        setNearbyOpportunities([]);
        return;
      }

      // Get user's profile to find their city
      const userProfile = await db.getUserProfile(currentUser.id);
      if (!userProfile || !userProfile.city) {
        setNearbyOpportunities([]);
        return;
      }

      // Fetch active opportunities in the same city
      const { data: opportunitiesData, error } = await supabase
        .from("opportunities")
        .select("*")
        .eq("is_active", true)
        .ilike("city", userProfile.city) // Case-insensitive match
        .gte("event_date", new Date().toISOString().split("T")[0]) // Only future events
        .order("event_date", { ascending: true })
        .limit(10);

      if (error) {
        console.error("Error loading nearby opportunities:", error);
        setNearbyOpportunities([]);
        return;
      }

      // Transform opportunities for display
      const transformedOpportunities = (opportunitiesData || []).map((opp) => {
        const formattedDate = opp.event_date
          ? new Date(opp.event_date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          : "TBD";

        return {
          id: opp.id,
          title: opp.title,
          venue: opp.venue || "Venue TBD",
          city: opp.city || userProfile.city,
          date: formattedDate,
          genre: opp.genre || "Electronic",
          compensation: opp.payment
            ? `${opp.payment_currency || "GBP"} ${opp.payment}`
            : "TBD",
          image:
            opp.image_url ||
            (opp.genre === "Techno"
              ? "https://images.unsplash.com/photo-1571266028243-e68f8570c0e8?w=400&h=400&fit=crop"
              : opp.genre === "House"
              ? "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop"
              : "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop"),
        };
      });

      setNearbyOpportunities(transformedOpportunities);
    } catch (error) {
      console.error("Error loading nearby opportunities:", error);
      setNearbyOpportunities([]);
    } finally {
      setNearbyOpportunitiesLoading(false);
    }
  };

  // Update user's location
  const handleUpdateLocation = async () => {
    if (!newLocationCity.trim() || !user?.id) return;

    try {
      setUpdatingLocation(true);
      await db.updateUserProfile(user.id, { city: newLocationCity.trim() });

      // Update local user state
      setUser((prev) => ({
        ...prev,
        city: newLocationCity.trim(),
      }));

      // Reload nearby DJs and opportunities with new location
      await Promise.all([loadNearbyDJs(), loadNearbyOpportunities()]);

      setShowLocationModal(false);
      setNewLocationCity("");
      HapticPatterns.success();
      Alert.alert("Success", "Location updated successfully!");
    } catch (error) {
      console.error("❌ Error updating location:", error);
      Alert.alert("Error", "Failed to update location. Please try again.");
    } finally {
      setUpdatingLocation(false);
    }
  };

  // Get current location and update city
  const handleUseCurrentLocation = async () => {
    try {
      const { getCurrentLocation, reverseGeocode } = await import(
        "../lib/locationService"
      );

      const location = await getCurrentLocation();
      if (!location) {
        Alert.alert(
          "Location Unavailable",
          "Could not get your current location. Please enter your city manually."
        );
        return;
      }

      const city = await reverseGeocode(location.latitude, location.longitude);
      if (city) {
        setNewLocationCity(city);
      } else {
        Alert.alert(
          "Location Unavailable",
          "Could not determine your city. Please enter it manually."
        );
      }
    } catch (error) {
      console.error("❌ Error getting current location:", error);
      Alert.alert(
        "Error",
        "Failed to get your location. Please enter your city manually."
      );
    }
  };

  // Load nearby DJs based on user's city
  const loadNearbyDJs = async () => {
    try {
      setNearbyDJsLoading(true);

      // Get current user
      const { supabase } = await import("../lib/supabase");
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        setNearbyDJs([]);
        return;
      }

      // Get user's profile to find their city
      const userProfile = await db.getUserProfile(currentUser.id);
      if (!userProfile || !userProfile.city) {
        setNearbyDJs([]);
        return;
      }

      // Helper function to check if an email belongs to a brand account
      const isBrandAccount = (email) => {
        if (!email || typeof email !== "string") return false;
        const emailLower = email.toLowerCase();
        const brandPatterns = [
          /^team@/i,
          /^support@/i,
          /^info@/i,
          /^admin@/i,
          /^contact@/i,
          /^hello@/i,
          /^noreply@/i,
          /^no-reply@/i,
        ];
        return brandPatterns.some(pattern => pattern.test(emailLower));
      };

      // Get existing connections to exclude
      const existingConnections = await db.getUserConnections(
        currentUser.id,
        null // Get all connections regardless of status
      );
      const connectedUserIds = new Set(
        existingConnections.map((conn) => conn.connected_user_id)
      );

      // Query users in the same city (case-insensitive)
      const { data: nearbyUsers, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          dj_name,
          profile_image_url,
          city,
          genres,
          credits,
          gigs_completed,
          created_at,
          email,
          full_name,
          username,
          is_verified
        `)
        .not('dj_name', 'is', null)
        .neq('id', currentUser.id) // Exclude current user
        .ilike('city', userProfile.city) // Case-insensitive match
        .order('credits', { ascending: false })
        .order('gigs_completed', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(15); // Get more to account for filtering

      if (error) {
        console.error("Error loading nearby DJs:", error);
        setNearbyDJs([]);
        return;
      }

      // Filter out brand accounts and already connected users
      const filteredNearby = (nearbyUsers || [])
        .filter(user => !isBrandAccount(user.email))
        .filter(user => !connectedUserIds.has(user.id))
        .slice(0, 10);

      setNearbyDJs(filteredNearby);
    } catch (error) {
      console.error("Error loading nearby DJs:", error);
      setNearbyDJs([]);
    } finally {
      setNearbyDJsLoading(false);
    }
  };

  // Load nearby opportunities when user or city changes
  useEffect(() => {
    if (user?.id) {
      loadNearbyOpportunities();
    }
  }, [user?.id, user?.city]);

  // Run all loads in parallel; Connections tab shows list only after connections + communities (no flicker)
  useEffect(() => {
    const initializeData = async () => {
      const connectionsPromise = loadUserAndConnections({
        showLoader: true,
        deferLoadingEnd: true,
      }).then(async () => {
        await checkRhoodMembership();
        setLoading(false);
        setHasLoadedConnections(true);
        lastLoadedAtRef.current = Date.now();
        Animated.timing(connectionsFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
      await Promise.all([
        connectionsPromise,
        loadDiscoverDJs(),
        loadPopularDJs(),
        loadNearbyDJs(),
        loadNearbyOpportunities(),
      ]);
    };
    initializeData();
  }, []);

  // Load data when Messages tab becomes active — only if missing or stale (P0: no reload every tab switch)
  useEffect(() => {
    if (activeTab !== "connections" || !user?.id) return;
    const isStale = Date.now() - lastLoadedAtRef.current > STALE_MS;
    if (!hasLoadedConnections) {
      loadUserAndConnections();
      loadUserCommunities();
    } else if (isStale) {
      loadUserAndConnections({ showLoader: false });
      loadUserCommunities();
    }
  }, [activeTab, user?.id, hasLoadedConnections]);

  const loadUserAndConnections = async ({ showLoader = false, deferLoadingEnd = false } = {}) => {
    try {
      setConnectionsLoadError(null);
      if (showLoader || !hasLoadedConnections) {
      setLoading(true);
      }

      // Use prop user first, then try to fetch if not available
      let currentUser = propUser;

      if (!currentUser) {
        // Add a small delay to ensure auth state is fully initialized
        await new Promise((resolve) => setTimeout(resolve, 100));

        try {
          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();
          if (userError) {
            // getUser failed, try getSession below
          } else {
            currentUser = user;
          }
        } catch (getUserError) {
          // ignore, try getSession
        }

        // If getUser didn't work, try getSession
        if (!currentUser) {
          try {
            const {
              data: { session },
              error: sessionError,
            } = await supabase.auth.getSession();
            if (sessionError) {
              // ignore
            } else if (session?.user) {
              currentUser = session.user;
            }
          } catch (getSessionError) {
            // ignore
          }
        }
      }

      if (!currentUser) {
        Alert.alert("Error", "Please log in to view connections");
        return;
      }

      setUser(currentUser);

      // Parallel: connections and participants (saves one round-trip)
      const [connectionsData, conversationParticipants] = await Promise.all([
        db.getUserConnections(currentUser.id, null),
        db.getAllConversationParticipants(currentUser.id),
      ]);

      // Create a map of existing connections
      const connectionsMap = {};
      const newlyAcceptedConnections = [];
      if (connectionsData && connectionsData.length > 0) {
        connectionsData.forEach((conn) => {
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
        // Batch: fetch last messages then update connections + lastMessages in one pass
        const lastMessagesData = await db.getLastMessagesForAllConnections(
          currentUser.id
        );
        setConnections(allConnections);
        setLastMessages(lastMessagesData);
        hasLoadedMessagesRef.current = true; // avoid double fetch in "load messages once" effect

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
        setConnections([]);
      }
    } catch (error) {
      console.error("❌ Error loading connections:", error);
      setConnections([]);
      setConnectionsLoadError(error?.message || "Couldn't load connections");
      if (deferLoadingEnd) {
        setLoading(false);
        setHasLoadedConnections(true);
      }
    } finally {
      if (!deferLoadingEnd) {
        setLoading(false);
        if (!hasLoadedConnections) setHasLoadedConnections(true);
        lastLoadedAtRef.current = Date.now();
        Animated.timing(connectionsFadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }
  };

  const handleRefresh = async () => {
    HapticPatterns.pullToRefresh();
    setRefreshing(true);
    await Promise.all([
      loadUserAndConnections(),
      loadUserCommunities(),
    ]);
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
      supabase.removeChannel(channel);
    };
  }, [user?.id, connections.length, hasLoadedConnections]);

  // Periodic refresh (softer interval) - only after initial load
  useEffect(() => {
    if (!user?.id || connections.length === 0 || !hasLoadedMessagesRef.current) return;

    const refreshInterval = setInterval(() => {
      loadLastMessagesForConnections(user.id, connections);
    }, PERIODIC_REFRESH_INTERVAL_MS);

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
            if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
            realtimeDebounceRef.current = setTimeout(() => {
              realtimeDebounceRef.current = null;
              loadUserAndConnections({ showLoader: false });
              loadDiscoverDJs();
              loadNearbyDJs();
            }, REALTIME_DEBOUNCE_MS);
          }
        }
      )
      .subscribe();

    return () => {
      if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const loadUserCommunities = async () => {
    try {
      if (!user?.id) return;

      const communities = await connectionsService.getUserCommunities();
      const ids = (communities || []).map((c) => c.id);
      const [messagesMap, unreadCountsMap] = await Promise.all([
        ids.length ? db.getLatestGroupMessagesBatch(ids) : Promise.resolve({}),
        Promise.resolve(
          ids.reduce((acc, id) => ({ ...acc, [id]: 0 }), {})
        ),
      ]);

      const rhoodCommunityId = "550e8400-e29b-41d4-a716-446655440000";
      const rhoodCommunity = (communities || []).find((c) => c.id === rhoodCommunityId);

      setCommunitiesData({
        userCommunities: communities || [],
        communityMessages: messagesMap,
        communityUnreadCounts: unreadCountsMap,
        rhoodGroupData: rhoodCommunity || null,
        isRhoodMember: !!rhoodCommunity,
        rhoodMemberCount: rhoodCommunity?.member_count || 0,
        latestGroupMessage: rhoodCommunity ? (messagesMap[rhoodCommunityId] || null) : null,
        unreadGroupCount: rhoodCommunity ? (unreadCountsMap[rhoodCommunityId] || 0) : 0,
      });
    } catch (error) {
      console.error("Error loading user communities:", error);
      setCommunitiesData((prev) => ({ ...prev, userCommunities: [] }));
    }
  };

  const checkRhoodMembership = async () => {
    // This function is kept for backward compatibility but now uses loadUserCommunities
    await loadUserCommunities();
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

      // Reload communities to update the list
      await loadUserCommunities();

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

  const handleGroupChatPress = (communityId = null) => {
    const targetCommunityId = communityId || "550e8400-e29b-41d4-a716-446655440000";
    const community = userCommunities.find((c) => c.id === targetCommunityId);
    
    if (community) {
      onNavigate &&
        onNavigate("messages", {
          communityId: targetCommunityId,
          chatType: "group",
        });
    } else if (!communityId) {
      // Only show join prompt for R/HOOD if not a member
      handleJoinRhoodGroup();
    }
  };

  const handleConnectionPress = (connection) => {
    HapticPatterns.buttonPress();
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
    HapticPatterns.itemPress();
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
    HapticPatterns.buttonPress();
    try {
      setDiscoverLoading(true);

      // Debug: Log connection data

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
        HapticPatterns.delete();
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

        // Reload nearby DJs since this user is now available again
        await loadNearbyDJs();

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

      HapticPatterns.buttonPress();
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
      await loadNearbyDJs();
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
      await loadNearbyDJs();

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
      setDiscoverLoadError(null);
      setDiscoverLoading(true);

      // Get current user first
      const { supabase } = await import("../lib/supabase");
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
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

      // Create a map of user connections with their status
      const connectionStatusMap = new Map();
      existingConnections.forEach((conn) => {
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

        // Build display name with better fallbacks
        // Prefer dj_name, then full_name, then capitalize username, then just "DJ"
        const getDisplayName = () => {
          if (user.dj_name) return user.dj_name;
          if (user.full_name) return user.full_name;
          if (user.username) {
            // Capitalize username nicely (e.g., "johndoe" -> "Johndoe")
            return user.username.charAt(0).toUpperCase() + user.username.slice(1);
          }
          return "DJ"; // Simple fallback instead of "Unknown DJ"
        };

        const formattedUser = {
          id: user.id,
          name: getDisplayName(),
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

        return formattedUser;
      });

      setDiscoverUsers(formattedDiscoverUsers);
    } catch (error) {
      console.error("❌ Error loading discover DJs:", error);
      setDiscoverUsers([]);
      setDiscoverLoadError(error?.message || "Couldn't load discover");
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
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (connection) => {
          // Search in all relevant fields
          const searchableFields = [
            connection.name,
            connection.dj_name,
            connection.full_name,
            connection.username,
            connection.location,
            connection.city,
            connection.statusMessage,
          ].filter(Boolean);
          
          const matchesName = searchableFields.some((field) => 
            field.toLowerCase().includes(query)
          );
          
          const matchesGenre = connection.genres?.some((genre) => 
            genre.toLowerCase().includes(query)
          );
          
          return matchesName || matchesGenre;
        }
      );
    }

    return filtered;
  }, [connections, searchQuery]);

  // Fetch search suggestions from database
  const fetchSearchSuggestions = useCallback(async (query) => {
    const trimmedQuery = query.trim();
    
    if (!trimmedQuery || trimmedQuery.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      // Search for DJs by name, username, or city
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, dj_name, full_name, username, city, profile_image_url")
        .or(`dj_name.ilike.%${trimmedQuery}%,full_name.ilike.%${trimmedQuery}%,username.ilike.%${trimmedQuery}%,city.ilike.%${trimmedQuery}%`)
        .not("dj_name", "is", null)
        .limit(8);

      if (error) {
        console.error("Error fetching search suggestions:", error);
        setSearchSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      if (!data || data.length === 0) {
        setSearchSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      // Format suggestions
      const suggestions = data.map((user) => ({
        id: user.id,
        name: user.dj_name || user.full_name || user.username || "DJ",
        city: user.city || null,
        profileImage: user.profile_image_url || null,
      }));

      setSearchSuggestions(suggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error("Error in fetchSearchSuggestions:", error);
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  // Debounced search suggestions
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        fetchSearchSuggestions(trimmedQuery);
      }, 300);
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, fetchSearchSuggestions]);

  const filteredDiscoverUsers = useMemo(() => {
    if (!searchQuery.trim()) {
      return discoverUsers;
    }
    const query = searchQuery.toLowerCase().trim();
    return discoverUsers.filter(
      (user) => {
        // Search in all relevant fields
        const searchableFields = [
          user.name,
          user.dj_name,
          user.username,
          user.location,
          user.city,
          user.statusMessage,
        ].filter(Boolean);
        
        const matchesName = searchableFields.some((field) => 
          field.toLowerCase().includes(query)
        );
        
        const matchesGenre = user.genres?.some((genre) => 
          genre.toLowerCase().includes(query)
        );
        
        return matchesName || matchesGenre;
      }
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
    const participantName =
      connection.name ||
      connection.dj_name ||
      connection.full_name ||
      connection.connected_user_name ||
      connection.username ||
      "DJ";
    return String(participantName || "DJ");
  };

  const formatMessageTime = (timestamp) => {
    if (!timestamp) return "";

    try {
      const now = new Date();
      const messageTime = new Date(timestamp);
      
      // Check if date is valid
      if (isNaN(messageTime.getTime())) return "";

      const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60));

      if (diffInMinutes < 1) return "now";
      if (diffInMinutes < 60) return String(`${diffInMinutes}m`);

      const diffInHours = Math.floor(diffInMinutes / 60);
      if (diffInHours < 24) return String(`${diffInHours}h`);

      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays < 7) return String(`${diffInDays}d`);

      const formatted = messageTime.toLocaleDateString();
      return String(formatted || "");
    } catch (error) {
      console.error("Error formatting message time:", error);
      return "";
    }
  };

  const loadLastMessagesForConnections = async (userId) => {
    try {
      const lastMessagesData = await db.getLastMessagesForAllConnections(
        userId
      );
      setLastMessages(lastMessagesData);
    } catch (error) {
      console.error("❌ Error loading last messages:", error);
      setLastMessages({});
    }
  };

  const getLastMessageContent = (connection) => {
    const lastMessage = lastMessages[connection.id];
    if (!lastMessage) return "No messages yet";

    // Format the message content based on type - always return a string
    if (lastMessage.messageType === "image") {
      return "📷 Photo";
    } else if (lastMessage.messageType === "video") {
      return "🎥 Video";
    } else if (lastMessage.messageType === "audio") {
      return "🎵 Audio";
    } else if (lastMessage.messageType === "file") {
      return "📎 File";
    } else {
      return String(lastMessage.content || "No messages yet");
    }
  };

  const getLastMessageTime = (connection) => {
    const lastMessage = lastMessages[connection.id];
    if (!lastMessage || !lastMessage.timestamp) return "";

    const formatted = formatMessageTime(lastMessage.timestamp);
    return formatted || "";
  };

  const getLastMessageSender = (connection) => {
    const lastMessage = lastMessages[connection.id];
    if (!lastMessage) return "";

    // Show sender name if it's not the current user - always return a string
    if (lastMessage.senderId !== user?.id) {
      const senderName = String(lastMessage.senderName || "");
      return senderName ? `${senderName}: ` : "";
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

  // SectionList data for Connections tab (virtualized)
  const connectionSections = useMemo(
    () => [
      {
        key: "communities",
        data: userCommunities || [],
      },
      {
        key: "connections",
        data: connectionsWithMessages || [],
      },
    ],
    [userCommunities, connectionsWithMessages]
  );

  const getConnectionListItemLayout = useCallback((_, index) => ({
    length: LIST_PERFORMANCE.ESTIMATED_ROW_HEIGHT_MESSAGES,
    offset: LIST_PERFORMANCE.ESTIMATED_ROW_HEIGHT_MESSAGES * index,
    index,
  }), []);

  const getDiscoverItemLayout = useCallback((_, index) => ({
    length: LIST_PERFORMANCE.ESTIMATED_ROW_HEIGHT_DISCOVER,
    offset: LIST_PERFORMANCE.ESTIMATED_ROW_HEIGHT_DISCOVER * index,
    index,
  }), []);

  // Final safety check - ensure user is valid before rendering
  if (!user || typeof user !== 'object' || Array.isArray(user)) {
    console.warn('ConnectionsScreen: user state is invalid, returning null');
    return null;
  }

  const renderConnectionSectionItem = useCallback(
    ({ item, section, index }) => {
      if (section.key === "communities") {
        const community = item;
        const latestMessage = communityMessages[community.id];
        const unreadCount = communityUnreadCounts[community.id] || 0;
        const isRhood = community.id === "550e8400-e29b-41d4-a716-446655440000";
        return (
          <CommunityListItem
            community={community}
            latestMessage={latestMessage}
            unreadCount={unreadCount}
            isRhood={isRhood}
            onPress={handleGroupChatPress}
            formatMessageTime={formatMessageTime}
            styles={styles}
          />
        );
      }
      return (
        <ConnectionListItem
          connection={item}
          index={index}
          onPress={handleConnectionPress}
          onLongPress={
            item.isConnected
              ? () => handleOpenConnectionOptions(item)
              : undefined
          }
          getUserName={getUserName}
          getLastMessageSender={getLastMessageSender}
          getLastMessageContent={getLastMessageContent}
          getLastMessageTime={getLastMessageTime}
          styles={styles}
        />
      );
    },
    [
      communityMessages,
      communityUnreadCounts,
      handleGroupChatPress,
      handleConnectionPress,
      handleOpenConnectionOptions,
      getUserName,
      getLastMessageSender,
      getLastMessageContent,
      getLastMessageTime,
    ]
  );

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor="hsl(0, 0%, 100%)"
      colors={["hsl(0, 0%, 100%)"]}
    />
  );

  return (
    <View style={styles.container}>
      {/* Fixed header */}
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
                // Reload only via effect when missing/stale; full reload on pull-to-refresh
                Animated.timing(connectionsFadeAnim, {
                  toValue: 1,
                  duration: 300,
                  useNativeDriver: true,
                }).start();
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
          <View style={styles.searchWrapper} pointerEvents="box-none">
            <View style={styles.searchContainer} pointerEvents="auto">
              <Ionicons name="search" size={20} color="hsl(0, 0%, 50%)" />
              <TextInput
                style={styles.searchInput}
                placeholder={activeTab === "discover" ? "Search DJs..." : "Search connections..."}
                placeholderTextColor="hsl(0, 0%, 50%)"
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                }}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery("");
                    setSearchSuggestions([]);
                    setShowSuggestions(false);
                  }}
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

            {/* Search Suggestions Dropdown */}
            {showSuggestions && searchSuggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <ScrollView 
                  style={styles.suggestionsScroll}
                  contentContainerStyle={styles.suggestionsScrollContent}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled={true}
                >
                  {searchSuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={suggestion.id}
                      style={[
                        styles.suggestionItem,
                        index === 0 && styles.suggestionItemFirst
                      ]}
                      onPress={() => {
                        setSearchQuery(suggestion.name);
                        setShowSuggestions(false);
                        if (onNavigate) {
                          onNavigate("user-profile", { userId: suggestion.id, djName: suggestion.name });
                        }
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                    >
                      {suggestion.profileImage ? (
                        <ProgressiveImage
                          source={{ uri: suggestion.profileImage }}
                          style={styles.suggestionImage}
                        />
                      ) : (
                        <View style={[styles.suggestionImage, styles.suggestionImagePlaceholder]}>
                          <Ionicons name="person" size={16} color="hsl(0, 0%, 50%)" />
                        </View>
                      )}
                      <View style={styles.suggestionInfo}>
                        <Text style={styles.suggestionName} numberOfLines={1}>
                          {String(suggestion.name || "")}
                        </Text>
                        {suggestion.city && String(suggestion.city).trim() ? (
                          <Text style={styles.suggestionCity} numberOfLines={1}>
                            {String(suggestion.city || "")}
                          </Text>
                        ) : (
                          <Text style={styles.suggestionCity} numberOfLines={1}>
                            {String("DJ")}
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="hsl(0, 0%, 40%)" />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        {/* Content: virtualized list per tab */}
        {activeTab === "connections" ? (
          <Animated.View style={[styles.flex1, { opacity: connectionsFadeAnim }]}>
            {loading && !hasLoadedConnections ? (
              <ScrollView
                style={styles.flex1}
                contentContainerStyle={[styles.messagesList, styles.listContent]}
                refreshControl={refreshControl}
              >
                {[1, 2, 3, 4, 5].map((i) => (
                  <View key={i} style={styles.skeletonRow}>
                    <View style={styles.skeletonAvatar} />
                    <View style={styles.skeletonLines}>
                      <View style={styles.skeletonLine} />
                      <View style={styles.skeletonLineShort} />
                    </View>
                  </View>
                ))}
              </ScrollView>
            ) : connectionsLoadError && connections.length === 0 ? (
              <ScrollView
                style={styles.flex1}
                contentContainerStyle={[styles.messagesList, styles.listContent, styles.loadingContainer]}
                refreshControl={refreshControl}
              >
                <Ionicons name="cloud-offline" size={40} color="hsl(0, 0%, 50%)" />
                <Text style={styles.noResultsTitle}>Something went wrong</Text>
                <Text style={styles.noResultsSubtitle}>{connectionsLoadError}</Text>
                <TouchableOpacity
                  style={styles.ctaButton}
                  onPress={() => {
                    setConnectionsLoadError(null);
                    loadUserAndConnections({ showLoader: true });
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.ctaButtonText}>Try again</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <SectionList
                sections={connectionSections}
                keyExtractor={(item) => item.id}
                renderItem={renderConnectionSectionItem}
                renderSectionHeader={() => null}
                stickySectionHeadersEnabled={false}
                initialNumToRender={LIST_PERFORMANCE.INITIAL_NUM_TO_RENDER}
                maxToRenderPerBatch={LIST_PERFORMANCE.MAX_TO_RENDER_PER_BATCH}
                windowSize={LIST_PERFORMANCE.WINDOW_SIZE}
                removeClippedSubviews={LIST_PERFORMANCE.REMOVE_CLIPPED_SUBVIEWS}
                getItemLayout={getConnectionListItemLayout}
                ListFooterComponent={
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
                }
                refreshControl={refreshControl}
                contentContainerStyle={[styles.messagesList, styles.listContent]}
                style={styles.flex1}
              />
            )}
          </Animated.View>
        ) : (
          <Animated.View style={[styles.flex1, { opacity: discoverFadeAnim }]}>
            <FlatList
              data={filteredDiscoverUsers}
              keyExtractor={(item) => item.id}
              initialNumToRender={LIST_PERFORMANCE.INITIAL_NUM_TO_RENDER}
              maxToRenderPerBatch={LIST_PERFORMANCE.MAX_TO_RENDER_PER_BATCH}
              windowSize={LIST_PERFORMANCE.WINDOW_SIZE}
              removeClippedSubviews={LIST_PERFORMANCE.REMOVE_CLIPPED_SUBVIEWS}
              getItemLayout={getDiscoverItemLayout}
              renderItem={({ item: u, index }) => {
                const normalizedStatus = normalizeConnectionStatus(u.connectionStatus);
                const isPending = normalizedStatus === "pending";
                const pendingKey = u.connectionId || u.id;
                const isCancelling = isPending && pendingKey === cancellingConnectionId;
                return (
                  <DiscoverUserCard
                    user={u}
                    index={index}
                    onViewProfile={handleViewProfile}
                    onConnectionPress={handleConnectionPress}
                    onConnect={handleConnect}
                    onCancelPending={handleCancelPendingConnection}
                    onLongPress={handleOpenConnectionOptions}
                    isPending={isPending}
                    isCancelling={isCancelling}
                    discoverLoading={discoverLoading}
                    styles={styles}
                  />
                );
              }}
              ListEmptyComponent={
                discoverLoadError
                  ? (
                    <View style={[styles.discoverList, styles.loadingContainer]}>
                      <Ionicons name="cloud-offline" size={40} color="hsl(0, 0%, 50%)" />
                      <Text style={styles.noResultsTitle}>Something went wrong</Text>
                      <Text style={styles.noResultsSubtitle}>{discoverLoadError}</Text>
                      <TouchableOpacity
                        style={styles.ctaButton}
                        onPress={() => {
                          setDiscoverLoadError(null);
                          loadDiscoverDJs();
                        }}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.ctaButtonText}>Try again</Text>
                      </TouchableOpacity>
                    </View>
                  )
                  : discoverLoading
                    ? (
                      <View style={styles.discoverList}>
                        {[1, 2, 3, 4].map((i) => (
                          <View key={i} style={styles.skeletonCard}>
                            <View style={styles.skeletonCardAvatar} />
                            <View style={styles.skeletonCardLines}>
                              <View style={styles.skeletonCardLine} />
                              <View style={styles.skeletonCardLineSmall} />
                              <View style={styles.skeletonCardLineSmall} />
                            </View>
                          </View>
                        ))}
                      </View>
                    )
                    : null
              }
              ListHeaderComponent={() => (
                <View style={styles.discoverList}>
                {/* Popular DJs - Trending DJs */}
                {popularDJs.length > 0 && !searchQuery.trim() && (
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
                                {String(dj.dj_name || "DJ")}
                              </Text>
                              {dj.city && String(dj.city).trim() && (
                                <Text
                                  style={styles.recommendationArtist}
                                  numberOfLines={1}
                                >
                                  {String(dj.city || "")}
                                </Text>
                              )}
                              {Array.isArray(dj.genres) && dj.genres.length > 0 && (
                                <Text
                                  style={styles.recommendationGenre}
                                  numberOfLines={1}
                                >
                                  {String(dj.genres.slice(0, 2).join(", ") || "")}
                                </Text>
                              )}
                            </View>
                            </View>
                          </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <View style={styles.recommendationsDivider} />
                  </View>
                )}

                {/* DJs Near You - Based on City */}
                {nearbyDJs.length > 0 && !searchQuery.trim() && (
                  <View style={styles.recommendationsSection}>
                    <View style={styles.recommendationsHeader}>
                      <Ionicons
                        name="location"
                        size={18}
                        color="hsl(75, 100%, 60%)"
                      />
                      <Text style={styles.recommendationsTitle}>
                        DJs Near You
                      </Text>
                      <TouchableOpacity
                        style={styles.locationUpdateButton}
                        onPress={() => {
                          setNewLocationCity(user?.city || "");
                          setShowLocationModal(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="location-outline"
                          size={16}
                          color="hsl(75, 100%, 60%)"
                        />
                      </TouchableOpacity>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.recommendationsScroll}
                      contentContainerStyle={styles.recommendationsContent}
                    >
                      {nearbyDJs.map((dj) => (
                        <TouchableOpacity
                          key={dj.id}
                          style={styles.recommendationCard}
                            onPress={() => {
                              HapticPatterns.itemPress();
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
                                {String(dj.dj_name || "DJ")}
                              </Text>
                              {dj.city && String(dj.city).trim() && (
                                <Text
                                  style={styles.recommendationArtist}
                                  numberOfLines={1}
                                >
                                  {String(dj.city || "")}
                                </Text>
                              )}
                              {Array.isArray(dj.genres) && dj.genres.length > 0 && (
                                <Text
                                  style={styles.recommendationGenre}
                                  numberOfLines={1}
                                >
                                  {String(dj.genres.slice(0, 2).join(", ") || "")}
                                </Text>
                              )}
                            </View>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <View style={styles.recommendationsDivider} />
                  </View>
                )}

                {/* Opportunities Near You */}
                {nearbyOpportunities.length > 0 && !searchQuery.trim() && (
                  <View style={styles.recommendationsSection}>
                    <View style={styles.recommendationsHeader}>
                      <Ionicons
                        name="briefcase"
                        size={18}
                        color="hsl(75, 100%, 60%)"
                      />
                      <Text style={styles.recommendationsTitle}>
                        Opportunities Near You
                      </Text>
                      <TouchableOpacity
                        style={styles.locationUpdateButton}
                        onPress={() => {
                          setNewLocationCity(user?.city || "");
                          setShowLocationModal(true);
                        }}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="location-outline"
                          size={16}
                          color="hsl(75, 100%, 60%)"
                        />
                      </TouchableOpacity>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.recommendationsScroll}
                      contentContainerStyle={styles.recommendationsContent}
                    >
                      {nearbyOpportunities.map((opp) => (
                        <TouchableOpacity
                          key={opp.id}
                          style={styles.opportunityCard}
                            onPress={() => {
                              HapticPatterns.itemPress();
                              if (onNavigate) {
                                onNavigate("opportunities");
                              }
                            }}
                            activeOpacity={0.8}
                          >
                            <View style={styles.opportunityImageContainer}>
                              <Image
                                source={{ uri: opp.image }}
                                style={styles.opportunityImage}
                                resizeMode="cover"
                              />
                              <LinearGradient
                                colors={[
                                  "transparent",
                                  "rgba(0, 0, 0, 0.3)",
                                  "rgba(0, 0, 0, 0.8)",
                                  "rgba(0, 0, 0, 0.95)",
                                ]}
                                style={styles.opportunityGradient}
                              />
                              <View style={styles.opportunityInfo}>
                                <Text
                                  style={styles.opportunityTitle}
                                  numberOfLines={2}
                                >
                                  {String(opp.title)}
                                </Text>
                                <Text
                                  style={styles.opportunityVenue}
                                  numberOfLines={1}
                                >
                                  {String(opp.venue)}
                                </Text>
                                <View style={styles.opportunityMeta}>
                                  <Text
                                    style={styles.opportunityMetaText}
                                    numberOfLines={1}
                                  >
                                    {String(opp.date)} • {String(opp.city)}
                                  </Text>
                                </View>
                                {opp.compensation && (
                                  <Text
                                    style={styles.opportunityCompensation}
                                    numberOfLines={1}
                                  >
                                    {String(opp.compensation)}
                                  </Text>
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>
                      ))}
                    </ScrollView>
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
                                {String(getUserName(request) || "")}
                              </Text>
                              {request.statusMessage && String(request.statusMessage).trim() ? (
                                <Text
                                  style={styles.pendingRequestStatus}
                                  numberOfLines={1}
                                >
                                  {String(request.statusMessage || "")}
                                </Text>
                              ) : null}
                              {request.username && String(request.username).trim() ? (
                                <Text
                                  style={styles.pendingRequestSubtitle}
                                  numberOfLines={1}
                                >
                                  {String(request.username || "")}
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
                </View>
              )}
              refreshControl={refreshControl}
              contentContainerStyle={[styles.discoverList, styles.listContent]}
              style={styles.flex1}
            />
          </Animated.View>
        )}

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

      {/* Location Update Modal */}
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowLocationModal(false);
          setNewLocationCity("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Location</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowLocationModal(false);
                  setNewLocationCity("");
                }}
              >
                <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
              </TouchableOpacity>
            </View>

            <View style={styles.locationModalBody}>
              <Text style={styles.locationModalDescription}>
                Update your location to see opportunities and DJs near you
              </Text>

              <View style={styles.locationInputContainer}>
                <TextInput
                  style={styles.locationInput}
                  placeholder="Enter city name (e.g., London, New York)"
                  placeholderTextColor="hsl(0, 0%, 50%)"
                  value={newLocationCity}
                  onChangeText={setNewLocationCity}
                  autoCapitalize="words"
                  maxLength={100}
                />
                <TouchableOpacity
                  style={styles.useCurrentLocationButton}
                  onPress={handleUseCurrentLocation}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="locate"
                    size={20}
                    color="hsl(75, 100%, 60%)"
                  />
                  <Text style={styles.useCurrentLocationText}>
                    Use Current
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.locationModalActions}>
                <TouchableOpacity
                  style={styles.locationModalCancelButton}
                  onPress={() => {
                    setShowLocationModal(false);
                    setNewLocationCity("");
                  }}
                >
                  <Text style={styles.locationModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.locationModalSaveButton,
                    (!newLocationCity.trim() || updatingLocation) &&
                      styles.locationModalSaveButtonDisabled,
                  ]}
                  onPress={handleUpdateLocation}
                  disabled={!newLocationCity.trim() || updatingLocation}
                >
                  {updatingLocation ? (
                    <ActivityIndicator
                      size="small"
                      color="hsl(0, 0%, 0%)"
                    />
                  ) : (
                    <Text style={styles.locationModalSaveText}>Update</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Export with validation wrapper to catch prop issues
const ConnectionsScreenWrapper = (props) => {
  // Validate props before rendering
  if (!props || typeof props !== 'object') {
    console.warn('ConnectionsScreen: Invalid props object');
    return null;
  }
  
  // Ensure user prop is valid - check for string first (common mistake)
  if (typeof props.user === 'string') {
    console.warn('ConnectionsScreen: user prop is a string, expected object');
    return null;
  }
  
  if (!props.user || typeof props.user !== 'object' || props.user === null || Array.isArray(props.user)) {
    console.warn('ConnectionsScreen: user prop is missing or invalid');
    return null;
  }
  
  return <ConnectionsScreenComponent {...props} />;
};

export default ConnectionsScreenWrapper;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  flex1: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 80,
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
  searchWrapper: {
    position: "relative",
    zIndex: 10000,
    elevation: 10000,
    overflow: "visible",
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
  suggestionsContainer: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    marginTop: 16, // Increased spacing to prevent overlap with search bar
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    maxHeight: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10001, // Higher than searchWrapper
    zIndex: 10001, // Higher than searchWrapper
    pointerEvents: "auto", // Ensure touches work
  },
  suggestionsScroll: {
    maxHeight: 300,
  },
  suggestionsScrollContent: {
    paddingTop: 4, // Minimal padding at top
    paddingBottom: 4,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
    gap: 12,
    minHeight: 64, // Ensure minimum touch target size
  },
  suggestionItemFirst: {
    paddingTop: 20, // Extra padding for first item to push it down
  },
  suggestionImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "hsl(0, 0%, 12%)",
  },
  suggestionImagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  suggestionInfo: {
    flex: 1,
    gap: 4,
  },
  suggestionName: {
    fontSize: 15,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
  suggestionCity: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  skeletonAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "hsl(0, 0%, 18%)",
    marginRight: 12,
  },
  skeletonLines: {
    flex: 1,
    gap: 8,
  },
  skeletonLine: {
    height: 14,
    borderRadius: 7,
    backgroundColor: "hsl(0, 0%, 18%)",
    width: "75%",
  },
  skeletonLineShort: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "hsl(0, 0%, 15%)",
    width: "45%",
  },
  skeletonCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    marginBottom: 16,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  skeletonCardAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "hsl(0, 0%, 18%)",
    marginRight: 12,
  },
  skeletonCardLines: {
    flex: 1,
    gap: 6,
  },
  skeletonCardLine: {
    height: 16,
    borderRadius: 8,
    backgroundColor: "hsl(0, 0%, 18%)",
    width: "80%",
  },
  skeletonCardLineSmall: {
    height: 12,
    borderRadius: 6,
    backgroundColor: "hsl(0, 0%, 15%)",
    width: "55%",
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
  locationUpdateButton: {
    marginLeft: "auto",
    padding: 4,
  },
  opportunityCard: {
    width: 200,
    height: 240,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%, 0.15)",
    backgroundColor: "hsl(0, 0%, 8%)",
  },
  opportunityImageContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  opportunityImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "hsl(0, 0%, 12%)",
  },
  opportunityGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
  },
  opportunityInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 14,
    gap: 6,
  },
  opportunityTitle: {
    fontSize: 15,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "600",
  },
  opportunityVenue: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
    fontWeight: "500",
  },
  opportunityMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  opportunityMetaText: {
    fontSize: 11,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
  },
  opportunityCompensation: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
    fontWeight: "600",
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
  },
  locationModalBody: {
    padding: 20,
    gap: 20,
  },
  locationModalDescription: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    lineHeight: 20,
  },
  locationInputContainer: {
    gap: 12,
  },
  locationInput: {
    backgroundColor: "hsl(0, 0%, 12%)",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
  },
  useCurrentLocationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "hsl(0, 0%, 12%)",
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%, 0.3)",
  },
  useCurrentLocationText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
    fontWeight: "600",
  },
  locationModalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  locationModalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "hsl(0, 0%, 12%)",
    alignItems: "center",
  },
  locationModalCancelText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "600",
  },
  locationModalSaveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "hsl(75, 100%, 60%)",
    alignItems: "center",
  },
  locationModalSaveButtonDisabled: {
    opacity: 0.5,
  },
  locationModalSaveText: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 0%)",
  },
});
