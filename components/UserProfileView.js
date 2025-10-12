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
import * as Haptics from "expo-haptics";

export default function UserProfileView({ userId, onBack, onNavigate }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
      const displayName = profile?.dj_name || 
                         profile?.full_name || 
                         `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() ||
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
        <TouchableOpacity style={styles.moreButton}>
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
          {/* Profile Header */}
          <View style={styles.profileHeader}>
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
                  <Ionicons name="checkmark" size={16} color="hsl(0, 0%, 0%)" />
                </View>
              )}
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {profile.dj_name || profile.full_name}
              </Text>
              <Text style={styles.profileUsername}>
                @
                {profile.username ||
                  profile.dj_name?.toLowerCase().replace(/\s+/g, "") ||
                  "user"}
              </Text>
              <Text style={styles.profileLocation}>
                <Ionicons name="location" size={14} color="hsl(0, 0%, 70%)" />
                {profile.city || "Location not set"}
              </Text>

              {/* Contact Information */}
              {profile.show_email && profile.email && (
                <Text style={styles.contactInfo}>
                  <Ionicons name="mail" size={14} color="hsl(0, 0%, 70%)" />
                  {profile.email}
                </Text>
              )}
              {profile.show_phone && profile.phone && (
                <Text style={styles.contactInfo}>
                  <Ionicons name="call" size={14} color="hsl(0, 0%, 70%)" />
                  {profile.phone}
                </Text>
              )}

              {/* Stats */}
              <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                  <Ionicons
                    name="briefcase"
                    size={16}
                    color="hsl(0, 0%, 70%)"
                  />
                  <Text style={styles.statValue}>
                    {profile.gigs_completed || 0}
                  </Text>
                </View>
                <View style={styles.statItem}>
                  <Ionicons
                    name="diamond"
                    size={16}
                    color="hsl(75, 100%, 60%)"
                  />
                  <Text style={styles.statValue}>{profile.credits || 0}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Bio */}
          {profile.bio && (
            <View style={styles.bioSection}>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          )}

          {/* Audio ID Card */}
          <View style={styles.audioIdCard}>
            <Text style={styles.cardTitle}>Audio ID</Text>
            <View style={styles.audioPlayer}>
              <View style={styles.audioInfo}>
                <Text style={styles.trackTitle}>Dark Industrial Mix #1</Text>
                <Text style={styles.trackDetails}>5:23 • Deep Techno</Text>
              </View>
              <TouchableOpacity style={styles.playButton}>
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

          {/* Social Links Card */}
          <View style={styles.socialLinksCard}>
            <Text style={styles.cardTitle}>Social Links</Text>
            <TouchableOpacity style={styles.socialLink}>
              <View style={styles.instagramIcon}>
                <Ionicons
                  name="logo-instagram"
                  size={20}
                  color="hsl(0, 0%, 100%)"
                />
              </View>
              <Text style={styles.socialLinkText}>@elokaagu</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialLink}>
              <View style={styles.soundcloudIcon}>
                <Ionicons
                  name="logo-soundcloud"
                  size={20}
                  color="hsl(0, 0%, 100%)"
                />
              </View>
              <Text style={styles.socialLinkText}>@elokaagu</Text>
            </TouchableOpacity>
          </View>

          {/* Genre Tags */}
          {profile.genres && profile.genres.length > 0 && (
            <View style={styles.genresSection}>
              <Text style={styles.sectionTitle}>Genres</Text>
              <View style={styles.genresContainer}>
                {profile.genres.map((genre, index) => (
                  <View key={index} style={styles.genreTag}>
                    <Ionicons
                      name="musical-notes"
                      size={12}
                      color="hsl(75, 100%, 60%)"
                    />
                    <Text style={styles.genreText}>{genre}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

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

          {/* Social Links */}
          <View style={styles.socialSection}>
            <Text style={styles.sectionTitle}>Connect</Text>
            <View style={styles.socialLinks}>
              {profile.instagram && (
                <TouchableOpacity style={styles.socialButton}>
                  <Ionicons
                    name="logo-instagram"
                    size={20}
                    color="hsl(0, 0%, 100%)"
                  />
                  <Text style={styles.socialText}>Instagram</Text>
                </TouchableOpacity>
              )}
              {profile.soundcloud && (
                <TouchableOpacity style={styles.socialButton}>
                  <Ionicons name="cloud" size={20} color="hsl(0, 0%, 100%)" />
                  <Text style={styles.socialText}>SoundCloud</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.messageButton}
              onPress={handleMessage}
            >
              <Ionicons name="chatbubble" size={20} color="hsl(0, 0%, 100%)" />
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.connectButton}
              onPress={handleConnect}
            >
              <Ionicons name="person-add" size={20} color="hsl(0, 0%, 0%)" />
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
  profileHeader: {
    flexDirection: "row",
    marginBottom: 24,
  },
  profileImageContainer: {
    position: "relative",
    marginRight: 20,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "hsl(0, 0%, 0%)",
  },
  profileInfo: {
    flex: 1,
    justifyContent: "center",
  },
  profileName: {
    fontSize: 24,
    fontFamily: "Arial",
    fontWeight: "700",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 16,
    fontFamily: "Arial",
    color: "hsl(75, 100%, 60%)",
    marginBottom: 8,
  },
  profileLocation: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  contactInfo: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 14,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
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
  genresSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 12,
  },
  genresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genreTag: {
    backgroundColor: "hsl(0, 0%, 15%)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  genreText: {
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
  socialLinks: {
    flexDirection: "row",
    gap: 12,
  },
  socialButton: {
    backgroundColor: "hsl(0, 0%, 15%)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  socialText: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)",
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
  cardTitle: {
    fontSize: 18,
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 16,
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
  playButton: {
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
  // Social Links Card Styles
  socialLinksCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  socialLink: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "hsl(0, 0%, 12%)",
    borderRadius: 12,
    marginBottom: 8,
  },
  instagramIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "hsl(322, 100%, 50%)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  soundcloudIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "hsl(30, 100%, 50%)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  socialLinkText: {
    fontSize: 16,
    color: "hsl(0, 0%, 100%)",
    fontFamily: "Arial",
    fontWeight: "500",
  },
});
