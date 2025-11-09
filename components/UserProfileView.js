import React, { useState, useEffect, useRef } from "react";
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
import { Audio } from "expo-audio";
import ProgressiveImage from "./ProgressiveImage";
import { db } from "../lib/supabase";
import { SkeletonProfile } from "./Skeleton";
import RhoodModal from "./RhoodModal";
import * as Haptics from "expo-haptics";
import backgroundAudioService from "../lib/backgroundAudioService";

export default function UserProfileView({
  userId,
  onBack,
  onNavigate,
  globalAudioState,
  onPlayAudio,
  onPauseAudio,
  onResumeAudio,
  onStopAudio,
}) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [connectionId, setConnectionId] = useState(null);
  const [connectionModalType, setConnectionModalType] = useState("success");
  const [isCancellingConnection, setIsCancellingConnection] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Audio playback state
  const [isPlayingAudioId, setIsPlayingAudioId] = useState(false);
  const [isPlayingPrimaryMix, setIsPlayingPrimaryMix] = useState(false);
  const [audioIdProgress, setAudioIdProgress] = useState(0);
  const [primaryMixProgress, setPrimaryMixProgress] = useState(0);
  const audioIdSoundRef = useRef(null);
  const primaryMixSoundRef = useRef(null);

  const parseDurationSeconds = (value) => {
    if (typeof value === "number") {
      return Number.isFinite(value) && value >= 0 ? value : 0;
    }
    if (typeof value === "string") {
      if (value.includes(":")) {
        const [minutes, seconds] = value.split(":");
        const mins = Number(minutes);
        const secs = Number(seconds);
        if (
          Number.isFinite(mins) &&
          Number.isFinite(secs) &&
          mins >= 0 &&
          secs >= 0
        ) {
          return mins * 60 + secs;
        }
      }
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric >= 0) {
        return numeric;
      }
    }
    return 0;
  };

  const formatSecondsToLabel = (seconds) => {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const normalizeConnectionStatus = (status) => {
    if (status === undefined || status === null) return null;
    const normalized = status.toString().trim().toLowerCase();
    return normalized.length > 0 ? normalized : null;
  };

  const isAcceptedConnectionStatus = (status) => {
    const normalized = normalizeConnectionStatus(status);
    return (
      normalized === "accepted" ||
      normalized === "approved" ||
      normalized === "connected"
    );
  };

  const isPendingConnectionStatus = (status) =>
    normalizeConnectionStatus(status) === "pending";

  const pendingConnection = isPendingConnectionStatus(connectionStatus);
  const connectionModalTitle = (() => {
    switch (connectionModalType) {
      case "error":
        return "Something Went Wrong";
      case "info":
        return "Connection Update";
      default:
        return "Connection Sent!";
    }
  })();

  useEffect(() => {
    loadUserProfile();
    checkConnectionStatus();
  }, [userId]);

  const checkConnectionStatus = async () => {
    try {
      const { supabase } = await import("../lib/supabase");
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser || !userId) return;

      const connections = await db.getUserConnections(
        currentUser.id,
        null // Get all connections regardless of status
      );

      // Debug: Log the connections data
      console.log("🔍 UserProfileView - Existing connections:", connections);
      console.log("🔍 UserProfileView - Current user ID:", currentUser.id);
      console.log("🔍 UserProfileView - Target user ID:", userId);

      // Find any connection with this user (regardless of status)
      const connection = connections.find((conn) => {
        console.log("🔍 UserProfileView - Checking connection:", conn);
        const isTargetUser = conn.connected_user_id === userId;
        console.log("🔍 UserProfileView - Is target user?", isTargetUser);
        return isTargetUser;
      });

      if (connection) {
        const normalizedStatus = normalizeConnectionStatus(
          connection.connection_status ||
            connection.status ||
            connection.connectionStatus ||
            connection.state
        );

        setConnectionStatus(normalizedStatus);
        setIsConnected(isAcceptedConnectionStatus(normalizedStatus));
        setConnectionId(
          connection.connection_id ||
            connection.id ||
            connection.connectionId ||
            connection.connection_uuid ||
            null
        );

        console.log(
          "🔍 Connection status for user",
          userId,
          ":",
          normalizedStatus,
          "Is connected:",
          isAcceptedConnectionStatus(normalizedStatus)
        );
      } else {
        setConnectionStatus(null);
        setConnectionId(null);
        setIsConnected(false);
        console.log("🔍 No connection found for user", userId);
      }
    } catch (error) {
      console.error("Error checking connection status:", error);
    }
  };

  useEffect(() => {
    if (profile) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [profile]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioIdSoundRef.current?.progressInterval) {
        clearInterval(audioIdSoundRef.current.progressInterval);
      }
      if (primaryMixSoundRef.current?.progressInterval) {
        clearInterval(primaryMixSoundRef.current.progressInterval);
      }
      // Stop background audio service
      backgroundAudioService.stopTrack();
    };
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const profileData = await db.getUserProfilePublic(userId);

      // Debug: Log the profile data to see what's being returned
      console.log("🔍 Profile data received:", profileData);
      console.log("🔍 Profile image URL:", profileData.profile_image_url);

      // Load primary mix data if it exists
      let primaryMix = null;
      if (profileData.primary_mix_id) {
        try {
          const { supabase } = await import("../lib/supabase");
          const { data: mixData, error: mixError } = await supabase
            .from("mixes")
            .select("*")
            .eq("id", profileData.primary_mix_id)
            .single();

          if (!mixError && mixData) {
            const durationSeconds = parseDurationSeconds(mixData.duration);
            primaryMix = {
              ...mixData,
              duration: durationSeconds,
              duration_label: formatSecondsToLabel(durationSeconds),
            };
          }
        } catch (mixErr) {
          console.warn("⚠️ Could not load primary mix:", mixErr);
        }
      }

      const finalProfile = {
        ...profileData,
        primaryMix: primaryMix,
      };

      // Debug: Log the final profile data
      console.log("🔍 Final profile data being set:", finalProfile);
      console.log(
        "🔍 Final profile_image_url:",
        finalProfile.profile_image_url
      );

      setProfile(finalProfile);
    } catch (err) {
      console.error("❌ Error loading user profile:", err);
      setError("Failed to load profile");
      Alert.alert("Error", "Failed to load user profile");
    } finally {
      setLoading(false);
    }
  };

  const getDisplayName = () =>
    profile?.dj_name ||
    profile?.full_name ||
    `${profile?.first_name || ""} ${profile?.last_name || ""}`.trim() ||
    "this user";

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
        setConnectionMessage("Please log in to connect with users");
        setConnectionModalType("info");
        setShowConnectionModal(true);
        return;
      }

      // Create connection request using new schema
      const connection = await db.createConnection(userId);

      // Get the display name with better fallbacks
      const displayName = getDisplayName();

      // Check if this was a new connection or existing one
      const isNewConnection = connection.status === "pending" && connection.id;

      if (isNewConnection) {
        setConnectionMessage(
          `Connection request sent to ${displayName}. They'll be notified and can accept your request.`
        );
        setConnectionModalType("success");
        setConnectionStatus("pending");
        setConnectionId(
          connection.id ||
            connection.connection_id ||
            connection.connectionId ||
            null
        );
        setIsConnected(false);
      } else {
        setConnectionMessage(`You're already connected to ${displayName}`);
        setConnectionModalType("info");
      }
      setShowConnectionModal(true);
      await checkConnectionStatus();
    } catch (error) {
      console.error("Error sending connection request:", error);
      setConnectionMessage("Failed to send connection request");
      setConnectionModalType("error");
      setShowConnectionModal(true);
    }
  };

  const cancelConnectionRequest = async (displayName) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIsCancellingConnection(true);
      if (!connectionId) {
        throw new Error("No pending request found to cancel");
      }

      await db.cancelConnectionRequest(connectionId);
      setConnectionStatus(null);
      setConnectionId(null);
      setIsConnected(false);

      setConnectionMessage(
        `Connection request to ${displayName} has been cancelled.`
      );
      setConnectionModalType("info");
      setShowConnectionModal(true);

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await checkConnectionStatus();
    } catch (error) {
      console.error("Error cancelling connection request:", error);
      Alert.alert(
        "Error",
        `Failed to cancel connection request: ${error.message || "Unknown error"}`
      );
    } finally {
      setIsCancellingConnection(false);
    }
  };

  const handleCancelConnectionRequest = () => {
    if (!connectionId) {
      Alert.alert(
        "No Pending Request",
        "We couldn't find a pending connection request to cancel."
      );
      return;
    }

    const displayName = getDisplayName();

    Alert.alert(
      "Cancel Connection Request?",
      `Do you want to cancel your pending connection request to ${displayName}?`,
      [
        {
          text: "Keep Pending",
          style: "cancel",
        },
        {
          text: "Cancel Request",
          style: "destructive",
          onPress: () => cancelConnectionRequest(displayName),
        },
      ]
    );
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

  // Audio playback handlers
  const handleAudioIdPlay = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Check if this audio ID is currently playing
      const isCurrentlyPlaying =
        globalAudioState.currentTrack &&
        globalAudioState.currentTrack.id === profile.primaryMix?.id;

      if (isCurrentlyPlaying) {
        // If it's playing, pause it
        if (globalAudioState.isPlaying) {
          onPauseAudio();
        } else {
          onResumeAudio();
        }
      } else {
        // If it's not playing, play it using global audio system
        const trackData = {
          id: profile.primaryMix?.id || "audio-id",
          title: profile.primaryMix?.title || "Audio ID",
          artist: profile.dj_name || profile.full_name || "Unknown Artist",
          genre: profile.primaryMix?.genre || "Electronic",
          audioUrl:
            profile.primaryMix?.file_url ||
            require("../assets/audio/unique-original-mix.mp3"),
          image:
            profile.primaryMix?.artwork_url ||
            profile.profile_image_url ||
            null,
          user_id: profile.id, // User ID for navigation
          user_image: profile.profile_image_url, // Profile image for About the DJ
          user_dj_name: profile.dj_name, // DJ name for About the DJ
          user_bio: profile.bio, // Bio for About the DJ
        };

        console.log("🎵 Playing trackData from UserProfileView:", {
          title: trackData.title,
          artist: trackData.artist,
          image: trackData.image,
          audioUrl: trackData.audioUrl ? "URL provided" : "No URL",
        });

        await onPlayAudio(trackData);
      }
    } catch (error) {
      console.error("Error playing audio ID:", error);
      Alert.alert("Error", "Could not play audio");
    }
  };

  const handlePrimaryMixPlay = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      if (primaryMixSoundRef.current) {
        if (isPlayingPrimaryMix) {
          await primaryMixSoundRef.current.pauseAsync();
          setIsPlayingPrimaryMix(false);
        } else {
          await primaryMixSoundRef.current.playAsync();
          setIsPlayingPrimaryMix(true);
        }
      } else if (profile.primary_mix) {
        // Load and play the primary mix
        if (!Audio || !Audio.Sound || !Audio.Sound.createAsync) {
          return;
        }

        const { sound } = await Audio.Sound.createAsync(
          { uri: profile.primary_mix.file_url },
          { shouldPlay: true }
        );
        primaryMixSoundRef.current = sound;
        setIsPlayingPrimaryMix(true);

        // Set up progress tracking
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            const progress = status.positionMillis / status.durationMillis;
            setPrimaryMixProgress(progress);

            if (status.didJustFinish) {
              setIsPlayingPrimaryMix(false);
              setPrimaryMixProgress(0);
            }
          }
        });
      }
    } catch (error) {
      console.error("Error playing primary mix:", error);
      Alert.alert("Error", "Could not play mix");
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
          </TouchableOpacity>
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
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Profile Header Card */}
          <View style={styles.profileHeaderCard}>
            <View style={styles.profileImageContainer}>
              <ProgressiveImage
                source={
                  profile.profile_image_url
                    ? { uri: profile.profile_image_url }
                    : null
                }
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
            {profile.status_message ? (
              <Text style={styles.profileStatus}>{profile.status_message}</Text>
            ) : null}

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
          {profile.primaryMix && (
            <View style={styles.audioIdCard}>
              <Text style={styles.audioIdTitle}>AUDIO ID</Text>
              <View style={styles.audioPlayer}>
                <View style={styles.audioInfo}>
                  <Text style={styles.trackTitle}>
                    {profile.primaryMix.title}
                  </Text>
                  <Text style={styles.trackDetails}>
                    {profile.primaryMix.duration
                      ? `${Math.floor(profile.primaryMix.duration / 60)}:${(
                          profile.primaryMix.duration % 60
                        )
                          .toString()
                          .padStart(2, "0")}`
                      : "0:00"}{" "}
                    • {profile.primaryMix.genre || "Electronic"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.audioPlayButton}
                  onPress={handleAudioIdPlay}
                >
                  <Ionicons
                    name={
                      globalAudioState.currentTrack &&
                      globalAudioState.currentTrack.id ===
                        profile.primaryMix?.id &&
                      globalAudioState.isPlaying
                        ? "pause"
                        : "play"
                    }
                    size={20}
                    color="hsl(0, 0%, 0%)"
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.waveformContainer}>
                {[3, 5, 2, 7, 4, 6, 3, 8, 5, 4, 6, 3, 5, 7, 4, 2].map(
                  (height, index) => (
                    <View
                      key={index}
                      style={[
                        styles.waveformBar,
                        {
                          height: height * 2,
                          backgroundColor:
                            index < audioIdProgress * 16
                              ? "hsl(75, 100%, 60%)"
                              : "hsl(0, 0%, 30%)",
                        },
                      ]}
                    />
                  )
                )}
              </View>
              <View style={styles.progressContainer}>
                <Text style={styles.timeText}>
                  {isPlayingAudioId ? "1:23" : "0:00"}
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${audioIdProgress * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.timeText}>
                  {profile.primaryMix.duration
                    ? `${Math.floor(profile.primaryMix.duration / 60)}:${(
                        profile.primaryMix.duration % 60
                      )
                        .toString()
                        .padStart(2, "0")}`
                    : "0:00"}
                </Text>
              </View>
            </View>
          )}

          {/* Primary Mix */}
          {profile.primary_mix && (
            <View style={styles.primaryMixSection}>
              <Text style={styles.sectionTitle}>Primary Mix</Text>
              <TouchableOpacity
                style={styles.mixCard}
                onPress={handlePrimaryMixPlay}
              >
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
                    <Ionicons
                      name={isPlayingPrimaryMix ? "pause" : "play"}
                      size={20}
                      color="hsl(0, 0%, 100%)"
                    />
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
                    {profile.primary_mix.duration_label ||
                      formatSecondsToLabel(
                        parseDurationSeconds(profile.primary_mix.duration)
                      )}
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
              style={[
                styles.connectButton,
                isConnected && styles.connectedButton,
                pendingConnection && styles.pendingButton,
              ]}
              onPress={
                isConnected
                  ? undefined
                  : pendingConnection
                  ? handleCancelConnectionRequest
                  : handleConnect
              }
              disabled={
                isConnected || (pendingConnection && isCancellingConnection)
              }
            >
              {pendingConnection && isCancellingConnection ? (
                <ActivityIndicator
                  size="small"
                  color="hsl(75, 100%, 60%)"
                  style={{ marginRight: 8 }}
                />
              ) : (
                <Ionicons
                  name={
                    isConnected
                      ? "checkmark"
                      : pendingConnection
                      ? "close"
                      : "person-add-outline"
                  }
                  size={20}
                  color={
                    isConnected
                      ? "hsl(0, 0%, 100%)"
                      : pendingConnection
                      ? "hsl(75, 100%, 60%)"
                      : "hsl(0, 0%, 0%)"
                  }
                />
              )}
              <Text
                style={[
                  styles.connectButtonText,
                  isConnected && styles.connectedButtonText,
                  pendingConnection && styles.pendingButtonText,
                ]}
              >
                {isConnected
                  ? "Connected"
                  : pendingConnection
                  ? isCancellingConnection
                    ? "Cancelling..."
                    : "Cancel Request"
                  : "Connect"}
              </Text>
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
          message={`Share ${
            profile?.dj_name || profile?.full_name || "this user"
          }'s profile with others?`}
          primaryButtonText="Copy Link"
          secondaryButtonText="Cancel"
          onPrimaryPress={handleCopyLink}
          onSecondaryPress={() => setShowShareModal(false)}
          onBackdropPress={() => setShowShareModal(false)}
        />
      )}

      {/* Connection Modal */}
      {showConnectionModal && (
        <RhoodModal
          type={connectionModalType}
          title={connectionModalTitle}
          message={connectionMessage}
          primaryButtonText="OK"
          onPrimaryPress={() => setShowConnectionModal(false)}
          onBackdropPress={() => setShowConnectionModal(false)}
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
  scrollViewContent: {
    paddingBottom: 120, // Extra padding to prevent content from being hidden behind play bar
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
    fontFamily: "TS-Block-Bold",
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
  profileStatus: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(75, 100%, 70%)",
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
  connectedButton: {
    backgroundColor: "hsl(0, 0%, 30%)",
    opacity: 0.8,
  },
  pendingButton: {
    backgroundColor: "hsl(0, 0%, 12%)",
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%)",
  },
  connectButtonText: {
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
  },
  connectedButtonText: {
    color: "hsl(0, 0%, 100%)",
  },
  pendingButtonText: {
    color: "hsl(75, 100%, 60%)",
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
