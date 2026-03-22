import React, { useState, useMemo, useEffect } from "react";
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
import AnimatedListItem from "./AnimatedListItem";
import CommunityDiscoveryCard from "./CommunityDiscoveryCard";
import { connectionsService } from "../lib/connectionsService";
import { createScreenCache } from "../lib/screenCache";

const COMMUNITY_CACHE_KEY = "list";
const communityCache = createScreenCache("community");

// All community data comes from database

export default function CommunityScreen({ onNavigate }) {
  const [communities, setCommunities] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const loadCommunities = async ({ isRefresh = false } = {}) => {
    try {
      setLoadError(null);
      if (!isRefresh) {
        setLoading(true);
      }
      const communitiesData = await connectionsService.getAllCommunities();
      setCommunities(communitiesData);
      communityCache.set(COMMUNITY_CACHE_KEY, { communities: communitiesData });
    } catch (error) {
      if (__DEV__) {
        console.error("Error loading communities:", error);
      }
      setLoadError(
        error?.message || "Couldn't load communities. Pull to try again."
      );
      if (!isRefresh) {
        setCommunities([]);
      }
    } finally {
      if (!isRefresh) {
        setLoading(false);
      }
      setRefreshing(false);
    }
  };

  // Load communities on component mount (use cache if fresh)
  useEffect(() => {
    const cached = communityCache.getIfFresh(COMMUNITY_CACHE_KEY);
    if (cached && Array.isArray(cached.communities)) {
      setCommunities(cached.communities);
      setLoading(false);
      setLoadError(null);
      return;
    }
    loadCommunities();
  }, []);

  const handleCommunityPress = (community) => {
    onNavigate &&
      onNavigate("messages", {
        communityId: community.id,
        communityName: community.name || "Community",
        chatType: "group",
      });
  };

  const handleJoinCommunity = async (communityId) => {
    try {
      const community = communities.find((c) => c.id === communityId);
      if (!community) return;

      if (community.isJoined) {
        await connectionsService.leaveCommunity(communityId);
      } else {
        await connectionsService.joinCommunity(communityId);
      }

      setCommunities((prev) =>
        prev.map((c) =>
          c.id === communityId ? { ...c, isJoined: !c.isJoined } : c
        )
      );
    } catch (error) {
      if (__DEV__) {
        console.error("Error joining/leaving community:", error);
      }
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCommunities({ isRefresh: true });
  };

  const handleRetryLoad = () => {
    setLoadError(null);
    loadCommunities();
  };

  const filteredCommunities = useMemo(() => {
    let filtered = communities;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (community) =>
          (community.name || "").toLowerCase().includes(query) ||
          (community.description || "").toLowerCase().includes(query) ||
          (community.genre || "").toLowerCase().includes(query) ||
          (community.location || "").toLowerCase().includes(query)
      );
    }

    if (activeFilter === "joined") {
      filtered = filtered.filter((community) => community.isJoined);
    } else if (activeFilter === "trending") {
      filtered = filtered.filter((community) => community.isTrending);
    } else if (activeFilter === "local") {
      filtered = filtered.filter(
        (community) => (community.location || "") !== "Global"
      );
    }

    filtered = [...filtered].sort((a, b) => {
      if (a.isTrending !== b.isTrending) {
        return b.isTrending ? 1 : -1;
      }
      const ac = Number(a.memberCount ?? 0);
      const bc = Number(b.memberCount ?? 0);
      if (ac !== bc) {
        return bc - ac;
      }
      return (a.name || "").localeCompare(b.name || "");
    });

    return filtered;
  }, [communities, searchQuery, activeFilter]);

  const joinedCount = communities.filter((c) => c.isJoined).length;

  const showInitialError = Boolean(loadError && communities.length === 0 && !loading);
  const showRefreshBanner = Boolean(loadError && communities.length > 0 && !loading);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.screenHeading}>COMMUNITY</Text>
            <View style={styles.statsContainer}>
              <Text style={styles.statsText}>
                {joinedCount} joined • {communities.length} total
              </Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>
            Connect with DJs and producers worldwide
          </Text>

          {showRefreshBanner && (
            <View style={styles.refreshErrorBanner}>
              <Ionicons
                name="cloud-offline-outline"
                size={18}
                color="hsl(45, 90%, 55%)"
              />
              <Text style={styles.refreshErrorText} numberOfLines={2}>
                {loadError}
              </Text>
              <TouchableOpacity
                onPress={handleRetryLoad}
                style={styles.refreshErrorRetry}
              >
                <Text style={styles.refreshErrorRetryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

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

        <View style={styles.communitiesList}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Ionicons
                name="musical-notes"
                size={48}
                color="hsl(75, 100%, 60%)"
              />
              <Text style={styles.loadingTitle}>Loading Communities...</Text>
              <Text style={styles.loadingSubtitle}>
                Fetching the latest communities from the database
              </Text>
            </View>
          ) : showInitialError ? (
            <View style={styles.errorContainer}>
              <Ionicons
                name="alert-circle-outline"
                size={48}
                color="hsl(0, 0%, 50%)"
              />
              <Text style={styles.errorTitle}>Something went wrong</Text>
              <Text style={styles.errorSubtitle}>{loadError}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetryLoad}
              >
                <Text style={styles.retryButtonText}>Try again</Text>
              </TouchableOpacity>
            </View>
          ) : communities.length === 0 ? (
            <View style={styles.noResultsContainer}>
              <Ionicons
                name="people-outline"
                size={48}
                color="hsl(0, 0%, 30%)"
              />
              <Text style={styles.noResultsTitle}>No communities yet</Text>
              <Text style={styles.noResultsSubtitle}>
                Check back soon or pull down to refresh.
              </Text>
            </View>
          ) : filteredCommunities.length === 0 ? (
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
            filteredCommunities.map((community, index) => (
              <AnimatedListItem
                key={community.id}
                index={index}
                delay={70}
                maxStaggerIndex={6}
              >
                <CommunityDiscoveryCard
                  community={community}
                  onPress={handleCommunityPress}
                  onJoinPress={handleJoinCommunity}
                />
              </AnimatedListItem>
            ))
          )}
        </View>
      </ScrollView>

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
  scrollViewContent: {
    paddingBottom: 120,
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
    marginBottom: 8,
  },
  /** Spacing from headerTop + subtitle; no extra margin on heading (avoids double stack). */
  screenHeading: {
    fontFamily: "TS Block Bold",
    fontSize: 22,
    color: "#FFFFFF",
    textAlign: "left",
    textTransform: "uppercase",
    lineHeight: 26,
    letterSpacing: 1,
    marginBottom: 0,
    flex: 1,
    marginRight: 12,
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
  refreshErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "hsl(45, 40%, 25%)",
    gap: 8,
  },
  refreshErrorText: {
    flex: 1,
    fontSize: 13,
    color: "hsl(0, 0%, 75%)",
    fontFamily: "Helvetica Neue",
  },
  refreshErrorRetry: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  refreshErrorRetryText: {
    fontSize: 13,
    fontWeight: "600",
    color: "hsl(75, 100%, 60%)",
    fontFamily: "Helvetica Neue",
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
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorSubtitle: {
    fontSize: 14,
    color: "hsl(0, 0%, 60%)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
    fontFamily: "Helvetica Neue",
  },
  noResultsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  noResultsTitle: {
    fontSize: 16,
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
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  loadingTitle: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    color: "hsl(75, 100%, 60%)",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  loadingSubtitle: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    lineHeight: 20,
  },
  communitiesList: {
    padding: 20,
  },
});
