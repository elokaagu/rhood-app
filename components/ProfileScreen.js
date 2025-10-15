import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  Linking,
  Alert,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Audio } from "expo-av";
import ProgressiveImage from "./ProgressiveImage";
import AnimatedListItem from "./AnimatedListItem";
import { SkeletonProfile, SkeletonMix } from "./Skeleton";
import { generateGenreWaveform } from "../lib/audioWaveform";

// Default profile structure - all data comes from database
const defaultProfile = {
  audioId: {
    title: "Unique Original Mix",
    duration: "5:23",
    genre: "Electronic",
    waveform: [20, 35, 45, 30, 55, 40, 25, 50, 35, 60, 45, 30, 25, 40, 35, 50],
    audioUrl: require("../assets/audio/unique-original-mix.mp3"),
  },
};

export default function ProfileScreen({ onNavigate, user }) {
  const [profile, setProfile] = useState(null); // Start with null, load from database
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const soundRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Load user profile from database and set up real-time subscription
  useEffect(() => {
    loadProfile();

    // Set up real-time subscription for profile updates
    if (!user?.id) return;

    const setupRealtimeSubscription = async () => {
      const { supabase } = await import("../lib/supabase");

      const subscription = supabase
        .channel(`profile_${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*", // Listen to all events (INSERT, UPDATE, DELETE)
            schema: "public",
            table: "user_profiles",
            filter: `id=eq.${user.id}`,
          },
          (payload) => {
            console.log("🔄 Profile updated in real-time:", payload);
            // Reload profile when changes detected
            loadProfile();
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    };

    setupRealtimeSubscription();
  }, [user]);

  const loadProfile = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { db } = await import("../lib/supabase");
      const userProfile = await db.getUserProfile(user.id);

      // Load user's gigs
      let recentGigs = [];
      try {
        const gigsData = await db.getUserGigs(user.id);
        if (gigsData && gigsData.length > 0) {
          recentGigs = gigsData.slice(0, 5).map((gig) => ({
            id: gig.id,
            name: gig.name,
            venue: gig.venue,
            date: gig.event_date,
            price: gig.payment ? `£${gig.payment.toFixed(0)}` : "£0",
            rating: gig.dj_rating || 0,
          }));
        }
      } catch (gigsError) {
        console.error("❌ Error loading gigs:", gigsError);
      }

      // Load user's achievements
      let achievements = [];
      try {
        const [allAchievements, userAchievements] = await Promise.all([
          db.getAchievements(),
          db.getUserAchievements(user.id),
        ]);

        if (allAchievements && allAchievements.length > 0) {
          const earnedIds = new Set(
            userAchievements.map((ua) => ua.achievement_id)
          );

          achievements = allAchievements.slice(0, 4).map((achievement) => ({
            id: achievement.id,
            name: achievement.name,
            icon: achievement.icon || "trophy",
            earned: earnedIds.has(achievement.id),
          }));
        }
      } catch (achievementsError) {
        console.error("❌ Error loading achievements:", achievementsError);
      }

      if (userProfile) {
        // Fetch primary mix if exists
        let primaryMix = null;
        if (userProfile.primary_mix_id) {
          try {
            const { data: mixData } = await import("../lib/supabase").then(
              ({ supabase }) =>
                supabase
                  .from("mixes")
                  .select("*")
                  .eq("id", userProfile.primary_mix_id)
                  .single()
            );
            if (mixData) {
              // Generate waveform based on genre and duration
              const waveform = generateGenreWaveform(
                mixData.duration || 300,
                mixData.genre || "electronic",
                16
              );

              primaryMix = {
                title: mixData.title,
                duration: mixData.duration
                  ? `${Math.floor(mixData.duration / 60)}:${(
                      mixData.duration % 60
                    )
                      .toString()
                      .padStart(2, "0")}`
                  : "0:00",
                genre: mixData.genre || "Electronic",
                audioUrl: mixData.file_url,
                waveform: waveform,
              };
            }
          } catch (mixError) {
            console.error("❌ Error loading primary mix:", mixError);
          }
        }

        setProfile({
          id: userProfile.id,
          name: userProfile.dj_name || userProfile.full_name || "Unknown DJ",
          username: userProfile.username 
            ? `@${userProfile.username}`
            : `@${(userProfile.dj_name || userProfile.full_name || "dj")
              .toLowerCase()
              .replace(/\s+/g, "")}`,
          gigsCompleted: userProfile.gigs_completed || 0,
          credits: userProfile.credits || 0,
          bio: userProfile.bio || "No bio available",
          location: userProfile.city || "Location not set",
          genres: userProfile.genres || [],
          profileImage: userProfile.profile_image_url
            ? { uri: userProfile.profile_image_url }
            : null,
          socialLinks: {
            instagram: userProfile.instagram || null,
            soundcloud: userProfile.soundcloud || null,
          },
          audioId: primaryMix || defaultProfile.audioId,
          isVerified: userProfile.is_verified || false,
          joinDate:
            userProfile.join_date || userProfile.created_at || "Unknown",
          recentGigs: recentGigs,
          achievements: achievements,
        });
        console.log("✅ Profile loaded from database");
        console.log("🔍 Social media handles:", {
          instagram: userProfile.instagram,
          soundcloud: userProfile.soundcloud
        });
        console.log(
          `📊 Loaded ${recentGigs.length} gigs and ${achievements.length} achievements`
        );
      } else {
        console.log("📝 No profile found, using mock data");
      }
    } catch (error) {
      console.error("❌ Error loading profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    onNavigate && onNavigate("edit-profile");
  };

  const handleShareProfile = () => {
    // In a real app, this would use the Share API
    Alert.alert(
      "Share Profile",
      "Profile sharing functionality would be implemented here"
    );
  };

  const handleSocialLinkPress = (platform, link) => {
    // Check if link exists and is not empty
    if (!link || link.trim() === "") {
      Alert.alert("No Link", `No ${platform} link available`);
      return;
    }

    let url;
    switch (platform) {
      case "instagram":
        // Link is already a full URL from autofill, use it directly
        url = link;
        break;
      case "soundcloud":
        // Link is already a full URL from autofill, use it directly
        url = link;
        break;
      default:
        return;
    }

    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open link");
    });
  };

  const handleAudioPlay = async () => {
    try {
      if (soundRef.current) {
        if (isPlaying) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
        } else {
          await soundRef.current.playAsync();
          setIsPlaying(true);
        }
      } else {
        const { sound } = await Audio.Sound.createAsync(
          profile.audioId.audioUrl,
          { shouldPlay: true }
        );
        soundRef.current = sound;
        setIsPlaying(true);

        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            setPlaybackPosition(status.positionMillis);
            setPlaybackDuration(status.durationMillis);

            // Update progress animation
            const progress = status.positionMillis / status.durationMillis;
            progressAnim.setValue(progress);
          }
        });
      }
    } catch (error) {
      console.error("Error playing audio:", error);
      Alert.alert("Error", "Could not play audio");
    }
  };

  const handleGigPress = (gig) => {
    onNavigate && onNavigate("gig-detail", { gigId: gig.id });
  };

  const formatTime = (milliseconds) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatDuration = (duration) => {
    const [minutes, seconds] = duration.split(":");
    return parseInt(minutes) * 60000 + parseInt(seconds) * 1000;
  };

  const renderWaveform = () => {
    if (!profile?.audioId?.waveform) {
      return null;
    }

    return (
      <View style={styles.waveformContainer}>
        {profile.audioId.waveform.map((height, index) => (
          <View key={index} style={[styles.waveformBar, { height: height }]} />
        ))}
      </View>
    );
  };

  const renderAchievements = () => {
    if (!profile?.achievements || profile.achievements.length === 0) {
      return null;
    }

    return (
      <View style={styles.achievementsContainer}>
        <Text style={styles.sectionTitle}>Achievements</Text>
        <View style={styles.achievementsGrid}>
          {profile.achievements.map((achievement) => (
            <View
              key={achievement.id}
              style={[
                styles.achievementBadge,
                achievement.earned && styles.achievementEarned,
              ]}
            >
              <Ionicons
                name={achievement.icon}
                size={20}
                color={
                  achievement.earned ? "hsl(75, 100%, 60%)" : "hsl(0, 0%, 30%)"
                }
              />
              <Text
                style={[
                  styles.achievementText,
                  achievement.earned && styles.achievementTextEarned,
                ]}
              >
                {achievement.name}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Show skeleton while loading or if no profile data
  if (loading || !profile) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleShareProfile}
            >
              <Ionicons
                name="share-outline"
                size={20}
                color="hsl(0, 0%, 70%)"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleEditProfile}
            >
              <Ionicons
                name="create-outline"
                size={20}
                color="hsl(0, 0%, 70%)"
              />
            </TouchableOpacity>
          </View>
        </View>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <SkeletonProfile />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleShareProfile}
            >
              <Ionicons
                name="share-outline"
                size={20}
                color="hsl(0, 0%, 70%)"
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleEditProfile}
            >
              <Ionicons
                name="create-outline"
                size={20}
                color="hsl(0, 0%, 70%)"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <ProgressiveImage
              source={profile.profileImage}
              style={styles.profileImage}
              placeholder={
                <View
                  style={[
                    styles.profileImage,
                    {
                      backgroundColor: "hsl(0, 0%, 15%)",
                      justifyContent: "center",
                      alignItems: "center",
                    },
                  ]}
                >
                  <Ionicons name="person" size={40} color="hsl(0, 0%, 50%)" />
                </View>
              }
            />
            {profile.isVerified && (
              <View style={styles.verifiedBadge}>
                <Ionicons name="checkmark" size={12} color="hsl(0, 0%, 0%)" />
              </View>
            )}
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileUsername}>{profile.username}</Text>

            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="hsl(45, 100%, 60%)" />
              <Text style={styles.ratingText}>{profile.rating}</Text>
              <Text style={styles.gigsText}>
                • {profile.gigsCompleted} gigs
              </Text>
            </View>

            <Text style={styles.bio}>{profile.bio}</Text>

            <View style={styles.locationContainer}>
              <Ionicons name="location" size={16} color="hsl(0, 0%, 70%)" />
              <Text style={styles.locationText}>{profile.location}</Text>
            </View>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="flash" size={24} color="hsl(75, 100%, 60%)" />
            <Text style={styles.statNumber}>{profile.credits}</Text>
            <Text style={styles.statLabel}>Credits</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color="hsl(75, 100%, 60%)" />
            <Text style={styles.statNumber}>{profile.gigsCompleted}</Text>
            <Text style={styles.statLabel}>Gigs Done</Text>
          </View>
        </View>

        {/* Genres */}
        <View style={styles.genresContainer}>
          <Text style={styles.sectionTitle}>Genres</Text>
          <View style={styles.genresList}>
            {profile.genres.map((genre, index) => (
              <View key={index} style={styles.genreTag}>
                <Text style={styles.genreText}>{genre}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Audio ID */}
        <View style={styles.audioContainer}>
          <Text style={styles.sectionTitle}>Audio ID</Text>
          <View style={styles.audioCard}>
            <View style={styles.audioHeader}>
              <View style={styles.audioInfo}>
                <Text style={styles.audioTitle}>{profile.audioId.title}</Text>
                <Text style={styles.audioDetails}>
                  {profile.audioId.duration} • {profile.audioId.genre}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.playButton}
                onPress={handleAudioPlay}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={24}
                  color="hsl(0, 0%, 0%)"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.waveformSection}>{renderWaveform()}</View>

            <View style={styles.progressContainer}>
              <Text style={styles.timeText}>
                {formatTime(playbackPosition)}
              </Text>
              <View style={styles.progressBar}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ["0%", "100%"],
                      }),
                    },
                  ]}
                />
              </View>
              <Text style={styles.timeText}>
                {formatTime(formatDuration(profile.audioId.duration))}
              </Text>
            </View>
          </View>
        </View>

        {/* Social Links */}
        <View style={styles.socialContainer}>
          <Text style={styles.sectionTitle}>SOCIAL LINKS</Text>
          {console.log("🔍 Rendering social links with:", {
            instagram: profile.socialLinks.instagram,
            soundcloud: profile.socialLinks.soundcloud,
            hasInstagram: !!profile.socialLinks.instagram,
            hasSoundcloud: !!profile.socialLinks.soundcloud
          })}
          <View style={styles.socialLinks}>
            {/* Instagram Link */}
            <TouchableOpacity
              style={[
                styles.socialLinkCard,
                !profile.socialLinks.instagram && styles.socialLinkDisabled,
              ]}
              onPress={() =>
                handleSocialLinkPress(
                  "instagram",
                  profile.socialLinks.instagram
                )
              }
              disabled={!profile.socialLinks.instagram}
            >
              <View style={styles.socialLinkContent}>
                <View style={styles.socialIconWrapper}>
                  <Ionicons
                    name="logo-instagram"
                    size={24}
                    color={
                      profile.socialLinks.instagram
                        ? "hsl(0, 0%, 100%)"
                        : "hsl(0, 0%, 30%)"
                    }
                  />
                </View>
                <View style={styles.socialLinkInfo}>
                  <Text
                    style={[
                      styles.socialPlatformName,
                      !profile.socialLinks.instagram &&
                        styles.socialPlatformNameDisabled,
                    ]}
                  >
                    Instagram
                  </Text>
                  <Text
                    style={[
                      styles.socialHandle,
                      !profile.socialLinks.instagram &&
                        styles.socialHandleDisabled,
                    ]}
                  >
                    {profile.socialLinks.instagram
                      ? profile.socialLinks.instagram.replace(
                          "https://instagram.com/",
                          "@"
                        )
                      : "Not connected"}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={
                    profile.socialLinks.instagram
                      ? "hsl(75, 100%, 60%)"
                      : "hsl(0, 0%, 30%)"
                  }
                />
              </View>
            </TouchableOpacity>

            {/* SoundCloud Link */}
            <TouchableOpacity
              style={[
                styles.socialLinkCard,
                !profile.socialLinks.soundcloud && styles.socialLinkDisabled,
              ]}
              onPress={() =>
                handleSocialLinkPress(
                  "soundcloud",
                  profile.socialLinks.soundcloud
                )
              }
              disabled={!profile.socialLinks.soundcloud}
            >
              <View style={styles.socialLinkContent}>
                <View style={styles.socialIconWrapper}>
                  <Ionicons
                    name="musical-notes"
                    size={24}
                    color={
                      profile.socialLinks.soundcloud
                        ? "hsl(0, 0%, 100%)"
                        : "hsl(0, 0%, 30%)"
                    }
                  />
                </View>
                <View style={styles.socialLinkInfo}>
                  <Text
                    style={[
                      styles.socialPlatformName,
                      !profile.socialLinks.soundcloud &&
                        styles.socialPlatformNameDisabled,
                    ]}
                  >
                    SoundCloud
                  </Text>
                  <Text
                    style={[
                      styles.socialHandle,
                      !profile.socialLinks.soundcloud &&
                        styles.socialHandleDisabled,
                    ]}
                  >
                    {profile.socialLinks.soundcloud
                      ? profile.socialLinks.soundcloud.replace(
                          "https://soundcloud.com/",
                          ""
                        )
                      : "Not connected"}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={
                    profile.socialLinks.soundcloud
                      ? "hsl(75, 100%, 60%)"
                      : "hsl(0, 0%, 30%)"
                  }
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Upload Mix Button */}
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={() => onNavigate && onNavigate("upload-mix")}
        >
          <LinearGradient
            colors={["hsl(75, 100%, 60%)", "hsl(75, 100%, 50%)"]}
            style={styles.uploadButtonGradient}
          >
            <Ionicons name="cloud-upload-outline" size={24} color="black" />
            <Text style={styles.uploadButtonText}>Upload Mix</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Recent Gigs */}
        {profile.recentGigs && profile.recentGigs.length > 0 && (
          <View style={styles.gigsContainer}>
            <Text style={styles.sectionTitle}>Recent Gigs</Text>
            {profile.recentGigs.map((gig, index) => (
              <AnimatedListItem key={gig.id} index={index} delay={70}>
                <TouchableOpacity
                  style={styles.gigCard}
                  onPress={() => handleGigPress(gig)}
                >
                  <View style={styles.gigHeader}>
                    <Text style={styles.gigName}>{gig.name}</Text>
                    <Text style={styles.gigPrice}>{gig.price}</Text>
                  </View>
                  <Text style={styles.gigVenue}>{gig.venue}</Text>
                  <View style={styles.gigFooter}>
                    <Text style={styles.gigDate}>{gig.date}</Text>
                    <View style={styles.gigRating}>
                      <Ionicons
                        name="star"
                        size={14}
                        color="hsl(45, 100%, 60%)"
                      />
                      <Text style={styles.gigRatingText}>{gig.rating}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </AnimatedListItem>
            ))}
          </View>
        )}

        {/* Achievements */}
        {renderAchievements()}
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
  scrollView: {
    flex: 1,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  profileCard: {
    margin: 20,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "hsl(75, 100%, 60%)",
    padding: 20,
    alignItems: "center",
  },
  profileHeader: {
    position: "relative",
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "hsl(75, 100%, 60%)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "hsl(0, 0%, 0%)",
  },
  profileInfo: {
    alignItems: "center",
    width: "100%",
  },
  profileName: {
    fontSize: 24,
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 16,
    color: "hsl(0, 0%, 70%)",
    marginBottom: 8,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 16,
    color: "hsl(0, 0%, 100%)",
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    marginLeft: 4,
  },
  gigsText: {
    fontSize: 16,
    color: "hsl(0, 0%, 70%)",
    marginLeft: 4,
  },
  bio: {
    fontSize: 14,
    color: "hsl(0, 0%, 100%)",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  locationText: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    marginLeft: 4,
  },
  statsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  statNumber: {
    fontSize: 24,
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Helvetica Neue",
  },
  genresContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 12,
  },
  genresList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genreTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%)",
    backgroundColor: "transparent",
  },
  genreText: {
    fontSize: 14,
    color: "hsl(75, 100%, 60%)",
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
  },
  audioContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  audioCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  audioHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  audioInfo: {
    flex: 1,
  },
  audioTitle: {
    fontSize: 16,
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  audioDetails: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "hsl(75, 100%, 60%)",
    justifyContent: "center",
    alignItems: "center",
  },
  waveformSection: {
    marginBottom: 16,
  },
  waveformContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    gap: 2,
  },
  waveformBar: {
    width: 3,
    backgroundColor: "hsl(0, 0%, 70%)",
    borderRadius: 1.5,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  timeText: {
    fontSize: 12,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Helvetica Neue",
    minWidth: 40,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: "hsl(0, 0%, 15%)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 2,
  },
  socialContainer: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  socialLinks: {
    gap: 16,
  },
  socialLinkCard: {
    backgroundColor: "hsl(0, 0%, 12%)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
    overflow: "hidden",
  },
  socialLinkDisabled: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderColor: "hsl(0, 0%, 15%)",
    opacity: 0.6,
  },
  socialLinkContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
  },
  socialIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "hsl(0, 0%, 18%)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  socialLinkInfo: {
    flex: 1,
  },
  socialPlatformName: {
    fontSize: 16,
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    fontFamily: "Helvetica Neue",
    marginBottom: 4,
  },
  socialPlatformNameDisabled: {
    color: "hsl(0, 0%, 40%)",
  },
  socialHandle: {
    fontSize: 14,
    color: "hsl(75, 100%, 60%)",
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
  },
  socialHandleDisabled: {
    color: "hsl(0, 0%, 30%)",
  },
  gigsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  gigCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  gigHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  gigName: {
    fontSize: 16,
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)",
    flex: 1,
  },
  gigPrice: {
    fontSize: 16,
    color: "hsl(75, 100%, 60%)",
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
  },
  gigVenue: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    marginBottom: 8,
  },
  gigFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gigDate: {
    fontSize: 12,
    color: "hsl(0, 0%, 50%)",
  },
  gigRating: {
    flexDirection: "row",
    alignItems: "center",
  },
  gigRatingText: {
    fontSize: 12,
    color: "hsl(0, 0%, 70%)",
    marginLeft: 4,
  },
  achievementsContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  achievementsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  achievementBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  achievementEarned: {
    borderColor: "hsl(75, 100%, 60%)",
    backgroundColor: "hsl(0, 0%, 5%)",
  },
  achievementText: {
    fontSize: 12,
    color: "hsl(0, 0%, 50%)",
    fontFamily: "Helvetica Neue",
    marginLeft: 6,
  },
  achievementTextEarned: {
    color: "hsl(0, 0%, 100%)",
  },
  uploadButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  uploadButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  uploadButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "black",
  },
});
