/**
 * Discover tab loaders (popular, nearby, opportunities, discover DJs).
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
import { optimizeOpportunityImageUrl } from "./opportunities/opportunityImageUrl";

const DISCOVER_DJ_SLICE = 10;
/** Fetch extra rows so brand / incomplete profiles (filtered client-side) do not empty the carousel. */
const DISCOVER_DJ_FETCH_MULTIPLIER = 5;
const DJ_PROFILE_SELECT =
  "id, email, dj_name, profile_image_url, city, location, genres, credits, gigs_completed, created_at, full_name, username, is_verified";

export async function loadPopularDJsImpl(ctx) {
  const { setPopularDJs, setPopularDJsLoading } = ctx;
  try {
    setPopularDJsLoading(true);
    const fetchLimit = DISCOVER_DJ_SLICE * DISCOVER_DJ_FETCH_MULTIPLIER;
    const [{ data: popularUsers, error }, blockedIds] = await Promise.all([
      supabase
        .from("user_profiles")
        .select(DJ_PROFILE_SELECT)
        .not("dj_name", "is", null)
        .order("credits", { ascending: false })
        .order("gigs_completed", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(fetchLimit),
      listBlockedUserIds(),
    ]);
    if (error) {
      const { data: recentUsers } = await supabase
        .from("user_profiles")
        .select(DJ_PROFILE_SELECT)
        .not("dj_name", "is", null)
        .order("created_at", { ascending: false })
        .limit(fetchLimit);
      setPopularDJs(
        excludeUserIds(filterDirectoryDjs(recentUsers), blockedIds).slice(
          0,
          DISCOVER_DJ_SLICE
        )
      );
      return;
    }
    setPopularDJs(
      excludeUserIds(filterDirectoryDjs(popularUsers), blockedIds).slice(
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
    const cityNeedle = sanitizeIlikeFragment(
      canonicalCityName(userProfile?.city || userProfile?.location || "")
    );
    if (!cityNeedle) {
      setNearbyOpportunities([]);
      return;
    }
    const aliases = citySearchAliases(
      userProfile?.city || userProfile?.location || cityNeedle
    );
    const orFilter = aliases
      .slice(0, 12)
      .map((alias) => `city.ilike.%${alias}%`)
      .join(",");
    const { data: opportunitiesData, error } = await supabase
      .from("opportunities")
      .select(
        "id, title, venue, city, event_date, genre, payment, payment_currency, image_url"
      )
      .eq("is_active", true)
      .or(orFilter || `city.ilike.%${cityNeedle}%`)
      .gte("event_date", new Date().toISOString().split("T")[0])
      .order("event_date", { ascending: true })
      .limit(20);
    if (error) {
      setNearbyOpportunities([]);
      return;
    }
    const cityMatched = (opportunitiesData || []).filter((opp) =>
      citiesShareSameCity(
        userProfile?.city || userProfile?.location || cityNeedle,
        opp.city
      )
    );
    const transformed = cityMatched.slice(0, 10).map((opp) => ({
      id: opp.id,
      title: opp.title,
      venue: opp.venue || "Venue TBD",
      city: opp.city || userProfile.city,
      date: opp.event_date
        ? new Date(opp.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
        : "TBD",
      genre: opp.genre || "Electronic",
      compensation: opp.payment ? `${opp.payment_currency || "GBP"} ${opp.payment}` : "TBD",
      image: (() => {
        const trimmed =
          typeof opp.image_url === "string" ? opp.image_url.trim() : "";
        const base =
          trimmed ||
          "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop";
        return optimizeOpportunityImageUrl(base) ?? base;
      })(),
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
      supabase
        .from("user_profiles")
        .select(DJ_PROFILE_SELECT)
        .not("dj_name", "is", null)
        .neq("id", currentUser.id)
        .or(orFilter || `city.ilike.%${cityNeedle}%,location.ilike.%${cityNeedle}%`)
        .order("credits", { ascending: false })
        .order("gigs_completed", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(fetchLimit),
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
