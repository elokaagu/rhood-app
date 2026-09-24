import React, { useMemo, useCallback, useState } from "react";
import { useAudioPlayback } from "../context/AudioContext";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Image,
  Linking,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import ProgressiveImage from "./ProgressiveImage";
import AnimatedListItem from "./AnimatedListItem";
import { SkeletonProfile } from "./Skeleton";
import { HapticPatterns } from "../lib/haptics";
import AppScreenTutorialModal from "./AppScreenTutorialModal";
import RhoodModal from "./RhoodModal";
import { useAppTutorialModal } from "../hooks/useAppTutorialModal";
import { APP_TUTORIAL_SCREEN_IDS } from "../lib/appTutorialContent";
import ProfileBookingRequests from "./ProfileBookingRequests";
import { useProfileScreenData } from "../hooks/useProfileScreenData";
import {
  computeAudioIdProgress,
  getReferralLink,
  getReferralShareMessage,
  parseDurationSeconds,
} from "../lib/profileScreen/model";
import styles from "./ProfileScreen.styles";

import { rhoodAlert } from "../lib/rhoodAlert";
export default function ProfileScreen({
  onNavigate,
  user,
  globalAudioState,
  onPlayAudio,
  onPauseAudio,
  onResumeAudio,
  openBookingRequestId = null,
}) {
  const {
    profile,
    loading,
    connectionsCount,
    inviteCode,
    referralStats,
    bookingRequests,
  } = useProfileScreenData(user);

  const { tutorialModalProps } = useAppTutorialModal(APP_TUTORIAL_SCREEN_IDS.PROFILE);
  const audioPlayback = useAudioPlayback();
  const [inviteFeedback, setInviteFeedback] = useState({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });
  const showInviteFeedback = (type, title, message) => {
    setInviteFeedback({ visible: true, type, title, message });
  };

  const audioIdTrackId =
    profile?.audioId?.id || (profile?.id ? `audio-id-${profile.id}` : null);
  const isAudioIdPlaying =
    !!audioIdTrackId &&
    globalAudioState.currentTrack?.id === audioIdTrackId &&
    globalAudioState.isPlaying;

  const audioIdProgress = useMemo(
    () =>
      computeAudioIdProgress({
        profile,
        currentTrackId: globalAudioState.currentTrack?.id,
        positionMillis: audioPlayback.positionMillis,
        durationMillis: audioPlayback.durationMillis,
      }),
    [
      profile,
      globalAudioState.currentTrack?.id,
      audioPlayback.positionMillis,
      audioPlayback.durationMillis,
    ]
  );

  const handleEditProfile = () => {
    onNavigate && onNavigate("edit-profile");
  };

  const handleBookingDeepLinkConsumed = useCallback(() => {
    onNavigate?.("profile", { openBookingRequestId: null });
  }, [onNavigate]);

  const handleSocialLinkPress = (platform, link) => {
    if (!link || link.trim() === "") {
      rhoodAlert("No Link", `No ${platform} link available`);
      return;
    }
    Linking.openURL(link).catch(() => {
      rhoodAlert("Error", "Could not open link");
    });
  };

  const handleCopyLink = async () => {
    const link = getReferralLink(inviteCode);
    if (!link) {
      showInviteFeedback("error", "Couldn't copy", "Invite code not available.");
      return;
    }
    try {
      await Clipboard.setStringAsync(link);
      HapticPatterns.success();
      showInviteFeedback("success", "Copied", "Referral link copied to clipboard.");
    } catch (error) {
      console.error("Failed to copy link:", error);
      showInviteFeedback("error", "Couldn't copy", "Failed to copy link.");
    }
  };

  const handleShareWhatsApp = async () => {
    const message = getReferralShareMessage(inviteCode);
    if (!message) {
      showInviteFeedback("error", "Couldn't share", "Invite code not available.");
      return;
    }
    try {
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
      const canOpenWhatsApp = await Linking.canOpenURL(whatsappUrl);
      if (canOpenWhatsApp) {
        try {
          await Linking.openURL(whatsappUrl);
          return;
        } catch (openError) {
          console.log("WhatsApp app URL failed, trying web fallback:", openError);
        }
      }
      const webUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      try {
        if (await Linking.canOpenURL(webUrl)) {
          await Linking.openURL(webUrl);
          return;
        }
      } catch (webError) {
        console.log("Web WhatsApp URL failed:", webError);
      }
      await Share.share({
        message,
        title: "Invite a DJ to R/HOOD",
      });
    } catch (error) {
      console.error("Error sharing via WhatsApp:", error);
      showInviteFeedback(
        "error",
        "Couldn't share",
        "Could not open WhatsApp. Please make sure WhatsApp is installed, or use the More option to share via other apps."
      );
    }
  };

  const handleShareInstagram = async () => {
    const message = getReferralShareMessage(inviteCode);
    if (!message) {
      showInviteFeedback("error", "Couldn't share", "Invite code not available.");
      return;
    }
    try {
      await Share.share({
        message,
        title: "Invite a DJ to R/HOOD",
      });
    } catch (error) {
      console.error("Error sharing via Instagram:", error);
      showInviteFeedback("error", "Couldn't share", "Could not share.");
    }
  };

  const handleShareSMS = async () => {
    const message = getReferralShareMessage(inviteCode);
    if (!message) {
      showInviteFeedback("error", "Couldn't share", "Invite code not available.");
      return;
    }
    try {
      await Linking.openURL(`sms:?body=${encodeURIComponent(message)}`);
    } catch (error) {
      console.error("Error sharing via SMS:", error);
      showInviteFeedback("error", "Couldn't share", "Could not open SMS.");
    }
  };

  const handleShareNative = async () => {
    const message = getReferralShareMessage(inviteCode);
    const link = getReferralLink(inviteCode);
    if (!message || !link) {
      showInviteFeedback("error", "Couldn't share", "Invite code not available.");
      return;
    }
    try {
      await Share.share({
        message: `${message}\n\n${link}`,
        title: "Invite a DJ to R/HOOD",
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleAudioPlay = async () => {
    try {
      // Check if this audio ID is currently playing
      const audioIdData = profile?.audioId;
      const audioIdTrackId =
        audioIdData?.id || (profile?.id ? `audio-id-${profile.id}` : null);
      const currentTrackId = globalAudioState.currentTrack?.id || null;

      const isCurrentlyPlaying =
        !!audioIdTrackId &&
        !!currentTrackId &&
        currentTrackId === audioIdTrackId;

      if (isCurrentlyPlaying) {
        // If it's playing, pause it
        if (globalAudioState.isPlaying) {
          onPauseAudio();
        } else {
          onResumeAudio();
        }
      } else {
        // If it's not playing, play it using global audio system
        const resolvedAudioUrl =
          audioIdData?.audioUrl ||
          audioIdData?.file_url ||
          audioIdData?.audio_url ||
          null;
        const resolvedArtist =
          audioIdData?.artist ||
          profile?.name ||
          profile?.username ||
          "Unknown Artist";

        const trackData = {
          id: audioIdTrackId || `audio-id-${Date.now()}`,
          title: audioIdData?.title || "Audio ID",
          artist: resolvedArtist,
          genre: audioIdData?.genre || "Electronic",
          audioUrl: resolvedAudioUrl,
          image:
            audioIdData?.artwork_url ||
            audioIdData?.image ||
            profile.profileImage?.uri ||
            null,
          durationMillis:
            audioIdData?.durationMillis ||
            (audioIdData?.durationSeconds
              ? audioIdData.durationSeconds * 1000
              : undefined),
          durationSeconds: audioIdData?.durationSeconds,
          user_id: user?.id, // User ID for navigation
          user_image: profile.profileImage?.uri, // Profile image for About the DJ
          user_dj_name: profile.name, // DJ name for About the DJ
          user_bio: profile.bio, // Bio for About the DJ
          user_username: profile.username,
          user_status_message: profile.statusMessage,
          user: audioIdData?.user || {
            id: profile.id,
            dj_name: profile.name,
            username: profile.username,
            profile_image_url: profile.profileImage?.uri,
            bio: profile.bio,
            status_message: profile.statusMessage,
          },
        };

        console.log("🎵 Playing trackData from ProfileScreen:", {
          title: trackData.title,
          artist: trackData.artist,
          image: trackData.image,
          audioUrl: trackData.audioUrl ? "URL provided" : "No URL",
        });

        await onPlayAudio(trackData);
      }
    } catch (error) {
      console.error("Error playing audio:", error);
      rhoodAlert("Error", "Could not play audio");
    }
  };

  const handleGigPress = (gig) => {
    if (gig?.opportunityId) {
      onNavigate?.("opportunities", { focusOpportunityId: gig.opportunityId });
      return;
    }
  };

  const renderActivityCard = (item, index) => (
    <AnimatedListItem
      key={item.id || `${item.name}-${index}`}
      index={index}
      delay={70}
      maxStaggerIndex={6}
    >
      <TouchableOpacity
        style={styles.gigCard}
        onPress={() => handleGigPress(item)}
        activeOpacity={item.opportunityId ? 0.7 : 1}
        disabled={!item.opportunityId}
      >
        <View style={styles.gigHeader}>
          <Text style={styles.gigName}>{item.name}</Text>
          {item.price ? <Text style={styles.gigPrice}>{item.price}</Text> : null}
        </View>
        {item.venue ? <Text style={styles.gigVenue}>{item.venue}</Text> : null}
        <View style={styles.gigFooter}>
          <Text style={styles.gigDate}>{item.date}</Text>
          <View style={styles.gigMetaRow}>
            {item.statusLabel ? (
              <Text style={styles.gigStatus}>{item.statusLabel}</Text>
            ) : null}
            {item.rating != null ? (
              <View style={styles.gigRating}>
                <Ionicons name="star" size={14} color="hsl(45, 100%, 60%)" />
                <Text style={styles.gigRatingText}>{item.rating}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    </AnimatedListItem>
  );

  const renderActivitySection = (title, items, emptyCopy) => (
    <View style={styles.gigsContainer}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items && items.length > 0 ? (
        items.map((item, index) => renderActivityCard(item, index))
      ) : (
        <View style={styles.gigEmptyCard}>
          <Text style={styles.gigEmptyText}>{emptyCopy}</Text>
        </View>
      )}
    </View>
  );

  const formatTime = (milliseconds) => {
    if (!Number.isFinite(milliseconds) || milliseconds < 0) {
      return "0:00";
    }
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const formatDuration = (duration) => {
    const seconds = parseDurationSeconds(duration);
    return seconds * 1000;
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

    // Use stats from all achievements, not just the first 4 displayed
    const earnedCount = profile.achievementsStats?.earnedCount || profile.achievements.filter((a) => a.earned).length;
    const totalCount = profile.achievementsStats?.totalCount || profile.achievements.length;

    return (
      <TouchableOpacity
        style={styles.achievementsContainer}
        onPress={() => onNavigate && onNavigate("achievements-list")}
        activeOpacity={0.7}
      >
        <View style={styles.achievementsHeader}>
          <View style={styles.achievementsIconContainer}>
            <Ionicons
              name="trophy"
              size={24}
              color="hsl(75, 100%, 60%)"
            />
          </View>
          <View style={styles.achievementsInfo}>
            <Text style={styles.achievementsTitle}>Achievements</Text>
            <Text style={styles.achievementsCount}>
              {earnedCount} of {totalCount} earned
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color="hsl(0, 0%, 50%)"
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderConnections = () => {
    return (
      <TouchableOpacity
        style={styles.connectionsContainer}
        onPress={() => onNavigate && onNavigate("connections-list")}
        activeOpacity={0.7}
      >
        <View style={styles.connectionsHeader}>
          <View style={styles.connectionsIconContainer}>
            <Ionicons
              name="people"
              size={24}
              color="hsl(75, 100%, 60%)"
            />
          </View>
          <View style={styles.connectionsInfo}>
            <Text style={styles.connectionsTitle}>Friends</Text>
            <Text style={styles.connectionsCount}>
              {connectionsCount} {connectionsCount === 1 ? "friend" : "friends"}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color="hsl(0, 0%, 50%)"
          />
        </View>
      </TouchableOpacity>
    );
  };

  const renderInvitePanel = () => {
    return (
      <TouchableOpacity
        style={styles.invitePanelContainer}
        onPress={() => onNavigate && onNavigate("invite")}
        activeOpacity={0.7}
      >
        <View style={styles.invitePanelHeader}>
          <View style={styles.invitePanelIconContainer}>
            <Ionicons
              name="gift"
              size={24}
              color="hsl(75, 100%, 60%)"
            />
          </View>
          <View style={styles.invitePanelInfo}>
            <Text style={styles.invitePanelTitle}>Invite a DJ</Text>
            <Text style={styles.invitePanelCount}>
              {referralStats.totalReferrals} {referralStats.totalReferrals === 1 ? "referral" : "referrals"}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color="hsl(0, 0%, 50%)"
          />
        </View>
      </TouchableOpacity>
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
              onPress={handleEditProfile}
              activeOpacity={0.7}
            >
              <Ionicons
                name="create"
                size={18}
                color="hsl(75, 100%, 60%)"
              />
              <Text style={styles.headerButtonText}>Edit</Text>
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
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleEditProfile}
              activeOpacity={0.7}
            >
              <Ionicons
                name="create"
                size={18}
                color="hsl(75, 100%, 60%)"
              />
              <Text style={styles.headerButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.profileImageContainer}>
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
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileUsername}>{profile.username}</Text>
            {profile.statusMessage ? (
              <Text style={styles.profileStatus}>{profile.statusMessage}</Text>
            ) : null}

            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color="hsl(45, 100%, 60%)" />
              <Text style={styles.ratingText}>
                {profile.ratingDisplay ?? "—"}
              </Text>
              <Text style={styles.gigsText}>
                • {profile.gigsCompleted} gigs
              </Text>
            </View>

            {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

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
          {profile.audioId ? (
            <View style={styles.audioCard}>
              <View style={styles.audioHeader}>
                <View style={styles.audioInfo}>
                  <Text style={styles.audioTitle}>{profile.audioId.title}</Text>
                  <Text style={styles.audioDetails}>
                    {profile.audioId.duration 
                      ? formatTime(formatDuration(profile.audioId.duration))
                      : "0:00"} • {profile.audioId.genre || "Electronic"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.playButton}
                  onPress={handleAudioPlay}
                >
                  <Ionicons
                    name={isAudioIdPlaying ? "pause" : "play"}
                    size={24}
                    color="hsl(0, 0%, 0%)"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.waveformSection}>{renderWaveform()}</View>

              <View style={styles.progressContainer}>
                <Text style={styles.timeText}>
                  {formatTime(audioIdProgress.positionMs)}
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${audioIdProgress.progressPct}%` },
                    ]}
                  />
                </View>
                <Text style={styles.timeText}>
                  {formatTime(
                    audioIdProgress.durationMs > 0
                      ? audioIdProgress.durationMs
                      : formatDuration(profile.audioId.duration)
                  )}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyAudioCard}>
              <View style={styles.emptyAudioContent}>
                <Ionicons
                  name="musical-notes-outline"
                  size={48}
                  color="hsl(0, 0%, 30%)"
                />
                <Text style={styles.emptyAudioTitle}>No Audio ID Set</Text>
                <Text style={styles.emptyAudioSubtitle}>
                  Upload a mix to set as your Audio ID
                </Text>
                <TouchableOpacity
                  style={styles.uploadMixButton}
                  onPress={() => onNavigate && onNavigate("upload-mix")}
                >
                  <Text style={styles.uploadMixButtonText}>Upload Mix</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Social Links */}
        <View style={styles.socialContainer}>
          <Text style={styles.sectionTitle}>Social links</Text>
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

            {/* TikTok Link */}
            {profile.socialLinks.tiktok && (
              <TouchableOpacity
                style={styles.socialLinkCard}
                onPress={() =>
                  handleSocialLinkPress("tiktok", profile.socialLinks.tiktok)
                }
              >
                <View style={styles.socialLinkContent}>
                  <View style={styles.socialIconWrapper}>
                    <Ionicons
                      name="logo-tiktok"
                      size={24}
                      color="hsl(0, 0%, 100%)"
                    />
                  </View>
                  <View style={styles.socialLinkInfo}>
                    <Text style={styles.socialPlatformName}>TikTok</Text>
                    <Text style={styles.socialHandle}>
                      {profile.socialLinks.tiktok.replace(
                        "https://www.tiktok.com/@",
                        "@"
                      )}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="hsl(75, 100%, 60%)"
                  />
                </View>
              </TouchableOpacity>
            )}

            {/* YouTube Link */}
            {profile.socialLinks.youtube && (
              <TouchableOpacity
                style={styles.socialLinkCard}
                onPress={() =>
                  handleSocialLinkPress("youtube", profile.socialLinks.youtube)
                }
              >
                <View style={styles.socialLinkContent}>
                  <View style={styles.socialIconWrapper}>
                    <Ionicons
                      name="logo-youtube"
                      size={24}
                      color="hsl(0, 0%, 100%)"
                    />
                  </View>
                  <View style={styles.socialLinkInfo}>
                    <Text style={styles.socialPlatformName}>YouTube</Text>
                    <Text style={styles.socialHandle}>
                      {profile.socialLinks.youtube.replace(
                        "https://www.youtube.com/@",
                        "@"
                      ).replace("https://www.youtube.com/", "")}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="hsl(75, 100%, 60%)"
                  />
                </View>
              </TouchableOpacity>
            )}

            {/* Portfolio/Website Link */}
            {profile.socialLinks.portfolio_url && (
              <TouchableOpacity
                style={styles.socialLinkCard}
                onPress={() =>
                  handleSocialLinkPress(
                    "portfolio_url",
                    profile.socialLinks.portfolio_url
                  )
                }
              >
                <View style={styles.socialLinkContent}>
                  <View style={styles.socialIconWrapper}>
                    <Ionicons
                      name="globe-outline"
                      size={24}
                      color="hsl(0, 0%, 100%)"
                    />
                  </View>
                  <View style={styles.socialLinkInfo}>
                    <Text style={styles.socialPlatformName}>Portfolio</Text>
                    <Text style={styles.socialHandle} numberOfLines={1}>
                      {profile.socialLinks.portfolio_url.replace(
                        "https://",
                        ""
                      ).replace("http://", "")}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="hsl(75, 100%, 60%)"
                  />
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {renderActivitySection(
          "Recent Opportunities",
          profile.recentOpportunities,
          "Opportunities you apply for will show up here."
        )}

        {renderActivitySection(
          "Recent Gigs",
          profile.recentGigs,
          "Gigs appear here after a brand or admin marks them done on the portal."
        )}

        <ProfileBookingRequests
          requests={bookingRequests}
          initialRequestId={openBookingRequestId}
          onInitialRequestHandled={handleBookingDeepLinkConsumed}
          onSeeAll={() => onNavigate?.("admin-applications")}
        />

        {/* Achievements */}
        {renderAchievements()}

        {/* Connections */}
        {renderConnections()}

        {/* Invite a DJ Panel */}
        {renderInvitePanel()}
      </ScrollView>

      {/* Bottom gradient fade overlay */}
      <LinearGradient
        colors={["transparent", "rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0.8)"]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />
      {tutorialModalProps ? (
        <AppScreenTutorialModal {...tutorialModalProps} />
      ) : null}
      <RhoodModal
        visible={inviteFeedback.visible}
        onClose={() => setInviteFeedback((prev) => ({ ...prev, visible: false }))}
        type={inviteFeedback.type}
        title={inviteFeedback.title}
        message={inviteFeedback.message}
        primaryButtonText="OK"
        onPrimaryPress={() =>
          setInviteFeedback((prev) => ({ ...prev, visible: false }))
        }
      />
    </View>
  );
}
