import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Animated,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ProgressiveImage from "./ProgressiveImage";
import { db } from "../lib/supabase";
import { SkeletonProfile } from "./Skeleton";
import RhoodModal from "./RhoodModal";
import * as Haptics from "expo-haptics";

export default function UserProfileView({ userId, onBack, onNavigate }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  useEffect(() => {
    if (profile) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [profile]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const profileData = await db.getUserProfile(userId);
      setProfile(profileData);
    } catch (err) {
      console.error("❌ Error loading user profile:", err);
      setError("Failed to load profile");
      Alert.alert("Error", "Failed to load user profile");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Debug: Log profile data
      console.log("🔍 Profile data:", profile);
      console.log("🔍 Profile dj_name:", profile?.dj_name);
      console.log("🔍 Profile full_name:", profile?.full_name);

      // Get current user
      const { supabase } = await import("../lib/supabase");
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        Alert.alert("Error", "Please log in to connect with users");
        return;
      }

      // Create connection request
      await db.createConnection(currentUser.id, userId);

      // Get the display name with better fallbacks
      const displayName =
        profile?.dj_name ||
        profile?.full_name ||
        `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() ||
        "this user";

      Alert.alert(
        "Connection Sent!",
        `Connection request sent to ${displayName}`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error sending connection request:", error);
      Alert.alert("Error", "Failed to send connection request");
    }
  };

  const handleMessage = () => {
    if (onNavigate) {
      onNavigate("messages", { isGroupChat: false, djId: userId });
    }
  };

  const handlePlayMix = () => {
    if (profile.primary_mix && onNavigate) {
      onNavigate("listen", { mixId: profile.primary_mix.id });
    }
  };

  const handleShareProfile = () => {
    setShowShareModal(true);
  };

  const handleCopyLink = () => {
    const profileUrl = `https://rhood.io/profile/${userId}`;
    // In a real app, you'd copy to clipboard using Clipboard API
    setShowShareModal(false);
    // Show success feedback
    Alert.alert("Copied!", "Profile link copied to clipboard");
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <SkeletonProfile />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color="hsl(0, 0%, 50%)" />
          <Text style={styles.errorTitle}>Profile Not Found</Text>
          <Text style={styles.errorSubtitle}>
            This user's profile could not be loaded
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadUserProfile}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={handleShareProfile}
          accessibilityLabel="Share Profile"
          accessibilityHint="Tap to share this user's profile"
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={24}
            color="hsl(0, 0%, 100%)"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Profile Header Card */}
          <View style={styles.profileHeaderCard}>
            <View style={styles.profileImageContainer}>
              <ProgressiveImage
                source={{
                  uri:
                    profile.profile_image_url ||
                    "https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=200&h=200&fit=crop",
                }}
                style={styles.profileImage}
              />
              {profile.is_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark" size={12} color="hsl(0, 0%, 0%)" />
                </View>
              )}
            </View>

            <Text style={styles.profileDisplayName}>
              {profile.dj_name || profile.full_name}
            </Text>
            <Text style={styles.profileUsername}>
              @
              {profile.username ||
                profile.dj_name?.toLowerCase().replace(/\s+/g, "") ||
                "user"}
            </Text>

            <View style={styles.profileLocation}>
              <Ionicons
                name="location-outline"
                size={16}
                color="hsl(0, 0%, 70%)"
              />
              <Text style={styles.locationText}>
                {profile.city || "Location not set"}
              </Text>
            </View>

            {/* Contact Information */}
            {profile.show_email && profile.email && (
              <View style={styles.contactInfoContainer}>
                <Ionicons
                  name="mail-outline"
                  size={16}
                  color="hsl(0, 0%, 70%)"
                />
                <Text style={styles.contactText}>{profile.email}</Text>
              </View>
            )}
            {profile.show_phone && profile.phone && (
              <View style={styles.contactInfoContainer}>
                <Ionicons
                  name="call-outline"
                  size={16}
                  color="hsl(0, 0%, 70%)"
                />
                <Text style={styles.contactText}>{profile.phone}</Text>
              </View>
            )}
          </View>

          {/* Bio */}
          {profile.bio && (
            <View style={styles.bioSection}>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          )}

          {/* Genres */}
          <View style={styles.genresCard}>
            <Text style={styles.cardTitle}>Genres</Text>
            <View style={styles.genresContainer}>
              {profile.genres && profile.genres.length > 0 ? (
                profile.genres.map((genre, index) => (
                  <View key={index} style={styles.genreTag}>
                    <Text style={styles.genreTagText}>{genre}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.genreTag}>
                  <Text style={styles.genreTagText}>Electronic</Text>
                </View>
              )}
            </View>
          </View>

          {/* Audio ID Card */}
          <View style={styles.audioIdCard}>
            <Text style={styles.audioIdTitle}>AUDIO ID</Text>
            <View style={styles.audioPlayer}>
              <View style={styles.audioInfo}>
                <Text style={styles.trackTitle}>Dark Industrial Mix #1</Text>
                <Text style={styles.trackDetails}>5:23 • Deep Techno</Text>
              </View>
              <TouchableOpacity style={styles.audioPlayButton}>
                <Ionicons name="play" size={20} color="hsl(0, 0%, 0%)" />
              </TouchableOpacity>
            </View>
            <View style={styles.waveformContainer}>
              {[3, 5, 2, 7, 4, 6, 3, 8, 5, 4, 6, 3, 5, 7, 4, 2].map(
                (height, index) => (
                  <View
                    key={index}
                    style={[styles.waveformBar, { height: height * 2 }]}
                  />
                )
              )}
            </View>
            <View style={styles.progressContainer}>
              <Text style={styles.timeText}>1:23</Text>
              <View style={styles.progressBar}>
                <View style={styles.progressFill} />
              </View>
              <Text style={styles.timeText}>5:23</Text>
            </View>
          </View>

          {/* Primary Mix */}
          {profile.primary_mix && (
            <View style={styles.primaryMixSection}>
              <Text style={styles.sectionTitle}>Primary Mix</Text>
              <TouchableOpacity style={styles.mixCard} onPress={handlePlayMix}>
                <View style={styles.mixArtwork}>
                  <ProgressiveImage
                    source={{
                      uri:
                        profile.primary_mix.artwork_url ||
                        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop",
                    }}
                    style={styles.mixImage}
                  />
                  <View style={styles.playButton}>
                    <Ionicons name="play" size={20} color="hsl(0, 0%, 100%)" />
                  </View>
                </View>
                <View style={styles.mixInfo}>
                  <Text style={styles.mixTitle}>
                    {profile.primary_mix.title}
                  </Text>
                  <Text style={styles.mixGenre}>
                    {profile.primary_mix.genre}
                  </Text>
                  <Text style={styles.mixDuration}>
                    {Math.floor(profile.primary_mix.duration / 60)}:
                    {(profile.primary_mix.duration % 60)
                      .toString()
                      .padStart(2, "0")}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.messageButton}
              onPress={handleMessage}
            >
              <Ionicons
                name="chatbubble-outline"
                size={20}
                color="hsl(0, 0%, 100%)"
              />
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.connectButton}
              onPress={handleConnect}
            >
              <Ionicons
                name="person-add-outline"
                size={20}
                color="hsl(0, 0%, 0%)"
              />
              <Text style={styles.connectButtonText}>Connect</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      {/* Bottom gradient fade overlay */}
      <LinearGradient
        colors={["transparent", "rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0.8)"]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      {/* Share Profile Modal */}
      {showShareModal && (
        <RhoodModal
          type="info"
          title="Share Profile"
          message={`Share ${profile?.dj_name || profile?.full_name || 'this user'}'s profile with others?`}
          primaryButtonText="Copy Link"
          secondaryButtonText="Cancel"
          onPrimaryPress={handleCopyLink}
          onSecondaryPress={() => setShowShareModal(false)}
          onBackdropPress={() => setShowShareModal(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
  moreButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  profileHeaderCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    alignItems: "center",
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "hsl(0, 0%, 0%)",
  },
  profileDisplayName: {
    fontSize: 22,
    fontFamily: "Arial",
    fontWeight: "700",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
    textAlign: "center",
  },
  profileUsername: {
    fontSize: 16,
    fontFamily: "Arial",
    color: "hsl(75, 100%, 60%)",
    marginBottom: 12,
    textAlign: "center",
  },
  profileLocation: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    justifyContent: "center",
  },
  locationText: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
    marginLeft: 4,
  },
  contactInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    justifyContent: "center",
  },
  contactText: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
    marginLeft: 4,
  },
  bioSection: {
    marginBottom: 24,
  },
  bioText: {
    fontSize: 16,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
    lineHeight: 24,
  },
  genresCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  cardTitle: {
    fontSize: 18,
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 16,
  },
  genresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genreTag: {
    backgroundColor: "hsl(0, 0%, 15%)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  genreTagText: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
  },
  primaryMixSection: {
    marginBottom: 24,
  },
  mixCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  mixArtwork: {
    position: "relative",
    marginRight: 16,
  },
  mixImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  playButton: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  mixInfo: {
    flex: 1,
  },
  mixTitle: {
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  mixGenre: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(75, 100%, 60%)",
    marginBottom: 4,
  },
  mixDuration: {
    fontSize: 12,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
  },
  socialSection: {
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 40,
  },
  messageButton: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 15%)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  messageButtonText: {
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
  connectButton: {
    flex: 1,
    backgroundColor: "hsl(75, 100%, 60%)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  connectButtonText: {
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginTop: 16,
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 16,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
  },
  // Audio ID Card Styles
  audioIdCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  audioIdTitle: {
    fontSize: 18,
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 16,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  audioPlayer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  audioInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  trackDetails: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
  },
  audioPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "hsl(75, 100%, 60%)",
    alignItems: "center",
    justifyContent: "center",
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    marginBottom: 12,
    gap: 2,
  },
  waveformBar: {
    width: 3,
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 1.5,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: "hsl(0, 0%, 20%)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    width: "25%",
    backgroundColor: "hsl(75, 100%, 60%)",
  },
  timeText: {
    fontSize: 12,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Arial",
  },
});
