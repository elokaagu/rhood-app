/**
 * Discover tab loaders (popular, nearby DJs, discover list).
 * Each receives a ctx object (from useDiscoverData’s discoverCtxRef) with setters, `discoverFadeAnim`, and `user`.
 */
import { Animated } from "react-native";
import { supabase, db } from "./supabase";
import { connectionsService } from "./connectionsService";
import { normalizeConnectionStatus, isAcceptedConnectionStatus } from "./connectionStatusUtils";
import { filterDirectoryDjs, excludeUserIds } from "./accountUtils";
import { listBlockedUserIds } from "./moderation";
import {
  canonicalCityName,
  citiesShareSameCity,
  citySearchAliases,
  sanitizeIlikeFragment,
} from "./cityMatch";
import { isMissingColumnError } from "./membership";

const DISCOVER_DJ_SLICE = 10;
/** Fetch extra rows so brand / incomplete profiles (filtered client-side) do not empty the carousel. */
const DISCOVER_DJ_FETCH_MULTIPLIER = 5;
const DJ_PROFILE_SELECT_BASE =
  "id, email, dj_name, profile_image_url, city, location, genres, credits, gigs_completed, created_at, full_name, username, is_verified";
const DJ_PROFILE_SELECT = `${DJ_PROFILE_SELECT_BASE}, membership_status`;

async function selectDirectoryDjs(buildQuery) {
  let result = await buildQuery(DJ_PROFILE_SELECT);
  if (result.error && isMissingColumnError(result.error)) {
    result = await buildQuery(DJ_PROFILE_SELECT_BASE);
  }
  return result;
}

export async function loadPopularDJsImpl(ctx) {
  const { setPopularDJs, setPopularDJsLoading, user: ctxUser } = ctx;
  try {
    setPopularDJsLoading(true);
    const currentUserId = ctxUser?.id;
    const fetchLimit = DISCOVER_DJ_SLICE * DISCOVER_DJ_FETCH_MULTIPLIER;
    const [{ data: popularUsers, error }, blockedIds] = await Promise.all([
      selectDirectoryDjs((columns) => {
        let query = supabase
          .from("user_profiles")
          .select(columns)
          .not("dj_name", "is", null)
          .order("credits", { ascending: false })
          .order("gigs_completed", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(fetchLimit);
        if (currentUserId) query = query.neq("id", currentUserId);
        return query;
      }),
      listBlockedUserIds(),
    ]);
    const excludeIds = currentUserId
      ? [...(blockedIds || []), currentUserId]
      : blockedIds;
    if (error) {
      const { data: recentUsers } = await selectDirectoryDjs((columns) => {
        let query = supabase
          .from("user_profiles")
          .select(columns)
          .not("dj_name", "is", null)
          .order("created_at", { ascending: false })
          .limit(fetchLimit);
        if (currentUserId) query = query.neq("id", currentUserId);
        return query;
      });
      setPopularDJs(
        excludeUserIds(filterDirectoryDjs(recentUsers), excludeIds).slice(
          0,
          DISCOVER_DJ_SLICE
        )
      );
      return;
    }
    setPopularDJs(
      excludeUserIds(filterDirectoryDjs(popularUsers), excludeIds).slice(
        0,
        DISCOVER_DJ_SLICE
      )
    );
  } catch (error) {
    console.error("Error loading popular DJs:", error);
    setPopularDJs([]);
  } finally {
    setPopularDJsLoading(false);
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
    const profileCity = userProfile?.city || userProfile?.location || "";
    const cityNeedle = sanitizeIlikeFragment(canonicalCityName(profileCity));
    if (!cityNeedle) {
      setNearbyDJs([]);
      return;
    }
    const aliases = citySearchAliases(profileCity);
    const orFilter = aliases
      .slice(0, 16)
      .flatMap((alias) => [`city.ilike.%${alias}%`, `location.ilike.%${alias}%`])
      .join(",");
    const fetchLimit = DISCOVER_DJ_SLICE * DISCOVER_DJ_FETCH_MULTIPLIER * 2;
    const [{ data: nearbyUsers, error }, blockedIds] = await Promise.all([
      selectDirectoryDjs((columns) =>
        supabase
          .from("user_profiles")
          .select(columns)
          .not("dj_name", "is", null)
          .neq("id", currentUser.id)
          .or(orFilter || `city.ilike.%${cityNeedle}%,location.ilike.%${cityNeedle}%`)
          .order("credits", { ascending: false })
          .order("gigs_completed", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(fetchLimit)
      ),
      listBlockedUserIds(),
    ]);
    if (error) {
      setNearbyDJs([]);
      return;
    }
    const filtered = excludeUserIds(filterDirectoryDjs(nearbyUsers), blockedIds)
      .filter((u) => citiesShareSameCity(profileCity, u.city || u.location))
      .slice(0, DISCOVER_DJ_SLICE);
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
      40,
      currentUser.id
    );
    const [existingConnections, blockedIds] = await Promise.all([
      db.getUserConnections(currentUser.id, null),
      listBlockedUserIds(),
    ]);
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
    const formattedDiscoverUsers = excludeUserIds(
      filterDirectoryDjs(recommendedUsers),
      blockedIds
    ).map((user) => {
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
