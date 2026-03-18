import React, {
  memo,
  useState,
  useMemo,
  useEffect,
  useCallback,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  RefreshControl,
  Alert,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProgressiveImage from "./ProgressiveImage";
import ConnectionsScreen from "./ConnectionsScreen";
import { connectionsService } from "../lib/connectionsService";
import { supabase } from "../lib/supabase";

const GENRE_ICON_MAP = {
  house: "home",
  techno: "pulse",
  "drum & bass": "musical-notes",
  progressive: "trending-up",
  trance: "flash",
  "afro house": "globe",
  electronic: "hardware-chip",
};

const getGenreIcon = (genre = "") =>
  GENRE_ICON_MAP[String(genre).toLowerCase()] || "musical-notes";

function useDebouncedValue(value, delay = 200) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function ConnectionsTabSwitcher({ activeTab, onDiscover, onMessages }) {
  return (
    <View style={styles.tabSwitcher}>
      <TouchableOpacity
        style={[
          styles.tabSwitcherButton,
          activeTab === "discover" && styles.tabSwitcherButtonActive,
        ]}
        onPress={onDiscover}
        accessibilityRole="button"
        accessibilityLabel="Discover DJs"
        accessibilityState={{ selected: activeTab === "discover" }}
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
            styles.tabSwitcherText,
            activeTab === "discover" && styles.tabSwitcherTextActive,
          ]}
        >
          Discover
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.tabSwitcherButton,
          activeTab === "messages" && styles.tabSwitcherButtonActive,
        ]}
        onPress={onMessages}
        accessibilityRole="button"
        accessibilityLabel="Messages"
        accessibilityState={{ selected: activeTab === "messages" }}
      >
        <Ionicons
          name="chatbubbles-outline"
          size={16}
          color={
            activeTab === "messages"
              ? "hsl(0, 0%, 0%)"
              : "hsl(0, 0%, 70%)"
          }
        />
        <Text
          style={[
            styles.tabSwitcherText,
            activeTab === "messages" && styles.tabSwitcherTextActive,
          ]}
        >
          Messages
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ConnectionsDiscoveryChrome({
  subtitle,
  activeTab,
  onDiscoverTab,
  onMessagesTab,
  children,
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text
          style={styles.tsBlockBoldHeading}
          accessibilityRole="header"
        >
          CONNECTIONS
        </Text>
      </View>
      <Text style={styles.headerSubtitle}>{subtitle}</Text>
      <ConnectionsTabSwitcher
        activeTab={activeTab}
        onDiscover={onDiscoverTab}
        onMessages={onMessagesTab}
      />
      {children}
    </View>
  );
}

const DJCard = memo(function DJCard({ dj, onConnect, onViewProfile }) {
  const handleConnectPress = useCallback(() => {
    onConnect(dj.id);
  }, [onConnect, dj.id]);

  const handleViewPress = useCallback(() => {
    onViewProfile(dj.id, dj.dj_name || dj.full_name || "");
  }, [onViewProfile, dj.id, dj.dj_name, dj.full_name]);

  const username =
    dj.dj_name?.toLowerCase().replace(/\s+/g, "") || "dj";
  const genres = dj.genres || ["Electronic"];

  return (
    <View style={styles.djCard}>
      <View style={styles.djHeader}>
        <View style={styles.djInfo}>
          <ProgressiveImage
            source={
              dj.profile_image_url ? { uri: dj.profile_image_url } : null
            }
            style={styles.djAvatar}
            placeholder={
              <View style={[styles.djAvatar, styles.avatarPlaceholder]}>
                <Ionicons name="person" size={24} color="hsl(0, 0%, 50%)" />
              </View>
            }
          />
          <View style={styles.djDetails}>
            <View style={styles.djNameRow}>
              <Text style={styles.djName}>
                {dj.dj_name || dj.full_name}
              </Text>
              <View style={styles.onlineIndicator} />
            </View>
            <Text style={styles.djUsername}>@{username}</Text>
            <Text style={styles.djLocation}>{dj.city}</Text>
          </View>
        </View>
        <View style={styles.djActions}>
          <Text style={styles.lastActive}>Recently active</Text>
        </View>
      </View>

      <Text style={styles.djBio}>
        {dj.bio || "Electronic music producer and DJ"}
      </Text>

      <View style={styles.genresContainer}>
        {genres.map((genre, index) => (
          <View
            key={`${dj.id}-${genre}-${index}`}
            style={styles.genreTag}
          >
            <Ionicons
              name={getGenreIcon(genre)}
              size={12}
              color="hsl(75, 100%, 60%)"
              style={styles.genreIcon}
            />
            <Text style={styles.genreText}>{genre}</Text>
          </View>
        ))}
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.viewProfileButton}
          onPress={handleViewPress}
          accessibilityRole="button"
          accessibilityLabel={`View profile of ${dj.dj_name || dj.full_name || "DJ"}`}
        >
          <Ionicons
            name="person-outline"
            size={16}
            color="hsl(0, 0%, 100%)"
          />
          <Text style={styles.viewProfileText}>View Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.connectButton,
            dj.isConnected && styles.connectButtonDisabled,
          ]}
          onPress={handleConnectPress}
          disabled={dj.isConnected}
          accessibilityRole="button"
          accessibilityLabel={
            dj.isConnected
              ? "Already connected"
              : `Connect with ${dj.dj_name || dj.full_name || "DJ"}`
          }
        >
          <Ionicons
            name={dj.isConnected ? "checkmark" : "add"}
            size={16}
            color={dj.isConnected ? "hsl(0, 0%, 50%)" : "hsl(0, 0%, 0%)"}
          />
          <Text
            style={[
              styles.connectText,
              dj.isConnected && styles.connectTextDisabled,
            ]}
          >
            {dj.isConnected ? "Connected" : "Connect"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export default function ConnectionsDiscoveryScreen({ onNavigate }) {
  const [djs, setDjs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("discover");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 200);

  const loadUserAndRecommendedDJs = useCallback(async (options = {}) => {
    const isRefresh = options.isRefresh === true;
    try {
      if (!isRefresh) setLoading(true);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        Alert.alert("Error", "Please log in to discover connections");
        setDjs([]);
        setUser(null);
        return;
      }

      setUser(session.user);

      const recommended = await connectionsService.getRecommendedUsers(
        20,
        session.user.id
      );
      const normalized = recommended.map((dj) => ({
        ...dj,
        _searchBlob: [
          dj.dj_name,
          dj.full_name,
          dj.city,
          ...(dj.genres || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase(),
      }));

      setDjs(normalized);
    } catch (error) {
      console.error("Error loading recommended DJs:", error);
      if (isRefresh) {
        Alert.alert(
          "Couldn't refresh",
          "Check your connection and pull to try again."
        );
      } else {
        Alert.alert("Error", "Failed to load recommended DJs");
        setDjs([]);
      }
    } finally {
      if (!isRefresh) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserAndRecommendedDJs();
  }, [loadUserAndRecommendedDJs]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadUserAndRecommendedDJs({ isRefresh: true });
    } finally {
      setRefreshing(false);
    }
  }, [loadUserAndRecommendedDJs]);

  const filteredDJs = useMemo(() => {
    const query = debouncedSearchQuery.trim().toLowerCase();
    if (!query) return djs;
    return djs.filter((dj) => dj._searchBlob?.includes(query));
  }, [djs, debouncedSearchQuery]);

  const handleConnect = useCallback(async (djId) => {
    try {
      setDjs((prev) =>
        prev.map((dj) =>
          dj.id === djId ? { ...dj, isConnected: true } : dj
        )
      );
      await connectionsService.followUser(djId);
    } catch (error) {
      console.error("Error following user:", error);
      setDjs((prev) =>
        prev.map((dj) =>
          dj.id === djId ? { ...dj, isConnected: false } : dj
        )
      );
      Alert.alert("Error", "Failed to follow user");
    }
  }, []);

  const handleViewProfile = useCallback(
    (dj) => {
      onNavigate("profile", {
        djId: dj.id,
        djName: dj.dj_name || dj.full_name,
      });
    },
    [onNavigate]
  );

  const renderDJItem = useCallback(
    ({ item }) => (
      <DJCard
        dj={item}
        onConnect={handleConnect}
        onViewProfile={handleViewProfile}
      />
    ),
    [handleConnect, handleViewProfile]
  );

  const keyExtractor = useCallback(
    (item) => String(item.id),
    []
  );

  const navigateToMessages = useCallback(() => setActiveTab("messages"), []);
  const navigateToDiscover = useCallback(() => setActiveTab("discover"), []);
  const clearSearch = useCallback(() => setSearchQuery(""), []);

  const messagesOnNavigate = useCallback(
    (screen, params = {}) => {
      onNavigate(screen, params);
    },
    [onNavigate]
  );

  const listHeader = useMemo(
    () => (
      <ConnectionsDiscoveryChrome
        subtitle="Discover and connect with DJs worldwide"
        activeTab="discover"
        onDiscoverTab={navigateToDiscover}
        onMessagesTab={navigateToMessages}
      >
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="hsl(0, 0%, 50%)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search DJs..."
            placeholderTextColor="hsl(0, 0%, 50%)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search DJs"
          />
          {searchQuery.length > 0 ? (
            <TouchableOpacity
              onPress={clearSearch}
              style={styles.clearButton}
              accessibilityRole="button"
              accessibilityLabel="Clear search"
            >
              <Ionicons
                name="close-circle"
                size={20}
                color="hsl(0, 0%, 50%)"
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </ConnectionsDiscoveryChrome>
    ),
    [searchQuery, navigateToDiscover, navigateToMessages, clearSearch]
  );

  const listEmpty = useMemo(() => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="hsl(75, 100%, 60%)" />
        </View>
      );
    }
    return (
      <View style={styles.noResultsContainer}>
        <Ionicons
          name="people-outline"
          size={48}
          color="hsl(0, 0%, 30%)"
        />
        <Text style={styles.noResultsTitle}>No DJs found</Text>
        <Text style={styles.noResultsSubtitle}>
          {searchQuery.trim()
            ? `No results for "${searchQuery}"`
            : "Try adjusting your filters"}
        </Text>
      </View>
    );
  }, [loading, searchQuery]);

  if (activeTab === "messages") {
    return (
      <View style={styles.container}>
        <ConnectionsDiscoveryChrome
          subtitle="Your message conversations"
          activeTab="messages"
          onDiscoverTab={navigateToDiscover}
          onMessagesTab={navigateToMessages}
        />
        <ConnectionsScreen user={user} onNavigate={messagesOnNavigate} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredDJs}
        keyExtractor={keyExtractor}
        renderItem={renderDJItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        contentContainerStyle={
          filteredDJs.length === 0
            ? [styles.listContent, styles.listContentGrow]
            : styles.listContent
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews
        keyboardShouldPersistTaps="handled"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  listContentGrow: {
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    minHeight: 200,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 48,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTop: {
    marginBottom: 8,
  },
  tsBlockBoldHeading: {
    fontFamily: "TS Block Bold",
    fontSize: 22,
    color: "#FFFFFF",
    textAlign: "left",
    textTransform: "uppercase",
    lineHeight: 26,
    letterSpacing: 1,
    marginBottom: 16,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    marginBottom: 16,
  },
  tabSwitcher: {
    flexDirection: "row",
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  tabSwitcherButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  tabSwitcherButtonActive: {
    backgroundColor: "hsl(75, 100%, 60%)",
  },
  tabSwitcherText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    marginLeft: 6,
    fontWeight: "500",
  },
  tabSwitcherTextActive: {
    color: "hsl(0, 0%, 0%)",
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
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
    marginLeft: 12,
  },
  clearButton: {
    padding: 4,
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    lineHeight: 20,
  },
  avatarPlaceholder: {
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
  },
  djCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  djHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  djInfo: {
    flexDirection: "row",
    flex: 1,
  },
  djAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  djDetails: {
    flex: 1,
  },
  djNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  djName: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "600",
    marginRight: 8,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "hsl(75, 100%, 60%)",
  },
  djUsername: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
    marginBottom: 2,
  },
  djLocation: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    marginBottom: 4,
  },
  djActions: {
    alignItems: "flex-end",
  },
  lastActive: {
    fontSize: 10,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 50%)",
  },
  djBio: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 80%)",
    lineHeight: 20,
    marginBottom: 12,
  },
  genresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  genreTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 15%)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 8,
  },
  genreIcon: {
    marginRight: 4,
  },
  genreText: {
    fontSize: 11,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    fontWeight: "500",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  viewProfileButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "hsl(0, 0%, 15%)",
    borderRadius: 8,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 25%)",
  },
  viewProfileText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
    marginLeft: 6,
    fontWeight: "500",
  },
  connectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 8,
    paddingVertical: 12,
  },
  connectButtonDisabled: {
    backgroundColor: "hsl(0, 0%, 15%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 25%)",
  },
  connectText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 0%)",
    marginLeft: 6,
    fontWeight: "600",
  },
  connectTextDisabled: {
    color: "hsl(0, 0%, 50%)",
  },
});
