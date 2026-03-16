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
  ActivityIndicator,
  Modal,
  Share,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { Audio } from "expo-audio";
import ProgressiveImage from "./ProgressiveImage";
import AnimatedListItem from "./AnimatedListItem";
import { SkeletonProfile, SkeletonMix } from "./Skeleton";
import { generateGenreWaveform } from "../lib/audioWaveform";
import { HapticPatterns } from "../lib/haptics";
import { createScreenCache } from "../lib/screenCache";

// Default profile structure - all data comes from database
const defaultProfile = {
  audioId: {
    title: "Unique Original Mix",
    duration: "5:23",
    durationSeconds: 323,
    genre: "Electronic",
    waveform: [20, 35, 45, 30, 55, 40, 25, 50, 35, 60, 45, 30, 25, 40, 35, 50],
    audioUrl: require("../assets/audio/unique-original-mix.mp3"),
  },
};

const profileCache = createScreenCache("profile");

export default function ProfileScreen({
  onNavigate,
  user,
  globalAudioState,
  onPlayAudio,
  onPauseAudio,
  onResumeAudio,
  onStopAudio,
}) {
  const [profile, setProfile] = useState(null); // Start with null, load from database
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [inviteCode, setInviteCode] = useState(null);
  const [referralStats, setReferralStats] = useState({
    totalReferrals: 0,
    totalCreditsEarned: 0,
  });
  const soundRef = useRef(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const audioIdTrackId =
    profile?.audioId?.id || (profile?.id ? `audio-id-${profile.id}` : null);
  const isAudioIdPlaying =
    !!audioIdTrackId &&
    globalAudioState.currentTrack?.id === audioIdTrackId &&
    globalAudioState.isPlaying;

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

  const parseDurationString = (str) => {
    if (typeof str !== "string") return null;
    const parts = str.split(":").map((p) => Number(p));
    if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
    if (parts.length === 3) {
      const [h, m, s] = parts;
      return h * 3600 + m * 60 + s;
    }
    if (parts.length === 2) {
      const [m, s] = parts;
      return m * 60 + s;
    }
    if (parts.length === 1) {
      return parts[0];
    }
    return null;
  };

  const extractDurationSeconds = (mix) => {
    if (!mix) return null;
    const durationSecondsCandidates = [
      mix.durationSeconds,
      mix.duration_seconds,
      mix.duration,
      mix.metadata?.duration,
      mix.metadata?.duration_seconds,
      mix.audio_metadata?.duration,
      mix.audio_metadata?.duration_seconds,
      mix.audioMetadata?.duration,
      mix.audioMetadata?.duration_seconds,
    ];

    for (const cand of durationSecondsCandidates) {
      const secs = parseDurationSeconds(cand);
      if (secs && Number.isFinite(secs) && secs > 0) return secs;
    }

    const durationMillisCandidates = [
      mix.durationMillis,
      mix.duration_millis,
      mix.metadata?.durationMillis,
      mix.metadata?.duration_millis,
      mix.audio_metadata?.durationMillis,
      mix.audio_metadata?.duration_millis,
      mix.audioMetadata?.durationMillis,
      mix.audioMetadata?.duration_millis,
    ];
    for (const cand of durationMillisCandidates) {
      if (Number.isFinite(cand) && cand > 0) return Math.round(cand / 1000);
    }

    const formattedCandidates = [
      mix.duration_formatted,
      mix.durationFormatted,
      mix.durationLabel,
    ];
    for (const cand of formattedCandidates) {
      const secs = parseDurationString(cand);
      if (secs && Number.isFinite(secs) && secs > 0) return secs;
    }

    return null;
  };

  const formatSecondsToLabel = (seconds) => {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  // Load user profile from database and set up real-time subscription
  useEffect(() => {
    const userId = user?.id;
    if (userId) {
      const cached = profileCacheByUser[userId];
      if (cached?.profile && Number.isFinite(cached.lastLoadedAt) && Date.now() - cached.lastLoadedAt <= STALE_MS) {
        setProfile(cached.profile);
        setConnectionsCount(cached.connectionsCount ?? 0);
        setInviteCode(cached.inviteCode ?? null);
        setReferralStats(cached.referralStats ?? { totalReferrals: 0, totalCreditsEarned: 0 });
        setLoading(false);
        // Still set up real-time subscription below
      } else {
        loadProfile();
      }
    } else {
      loadProfile();
    }

    // Set up real-time subscription for profile updates
    if (!user?.id) return;

    let subscription = null;
    let isMounted = true;

    const setupRealtimeSubscription = async () => {
      const { supabase } = await import("../lib/supabase");

      subscription = supabase
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
            // Reload profile when changes detected (including credits updates)
            if (isMounted) {
              loadProfile();
            }
          }
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    // Cleanup subscription on unmount or user change
    return () => {
      isMounted = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
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
          const formatDateWithOrdinal = (dateString) => {
            if (!dateString) return "TBD";
            try {
              const date = new Date(dateString);
              if (Number.isNaN(date.getTime())) return "TBD";
              
              const day = date.getDate();
              const month = date.toLocaleDateString("en-GB", { month: "long" });
              const year = date.getFullYear();
              
              // Add ordinal suffix
              const getOrdinalSuffix = (n) => {
                const s = ["th", "st", "nd", "rd"];
                const v = n % 100;
                return s[(v - 20) % 10] || s[v] || s[0];
              };
              
              return `${day}${getOrdinalSuffix(day)} ${month} ${year}`;
            } catch (error) {
              return "TBD";
            }
          };
          
          recentGigs = gigsData.slice(0, 5).map((gig) => ({
            id: gig.id,
            name: gig.name,
            venue: gig.venue,
            date: formatDateWithOrdinal(gig.event_date),
            price: gig.payment ? `£${gig.payment.toFixed(0)}` : "£0",
            rating: gig.dj_rating || 0,
          }));
        }
      } catch (gigsError) {
        console.error("❌ Error loading gigs:", gigsError);
      }

      // Load user's achievements, credits, connections count, invite code, and referral stats
      let achievements = [];
      let achievementsStats = { earnedCount: 0, totalCount: 0 };
      let creditsValue = Number(userProfile.credits ?? 0);
      let connections = 0;
      let userInviteCode = null;
      let userReferralStats = { totalReferrals: 0, totalCreditsEarned: 0 };
      try {
        const [
          allAchievements,
          userAchievements,
          fetchedCredits,
          connectionsData,
          fetchedInviteCode,
          fetchedReferralStats,
        ] = await Promise.all([
          db.getAchievements(),
          db.getUserAchievements(user.id),
          db.getUserCredits(user.id),
          db.getUserConnections(user.id, "accepted"), // Only count accepted connections
          db.getUserInviteCode(user.id),
          db.getReferralStats(user.id),
        ]);
        
        connections = connectionsData?.length || 0;
        userInviteCode = fetchedInviteCode;
        userReferralStats = fetchedReferralStats || {
          totalReferrals: 0,
          totalCreditsEarned: 0,
        };

        if (allAchievements && allAchievements.length > 0) {
          const earnedIds = new Set(
            userAchievements.map((ua) => ua.achievement_id)
          );

          // Calculate total stats from ALL achievements
          achievementsStats.totalCount = allAchievements.length;
          achievementsStats.earnedCount = allAchievements.filter((achievement) =>
            earnedIds.has(achievement.id)
          ).length;

          // Show first 4 achievements on profile, but keep all for the list page
          achievements = allAchievements.slice(0, 4).map((achievement) => ({
            id: achievement.id,
            name: achievement.name,
            icon: achievement.icon || "trophy",
            earned: earnedIds.has(achievement.id),
          }));
        }

        if (Number.isFinite(fetchedCredits)) {
          creditsValue = fetchedCredits;
        }
        setConnectionsCount(connections);
        setInviteCode(userInviteCode);
        setReferralStats(userReferralStats);
      } catch (achievementsError) {
        console.error("❌ Error loading achievements:", achievementsError);
      }

      if (userProfile) {
        // Fetch primary mix if exists
        let primaryMix = null;
        if (userProfile.primary_mix_id) {
          try {
            console.log("🔍 Loading primary mix with ID:", userProfile.primary_mix_id);
            const { supabase } = await import("../lib/supabase");
            const { data: mixData, error: mixError } = await supabase
                  .from("mixes")
                  .select("*")
                  .eq("id", userProfile.primary_mix_id)
              .single();
            
            if (mixError) {
              console.error("❌ Error fetching primary mix:", mixError);
              console.error("❌ Error details:", {
                code: mixError.code,
                message: mixError.message,
                hint: mixError.hint,
                primary_mix_id: userProfile.primary_mix_id,
              });
              
              // If mix doesn't exist (PGRST116), clear the invalid primary_mix_id
              if (mixError.code === "PGRST116" || mixError.message?.includes("No rows")) {
                console.warn("⚠️ Primary mix not found, clearing invalid primary_mix_id");
                try {
                  const { db } = await import("../lib/supabase");
                  await db.setPrimaryMix(userProfile.id, null);
                  console.log("✅ Cleared invalid primary_mix_id");
                } catch (clearError) {
                  console.error("❌ Failed to clear invalid primary_mix_id:", clearError);
                }
              }
            } else if (!mixData) {
              console.warn("⚠️ Primary mix ID exists but no mix data returned");
            } else {
              console.log("✅ Successfully loaded primary mix:", mixData.title);
              const durationSeconds = extractDurationSeconds(mixData);
              // Generate waveform based on safe duration
              const waveform = generateGenreWaveform(
                durationSeconds || 300,
                mixData.genre || "electronic",
                16
              );

              const artistName =
                userProfile.dj_name ||
                userProfile.full_name ||
                `${userProfile.first_name || ""} ${
                  userProfile.last_name || ""
                }`.trim() ||
                (typeof mixData.artist === "string" &&
                mixData.artist.trim().length > 0
                  ? mixData.artist.trim()
                  : null) ||
                "Unknown Artist";

              primaryMix = {
                id: mixData.id,
                user_id: mixData.user_id,
                title: mixData.title || "Audio ID",
                artist: artistName,
                genre: mixData.genre || "Electronic",
                duration: durationSeconds,
                durationSeconds,
                durationMillis: durationSeconds
                  ? durationSeconds * 1000
                  : null,
                audioUrl: mixData.file_url,
                file_url: mixData.file_url,
                artwork_url: mixData.artwork_url || null,
                image:
                  mixData.artwork_url ||
                  userProfile.profile_image_url ||
                  null,
                description: mixData.description || "",
                waveform,
                created_at: mixData.created_at || null,
                user: {
                  id: userProfile.id,
                  dj_name: userProfile.dj_name,
                  full_name: userProfile.full_name,
                  first_name: userProfile.first_name,
                  last_name: userProfile.last_name,
                  bio: userProfile.bio,
                  profile_image_url: userProfile.profile_image_url,
                  username: userProfile.username,
                  status_message: userProfile.status_message,
                },
              };
            }
          } catch (mixError) {
            console.error("❌ Exception loading primary mix:", mixError);
            console.error("❌ Stack:", mixError.stack);
          }
        } else {
          console.log("ℹ️ No primary_mix_id set in user profile");
          
          // Auto-set Audio ID if user has mixes but no primary_mix_id
          try {
            const { supabase } = await import("../lib/supabase");
            // Get all mixes (including private ones) for setting Audio ID
            const { data: userMixes, error: mixesError } = await supabase
              .from("mixes")
              .select("*")
              .eq("user_id", userProfile.id)
              .order("created_at", { ascending: false })
              .limit(1);
            
            if (mixesError) {
              console.error("❌ Error fetching user mixes:", mixesError);
            } else if (userMixes && userMixes.length > 0) {
              // Set the most recent mix as Audio ID
              const mostRecentMix = userMixes[0]; // Already ordered by created_at DESC
              console.log("🔄 Auto-setting Audio ID to most recent mix:", mostRecentMix.id);
              
              try {
                const { db } = await import("../lib/supabase");
                await db.setPrimaryMix(userProfile.id, mostRecentMix.id);
                console.log("✅ Auto-set Audio ID to:", mostRecentMix.title);
                
                // Reload the mix data now that we've set it
                const { data: mixData } = await supabase
                  .from("mixes")
                  .select("*")
                  .eq("id", mostRecentMix.id)
                  .single();
                
                if (mixData) {
                  const durationSeconds = extractDurationSeconds(mixData);
                  const waveform = generateGenreWaveform(
                    durationSeconds || 300,
                    mixData.genre || "electronic",
                    16
                  );

                  const artistName =
                    userProfile.dj_name ||
                    userProfile.full_name ||
                    `${userProfile.first_name || ""} ${
                      userProfile.last_name || ""
                    }`.trim() ||
                    (typeof mixData.artist === "string" &&
                    mixData.artist.trim().length > 0
                      ? mixData.artist.trim()
                      : null) ||
                    "Unknown Artist";

                  primaryMix = {
                    id: mixData.id,
                    user_id: mixData.user_id,
                    title: mixData.title || "Audio ID",
                    artist: artistName,
                    genre: mixData.genre || "Electronic",
                    duration: durationSeconds,
                    durationSeconds,
                    durationMillis: durationSeconds
                      ? durationSeconds * 1000
                      : null,
                    audioUrl: mixData.file_url,
                    file_url: mixData.file_url,
                    artwork_url: mixData.artwork_url || null,
                    image:
                      mixData.artwork_url ||
                      userProfile.profile_image_url ||
                      null,
                    description: mixData.description || "",
                    waveform,
                    created_at: mixData.created_at || null,
                    user: {
                      id: userProfile.id,
                      dj_name: userProfile.dj_name,
                      full_name: userProfile.full_name,
                      first_name: userProfile.first_name,
                      last_name: userProfile.last_name,
                      bio: userProfile.bio,
                      profile_image_url: userProfile.profile_image_url,
                      username: userProfile.username,
                      status_message: userProfile.status_message,
                    },
                  };
                }
              } catch (autoSetError) {
                console.error("❌ Error auto-setting Audio ID:", autoSetError);
              }
            }
          } catch (mixesError) {
            console.error("❌ Error checking user mixes:", mixesError);
          }
        }

        // Build display name with better fallbacks
        const getDisplayName = () => {
          if (userProfile.dj_name) return userProfile.dj_name;
          if (userProfile.full_name) return userProfile.full_name;
          if (userProfile.username) {
            return userProfile.username.charAt(0).toUpperCase() + userProfile.username.slice(1);
          }
          return "DJ";
        };

        const profileData = {
          id: userProfile.id,
          name: getDisplayName(),
          username: userProfile.username
            ? `@${userProfile.username}`
            : `@${(userProfile.dj_name || userProfile.full_name || "dj")
                .toLowerCase()
                .replace(/\s+/g, "")}`,
          gigsCompleted: userProfile.gigs_completed || 0,
          credits: Number.isFinite(creditsValue) ? creditsValue : 0,
          bio: userProfile.bio || "",
          statusMessage: userProfile.status_message || "",
          location: userProfile.city || "Location not set",
          genres: userProfile.genres || [],
          profileImage: userProfile.profile_image_url
            ? { uri: userProfile.profile_image_url }
            : null,
          socialLinks: {
            instagram: userProfile.instagram || null,
            soundcloud: userProfile.soundcloud || null,
            tiktok: userProfile.tiktok || null,
            youtube: userProfile.youtube || null,
            portfolio_url: userProfile.portfolio_url || null,
          },
          audioId: primaryMix || null,
          isVerified: userProfile.is_verified || false,
          joinDate:
            userProfile.join_date || userProfile.created_at || "Unknown",
          recentGigs: recentGigs,
          achievements: achievements,
          achievementsStats: achievementsStats,
        };
        setProfile(profileData);
        profileCache.set(user.id, {
          profile: profileData,
          connectionsCount: connections,
          inviteCode: userInviteCode,
          referralStats: userReferralStats,
        });
        console.log("✅ Profile loaded from database");
        console.log(
          `📊 Loaded ${recentGigs.length} gigs and ${achievements.length} achievements`
        );
        console.log(
          `🎵 Audio ID: ${primaryMix ? `Set (${primaryMix.title})` : "Not set"}`
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

  const handleSocialLinkPress = (platform, link) => {
    // Check if link exists and is not empty
    if (!link || link.trim() === "") {
      Alert.alert("No Link", `No ${platform} link available`);
      return;
    }

    let url;
    switch (platform) {
      case "instagram":
      case "soundcloud":
      case "tiktok":
      case "youtube":
      case "portfolio_url":
        // Link is already a full URL, use it directly
        url = link;
        break;
      default:
        return;
    }

    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open link");
    });
  };

  // Generate referral link
  const getReferralLink = () => {
    if (!inviteCode) return null;
    // Keep the invite-code URL format; server should redirect to app page
    return `https://rhood.io/invite/${inviteCode}`;
  };

  // Generate referral share message
  const getReferralShareMessage = () => {
    if (!inviteCode) return "";
    return `🎧 Join R/HOOD - The DJ Community!\n\n🎁 Use my invite code when you sign up: ${inviteCode}\n\nYou'll help me earn credits and I'll help you get started! 🎵\n\n📱 Download R/HOOD app: https://rhood.io/download`;
  };

  // Copy referral link
  const handleCopyLink = async () => {
    const link = getReferralLink();
    if (!link) {
      Alert.alert("Error", "Invite code not available");
      return;
    }
    try {
      await Clipboard.setStringAsync(link);
      HapticPatterns.success();
      Alert.alert("Copied!", "Referral link copied to clipboard");
    } catch (error) {
      console.error("Failed to copy link:", error);
      Alert.alert("Error", "Failed to copy link");
    }
  };

  // Share via WhatsApp
  const handleShareWhatsApp = async () => {
    const message = getReferralShareMessage();
    if (!message) {
      Alert.alert("Error", "Invite code not available");
      return;
    }

    try {
      // Try WhatsApp app URL scheme first
      const whatsappUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
      const canOpenWhatsApp = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpenWhatsApp) {
        try {
          await Linking.openURL(whatsappUrl);
          return; // Success, exit early
        } catch (openError) {
          console.log("WhatsApp app URL failed, trying web fallback:", openError);
          // Continue to web fallback
        }
      }

      // Fallback to web WhatsApp (works in browser)
        const webUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
      try {
        const canOpenWeb = await Linking.canOpenURL(webUrl);
        if (canOpenWeb) {
        await Linking.openURL(webUrl);
          return; // Success
        }
      } catch (webError) {
        console.log("Web WhatsApp URL failed:", webError);
      }

      // Final fallback: Use native share sheet
      // This will show WhatsApp if installed, or other sharing options
      const shareResult = await Share.share({
        message: message,
        title: "Invite a DJ to R/HOOD",
      });

      if (shareResult.action === Share.sharedAction) {
        // User successfully shared
        return;
      } else if (shareResult.action === Share.dismissedAction) {
        // User dismissed the share sheet
        return;
      }
    } catch (error) {
      console.error("Error sharing via WhatsApp:", error);
      // If all methods fail, show a helpful error message
      Alert.alert(
        "Share Error",
        "Could not open WhatsApp. Please make sure WhatsApp is installed, or use the 'More' option to share via other apps."
      );
    }
  };

  // Share via Instagram DM
  const handleShareInstagram = async () => {
    const message = getReferralShareMessage();
    if (!message) {
      Alert.alert("Error", "Invite code not available");
      return;
    }
    // Instagram doesn't support direct message sharing via URL scheme
    // Use native share sheet instead
    try {
      await Share.share({
        message: message,
        title: "Invite a DJ to R/HOOD",
      });
    } catch (error) {
      console.error("Error sharing via Instagram:", error);
      Alert.alert("Error", "Could not share");
    }
  };

  // Share via SMS
  const handleShareSMS = async () => {
    const message = getReferralShareMessage();
    if (!message) {
      Alert.alert("Error", "Invite code not available");
      return;
    }
    const url = `sms:?body=${encodeURIComponent(message)}`;
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.error("Error sharing via SMS:", error);
      Alert.alert("Error", "Could not open SMS");
    }
  };

  // Share via native share sheet
  const handleShareNative = async () => {
    const message = getReferralShareMessage();
    const link = getReferralLink();
    if (!message || !link) {
      Alert.alert("Error", "Invite code not available");
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
          user_id: user.id, // User ID for navigation
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
      Alert.alert("Error", "Could not play audio");
    }
  };

  const handleGigPress = (gig) => {
    onNavigate && onNavigate("gig-detail", { gigId: gig.id });
  };

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
            <Text style={styles.connectionsTitle}>Connections</Text>
            <Text style={styles.connectionsCount}>
              {connectionsCount} {connectionsCount === 1 ? "connection" : "connections"}
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
              <Text style={styles.ratingText}>{profile.rating}</Text>
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
          <Text style={styles.sectionTitle}>SOCIAL LINKS</Text>
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
    paddingBottom: 120, // Extra padding to prevent content from being hidden behind play bar
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
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  headerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%)",
  },
  headerButtonText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(75, 100%, 60%)",
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
  profileImageContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 16,
    color: "hsl(0, 0%, 70%)",
    marginBottom: 8,
  },
  profileStatus: {
    fontSize: 14,
    color: "hsl(75, 100%, 70%)",
    marginBottom: 12,
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
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Helvetica Neue",
  },
  referralSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  inviteCodeCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  referralLinkCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  referralLinkHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  referralLinkTitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
  referralLinkContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "hsl(0, 0%, 5%)",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  referralLinkText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    marginRight: 8,
  },
  copyLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6,
  },
  copyLinkButtonText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
  },
  shareOptionsContainer: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  shareOptionsTitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 70%)",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  shareButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  shareButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "hsl(0, 0%, 5%)",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    gap: 6,
  },
  shareButtonText: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
  },
  inviteCodeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  inviteCodeTitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
  inviteCodeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "hsl(0, 0%, 5%)",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%)",
  },
  inviteCodeText: {
    fontSize: 20,
    fontFamily: "TS Block Bold",
    color: "hsl(75, 100%, 60%)",
    letterSpacing: 2,
  },
  inviteCodeDescription: {
    fontSize: 12,
    color: "hsl(0, 0%, 60%)",
    fontFamily: "Helvetica Neue",
    lineHeight: 16,
  },
  referralStatsCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  referralStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  referralStatItem: {
    flex: 1,
    alignItems: "center",
  },
  referralStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: "hsl(0, 0%, 15%)",
  },
  referralStatNumber: {
    fontSize: 24,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  referralStatLabel: {
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
    fontFamily: "TS Block Bold",
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
    fontFamily: "TS Block Bold",
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
    fontFamily: "TS Block Bold",
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
    marginTop: 0,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  achievementsHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  achievementsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "hsl(75, 100%, 60%, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  achievementsInfo: {
    flex: 1,
  },
  achievementsTitle: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  achievementsCount: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Helvetica Neue",
  },
  connectionsContainer: {
    marginTop: 0,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  connectionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  connectionsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "hsl(75, 100%, 60%, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  connectionsInfo: {
    flex: 1,
  },
  connectionsTitle: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    fontWeight: "700",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  connectionsCount: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Helvetica Neue",
  },
  invitePanelContainer: {
    marginTop: 0,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  invitePanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  invitePanelIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "hsl(75, 100%, 60%, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  invitePanelInfo: {
    flex: 1,
  },
  invitePanelTitle: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  invitePanelCount: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Helvetica Neue",
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
  // Empty Audio ID Styles
  emptyAudioCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
  emptyAudioContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyAudioTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginTop: 16,
    marginBottom: 8,
    fontFamily: "TS Block Bold",
  },
  emptyAudioSubtitle: {
    fontSize: 14,
    color: "hsl(0, 0%, 60%)",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  uploadMixButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  uploadMixButtonText: {
    color: "hsl(0, 0%, 0%)",
    fontSize: 16,
    fontWeight: "600",
  },
});
