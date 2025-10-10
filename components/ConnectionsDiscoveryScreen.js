import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  RefreshControl,
  Image,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ProgressiveImage from "./ProgressiveImage";
import ConnectionsScreen from "./ConnectionsScreen";
import { connectionsService } from "../lib/connectionsService";
import { supabase } from "../lib/supabase";

// All DJ data comes from database

export default function ConnectionsDiscoveryScreen({ onNavigate }) {
  const [djs, setDjs] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("discover"); // discover, messages
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // Load user and recommended DJs on mount
  useEffect(() => {
    loadUserAndRecommendedDJs();
  }, []);

  const loadUserAndRecommendedDJs = async () => {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();
      if (!currentUser) {
        Alert.alert("Error", "Please log in to discover connections");
        return;
      }

      setUser(currentUser);

      // Get recommended users to follow
      const recommended = await connectionsService.getRecommendedUsers(20);
      setDjs(recommended);
    } catch (error) {
      console.error("Error loading recommended DJs:", error);
      Alert.alert("Error", "Failed to load recommended DJs");
      // No fallback to mock data - show empty state
      setDjs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUserAndRecommendedDJs();
    setRefreshing(false);
  };

  const filteredDJs = useMemo(() => {
    let filtered = djs; // Show all recommended DJs

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (dj) =>
          dj.dj_name?.toLowerCase().includes(query) ||
          dj.full_name?.toLowerCase().includes(query) ||
          dj.city?.toLowerCase().includes(query) ||
          dj.genres?.some((genre) => genre.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [djs, searchQuery]);

  const handleConnect = async (djId) => {
    try {
      await connectionsService.followUser(djId);

      // Update local state to show as connected
      setDjs((prev) =>
        prev.map((dj) => (dj.id === djId ? { ...dj, isConnected: true } : dj))
      );

      Alert.alert("Success", "You're now following this DJ!");
    } catch (error) {
      console.error("Error following user:", error);
      Alert.alert("Error", "Failed to follow user");
    }
  };

  const handleViewProfile = (dj) => {
    onNavigate("profile", { djId: dj.id, djName: dj.name });
  };

  const getGenreIcon = (genre) => {
    switch (genre.toLowerCase()) {
      case "house":
        return "home";
      case "techno":
        return "pulse";
      case "drum & bass":
        return "musical-notes";
      case "progressive":
        return "trending-up";
      case "trance":
        return "flash";
      case "afro house":
        return "globe";
      case "electronic":
        return "hardware-chip";
      default:
        return "musical-notes";
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.tsBlockBoldHeading}>CONNECTIONS</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            {activeTab === "discover"
              ? "Discover and connect with DJs worldwide"
              : "Your message conversations"}
          </Text>

          {/* Tab Switcher */}
          <View style={styles.tabSwitcher}>
            <TouchableOpacity
              style={[
                styles.tabSwitcherButton,
                activeTab === "discover" && styles.tabSwitcherButtonActive,
              ]}
              onPress={() => setActiveTab("discover")}
            >
              <Ionicons
                name="people-outline"
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
              onPress={() => setActiveTab("messages")}
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

          {activeTab === "discover" && (
            <>
              {/* Search Bar */}
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
            </>
          )}
        </View>

        {/* Content based on active tab */}
        {activeTab === "discover" ? (
          /* DJs List */
          <View style={styles.djsList}>
            {filteredDJs.length === 0 ? (
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
            ) : (
              filteredDJs.map((dj) => (
                <View key={dj.id} style={styles.djCard}>
                  {/* DJ Header */}
                  <View style={styles.djHeader}>
                    <View style={styles.djInfo}>
                      <ProgressiveImage
                        source={{
                          uri:
                            dj.profile_image_url ||
                            "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=150&h=150&fit=crop&crop=face",
                        }}
                        style={styles.djAvatar}
                      />
                      <View style={styles.djDetails}>
                        <View style={styles.djNameRow}>
                          <Text style={styles.djName}>
                            {dj.dj_name || dj.full_name}
                          </Text>
                          {/* For now, show all as online. In a real app, you'd track online status */}
                          <View style={styles.onlineIndicator} />
                        </View>
                        <Text style={styles.djUsername}>
                          @
                          {dj.dj_name?.toLowerCase().replace(/\s+/g, "") ||
                            "dj"}
                        </Text>
                        <Text style={styles.djLocation}>{dj.city}</Text>
                        {/* Mutual connections would need to be calculated */}
                      </View>
                    </View>
                    <View style={styles.djActions}>
                      <Text style={styles.lastActive}>Recently active</Text>
                    </View>
                  </View>

                  {/* DJ Bio */}
                  <Text style={styles.djBio}>
                    {dj.bio || "Electronic music producer and DJ"}
                  </Text>

                  {/* Genres */}
                  <View style={styles.genresContainer}>
                    {(dj.genres || ["Electronic"]).map((genre, index) => (
                      <View key={index} style={styles.genreTag}>
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

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.viewProfileButton}
                      onPress={() => handleViewProfile(dj)}
                    >
                      <Ionicons
                        name="person-outline"
                        size={16}
                        color="hsl(0, 0%, 100%)"
                      />
                      <Text style={styles.viewProfileText}>View Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.connectButton}
                      onPress={() => handleConnect(dj.id)}
                    >
                      <Ionicons name="add" size={16} color="hsl(0, 0%, 0%)" />
                      <Text style={styles.connectText}>Connect</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : (
          /* Messages Section */
          <ConnectionsScreen
            onNavigate={(screen, params = {}) => {
              onNavigate(screen, params);
            }}
          />
        )}
      </ScrollView>
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
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTop: {
    marginBottom: 8,
  },
  tsBlockBoldHeading: {
    fontFamily: "TS-Block-Bold",
    fontSize: 22,
    color: "#FFFFFF", // Brand white
    textAlign: "left", // Left aligned as per guidelines
    textTransform: "uppercase", // Always uppercase
    lineHeight: 26, // Tight line height for stacked effect
    letterSpacing: 1, // Slight spacing for impact
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
  djsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    fontFamily: "TS-Block-Bold",
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
    fontFamily: "TS-Block-Bold",
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
  mutualConnections: {
    fontSize: 11,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
    fontWeight: "500",
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
  connectText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 0%)",
    marginLeft: 6,
    fontWeight: "600",
  },
});
