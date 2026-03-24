/**
 * Discover tab loaders (popular, nearby, opportunities, discover DJs).
 * Each receives a ctx object (from useDiscoverData’s discoverCtxRef) with setters, `discoverFadeAnim`, and `user`.
 */
import { Animated } from "react-native";
import { supabase, db } from "./supabase";
import { connectionsService } from "./connectionsService";
import { normalizeConnectionStatus, isAcceptedConnectionStatus } from "./connectionStatusUtils";

export async function loadPopularDJsImpl(ctx) {
  const { setPopularDJs, setPopularDJsLoading } = ctx;
  try {
    setPopularDJsLoading(true);
    const { data: popularUsers, error } = await supabase
      .from("user_profiles")
      .select("id, dj_name, profile_image_url, city, genres, credits, gigs_completed, created_at")
      .not("dj_name", "is", null)
      .order("credits", { ascending: false })
      .order("gigs_completed", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(15);
    if (error) {
      const { data: recentUsers } = await supabase
        .from("user_profiles")
        .select("id, dj_name, profile_image_url, city, genres")
        .not("dj_name", "is", null)
        .order("created_at", { ascending: false })
        .limit(15);
      setPopularDJs((recentUsers || []).slice(0, 10));
      return;
    }
    setPopularDJs((popularUsers || []).slice(0, 10));
  } catch (error) {
    console.error("Error loading popular DJs:", error);
    setPopularDJs([]);
  } finally {
    setPopularDJsLoading(false);
  }
}

export async function loadNearbyOpportunitiesImpl(ctx) {
  const { setNearbyOpportunities, setNearbyOpportunitiesLoading, user: ctxUser } = ctx;
  try {
    if (!ctxUser?.id) {
      setNearbyOpportunities([]);
      setNearbyOpportunitiesLoading(false);
      return;
    }
    setNearbyOpportunitiesLoading(true);
    const currentUser = ctxUser;
    const userProfile = await db.getUserProfile(currentUser.id);
    if (!userProfile?.city) {
      setNearbyOpportunities([]);
      return;
    }
    const { data: opportunitiesData, error } = await supabase
      .from("opportunities")
      .select("*")
      .eq("is_active", true)
      .ilike("city", userProfile.city)
      .gte("event_date", new Date().toISOString().split("T")[0])
      .order("event_date", { ascending: true })
      .limit(10);
    if (error) {
      setNearbyOpportunities([]);
      return;
    }
    const transformed = (opportunitiesData || []).map((opp) => ({
      id: opp.id,
      title: opp.title,
      venue: opp.venue || "Venue TBD",
      city: opp.city || userProfile.city,
      date: opp.event_date
        ? new Date(opp.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "TBD",
      genre: opp.genre || "Electronic",
      compensation: opp.payment ? `${opp.payment_currency || "GBP"} ${opp.payment}` : "TBD",
      image: opp.image_url || "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
    }));
    setNearbyOpportunities(transformed);
  } catch (error) {
    console.error("Error loading nearby opportunities:", error);
    setNearbyOpportunities([]);
  } finally {
    setNearbyOpportunitiesLoading(false);
  }
}

export async function loadNearbyDJsImpl(ctx) {
  const { setNearbyDJs, setNearbyDJsLoading, user: ctxUser } = ctx;
  try {
    if (!ctxUser?.id) {
      setNearbyDJs([]);
      setNearbyDJsLoading(false);
      return;
    }
    setNearbyDJsLoading(true);
    const currentUser = ctxUser;
    const userProfile = await db.getUserProfile(currentUser.id);
    if (!userProfile?.city) {
      setNearbyDJs([]);
      return;
    }
    const existingConnections = await db.getUserConnections(currentUser.id, null);
    const connectedUserIds = new Set(existingConnections.map((c) => c.connected_user_id));
    const { data: nearbyUsers, error } = await supabase
      .from("user_profiles")
      .select("id, dj_name, profile_image_url, city, genres, credits, gigs_completed, created_at, full_name, username, is_verified")
      .not("dj_name", "is", null)
      .neq("id", currentUser.id)
      .ilike("city", userProfile.city)
      .order("credits", { ascending: false })
      .order("gigs_completed", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(15);
    if (error) {
      setNearbyDJs([]);
      return;
    }
    const filtered = (nearbyUsers || [])
      .filter((u) => !connectedUserIds.has(u.id))
      .slice(0, 10);
    setNearbyDJs(filtered);
  } catch (error) {
    console.error("Error loading nearby DJs:", error);
    setNearbyDJs([]);
  } finally {
    setNearbyDJsLoading(false);
  }
}

export async function loadDiscoverDJsImpl(ctx) {
  const {
    user: ctxUser,
    setDiscoverUsers,
    setDiscoverLoading,
    setDiscoverLoadError,
    discoverFadeAnim,
  } = ctx;
  try {
    setDiscoverLoadError(null);
    setDiscoverLoading(true);
    if (!ctxUser?.id) {
      setDiscoverUsers([]);
      return;
    }
    const currentUser = ctxUser;
    const recommendedUsers = await connectionsService.getRecommendedUsers(
      20,
      currentUser.id
    );
    const existingConnections = await db.getUserConnections(currentUser.id, null);
    const connectionStatusMap = new Map();
    existingConnections.forEach((conn) => {
      const rawStatus = conn.connection_status || conn.status || conn.connectionStatus || conn.state || null;
      connectionStatusMap.set(conn.connected_user_id, {
        status: normalizeConnectionStatus(rawStatus),
        statusRaw: rawStatus,
        connection_id: conn.connection_id || conn.id || conn.connectionId || conn.connection_uuid || null,
        thread_id: conn.thread_id || null,
      });
    });
    const formattedDiscoverUsers = recommendedUsers.map((user) => {
      const connectionInfo = connectionStatusMap.get(user.id);
      const normalizedStatus = connectionInfo?.status ? normalizeConnectionStatus(connectionInfo.status) : null;
      const isConnected = isAcceptedConnectionStatus(normalizedStatus);
      let profileImage = user.profile_image_url || null;
      if (profileImage && typeof profileImage === "string") {
        profileImage = profileImage.trim();
        if (profileImage === "" || profileImage === "null" || profileImage === "undefined") profileImage = null;
      } else profileImage = null;
      const getDisplayName = () => {
        if (user.dj_name) return user.dj_name;
        if (user.full_name) return user.full_name;
        if (user.username) return user.username.charAt(0).toUpperCase() + user.username.slice(1);
        return "DJ";
      };
      return {
        id: user.id,
        name: getDisplayName(),
        username: user.username ? `@${user.username}` : `@${(user.dj_name || user.full_name || "dj").toLowerCase().replace(/\s+/g, "")}`,
        location: user.city || user.location || "Location not set",
        genres: user.genres || [],
        profileImage,
        gigsCompleted: user.gigs_completed || 0,
        lastActive: "Recently",
        status: "online",
        isVerified: user.is_verified || false,
        bio: user.bio || "DJ and music producer",
        statusMessage: user.status_message || "",
        isConnected,
        connectionStatus: normalizedStatus,
        connectionStatusRaw: connectionInfo?.statusRaw || connectionInfo?.status || null,
        connectionId: connectionInfo?.connection_id || connectionInfo?.connectionId || connectionInfo?.connection_uuid || null,
        threadId: connectionInfo?.thread_id || null,
      };
    });
    setDiscoverUsers(formattedDiscoverUsers);
  } catch (error) {
    console.error("❌ Error loading discover DJs:", error);
    setDiscoverUsers([]);
    setDiscoverLoadError(error?.message || "Couldn't load discover");
  } finally {
    setDiscoverLoading(false);
    Animated.timing(discoverFadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }
}
