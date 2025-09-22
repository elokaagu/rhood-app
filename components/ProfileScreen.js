import React, { useState, useRef } from "react";
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

// Mock profile data
const mockProfile = {
  id: 1,
  name: "Eloka Agu",
  username: "@elokaagu",
  profileImage:
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
  rating: 4.8,
  gigsCompleted: 12,
  credits: 156,
  bio: "Underground techno enthusiast with 5 years of experience. Specializing in dark, industrial beats that make crowds move. Always looking for new opportunities to showcase my sound.",
  location: "London",
  genres: ["Techno", "House", "Industrial", "Drum & Bass"],
  socialLinks: {
    instagram: "@alexbeats_official",
    soundcloud: "soundcloud.com/alexbeats",
  },
  audioId: {
    title: "Dark Industrial Mix #1",
    duration: "5:23",
    genre: "Deep Techno",
    waveform: [20, 35, 45, 30, 55, 40, 25, 50, 35, 60, 45, 30, 25, 40, 35, 50],
    audioUrl: "https://example.com/audio/dark-industrial-mix.mp3",
  },
  recentGigs: [
    {
      id: 1,
      name: "Warehouse Sessions #12",
      venue: "East London Warehouse",
      date: "2024-07-20",
      price: "£300",
      rating: 5.0,
    },
    {
      id: 2,
      name: "Underground Collective",
      venue: "Secret Location",
      date: "2024-07-08",
      price: "£250",
      rating: 4.5,
    },
  ],
  achievements: [
    { id: 1, name: "First Gig", icon: "trophy", earned: true },
    { id: 2, name: "5-Star Rating", icon: "star", earned: true },
    { id: 3, name: "10 Gigs", icon: "medal", earned: true },
    { id: 4, name: "Top Performer", icon: "ribbon", earned: false },
  ],
  isVerified: true,
  joinDate: "2023-01-15",
};

export default function ProfileScreen({ onNavigate }) {
  const [profile, setProfile] = useState(mockProfile);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const soundRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

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
    let url;
    switch (platform) {
      case "instagram":
        url = `https://instagram.com/${link.replace("@", "")}`;
        break;
      case "soundcloud":
        url = `https://${link}`;
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
          { uri: profile.audioId.audioUrl },
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
    return (
      <View style={styles.waveformContainer}>
        {profile.audioId.waveform.map((height, index) => (
          <View key={index} style={[styles.waveformBar, { height: height }]} />
        ))}
      </View>
    );
  };

  const renderAchievements = () => {
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

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PROFILE</Text>
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
              source={{ uri: profile.profileImage }}
              style={styles.profileImage}
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
          <Text style={styles.sectionTitle}>Social Links</Text>
          <View style={styles.socialLinks}>
            <TouchableOpacity
              style={styles.socialLink}
              onPress={() =>
                handleSocialLinkPress(
                  "instagram",
                  profile.socialLinks.instagram
                )
              }
            >
              <View style={styles.socialIconContainer}>
                <Ionicons
                  name="logo-instagram"
                  size={20}
                  color="hsl(0, 0%, 100%)"
                />
              </View>
              <Text style={styles.socialText}>
                {profile.socialLinks.instagram}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color="hsl(0, 0%, 50%)"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.socialLink}
              onPress={() =>
                handleSocialLinkPress(
                  "soundcloud",
                  profile.socialLinks.soundcloud
                )
              }
            >
              <View style={styles.socialIconContainer}>
                <Ionicons
                  name="musical-notes"
                  size={20}
                  color="hsl(0, 0%, 100%)"
                />
              </View>
              <Text style={styles.socialText}>
                {profile.socialLinks.soundcloud}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={16}
                color="hsl(0, 0%, 50%)"
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Gigs */}
        <View style={styles.gigsContainer}>
          <Text style={styles.sectionTitle}>Recent Gigs</Text>
          {profile.recentGigs.map((gig) => (
            <TouchableOpacity
              key={gig.id}
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
                  <Ionicons name="star" size={14} color="hsl(45, 100%, 60%)" />
                  <Text style={styles.gigRatingText}>{gig.rating}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

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
    justifyContent: "space-between",
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
    borderWidth: 3,
    borderColor: "hsl(75, 100%, 60%)",
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
    marginBottom: 20,
  },
  socialLinks: {
    gap: 12,
  },
  socialLink: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  socialIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  socialText: {
    flex: 1,
    fontSize: 14,
    color: "hsl(0, 0%, 100%)",
    fontFamily: "Helvetica Neue",
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
});
