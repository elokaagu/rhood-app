import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  RefreshControl,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ProgressiveImage from "./ProgressiveImage";
import ConnectionsScreen from "./ConnectionsScreen";

// Mock DJs data for discovery
const mockDJs = [
  {
    id: 1,
    name: "Marcus Chen",
    username: "@marcusbeats",
    location: "Shoreditch, London",
    genres: ["House", "Tech House"],
    rating: 4.9,
    profileImage:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    isOnline: true,
    isConnected: false,
    mutualConnections: 3,
    lastActive: "2 hours ago",
    bio: "House music enthusiast with 5+ years experience",
  },
  {
    id: 2,
    name: "Alex Thompson",
    username: "@alexunderground",
    location: "Hackney, London",
    genres: ["Drum & Bass", "Jungle"],
    rating: 4.8,
    profileImage:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    isOnline: true,
    isConnected: false,
    mutualConnections: 1,
    lastActive: "30 minutes ago",
    bio: "Underground DJ specializing in D&B and Jungle",
  },
  {
    id: 3,
    name: "Luna Martinez",
    username: "@lunabeats",
    location: "Barcelona, Spain",
    genres: ["Progressive", "Trance"],
    rating: 4.7,
    profileImage:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
    isOnline: false,
    isConnected: false,
    mutualConnections: 0,
    lastActive: "1 day ago",
    bio: "Progressive and trance DJ from Barcelona",
  },
  {
    id: 4,
    name: "Khadija Hashi",
    username: "@khadijabeats",
    location: "Manchester, UK",
    genres: ["Afro House", "Deep House"],
    rating: 4.9,
    profileImage:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face",
    isOnline: true,
    isConnected: false,
    mutualConnections: 2,
    lastActive: "1 hour ago",
    bio: "Afro house specialist bringing African rhythms to the UK",
  },
  {
    id: 5,
    name: "James Wilson",
    username: "@jameswtechno",
    location: "Berlin, Germany",
    genres: ["Techno", "Minimal"],
    rating: 4.6,
    profileImage:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    isOnline: false,
    isConnected: false,
    mutualConnections: 1,
    lastActive: "3 hours ago",
    bio: "Berlin-based techno DJ and producer",
  },
  {
    id: 6,
    name: "Sofia Rodriguez",
    username: "@sofiaelectronic",
    location: "Madrid, Spain",
    genres: ["Electronic", "Ambient"],
    rating: 4.5,
    profileImage:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face",
    isOnline: true,
    isConnected: false,
    mutualConnections: 0,
    lastActive: "45 minutes ago",
    bio: "Electronic music producer and DJ from Madrid",
  },
];

export default function ConnectionsDiscoveryScreen({ onNavigate }) {
  const [djs, setDjs] = useState(mockDJs);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("discover"); // discover, messages

  const filteredDJs = useMemo(() => {
    let filtered = djs.filter((dj) => !dj.isConnected); // Only show unconnected DJs

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (dj) =>
          dj.name.toLowerCase().includes(query) ||
          dj.username.toLowerCase().includes(query) ||
          dj.location.toLowerCase().includes(query) ||
          dj.genres.some((genre) => genre.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [djs, searchQuery]);

  const handleConnect = (djId) => {
    setDjs((prev) =>
      prev.map((dj) => (dj.id === djId ? { ...dj, isConnected: true } : dj))
    );
    // In a real app, this would send a connection request
  };

  const handleViewProfile = (dj) => {
    onNavigate("profile", { djId: dj.id, djName: dj.name });
  };

  const handleRefresh = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
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
            <Text style={styles.headerTitle}>CONNECTIONS</Text>
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
                        source={{ uri: dj.profileImage }}
                        style={styles.djAvatar}
                      />
                      <View style={styles.djDetails}>
                        <View style={styles.djNameRow}>
                          <Text style={styles.djName}>{dj.name}</Text>
                          {dj.isOnline && (
                            <View style={styles.onlineIndicator} />
                          )}
                        </View>
                        <Text style={styles.djUsername}>{dj.username}</Text>
                        <Text style={styles.djLocation}>{dj.location}</Text>
                        {dj.mutualConnections > 0 && (
                          <Text style={styles.mutualConnections}>
                            {dj.mutualConnections} mutual connection
                            {dj.mutualConnections > 1 ? "s" : ""}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.djActions}>
                      <View style={styles.ratingContainer}>
                        <Ionicons
                          name="star"
                          size={14}
                          color="hsl(75, 100%, 60%)"
                        />
                        <Text style={styles.ratingText}>{dj.rating}</Text>
                      </View>
                      <Text style={styles.lastActive}>{dj.lastActive}</Text>
                    </View>
                  </View>

                  {/* DJ Bio */}
                  <Text style={styles.djBio}>{dj.bio}</Text>

                  {/* Genres */}
                  <View style={styles.genresContainer}>
                    {dj.genres.map((genre, index) => (
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
  headerTitle: {
    fontSize: 24,
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "900",
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
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
    marginLeft: 4,
    fontWeight: "600",
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
