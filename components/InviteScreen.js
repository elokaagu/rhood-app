import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Share,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { db } from "../lib/supabase";
import { HapticPatterns } from "../lib/haptics";

export default function InviteScreen({ user, onBack }) {
  const insets = useSafeAreaInsets();
  const [inviteCode, setInviteCode] = useState(null);
  const [referralStats, setReferralStats] = useState({
    totalReferrals: 0,
    totalCreditsEarned: 0,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    loadInviteData();
  }, [user?.id]);

  const loadInviteData = async () => {
    if (!user?.id) {
      setLoading(false);
      setLoadError(null);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);
      const [fetchedInviteCode, fetchedReferralStats] = await Promise.all([
        db.getUserInviteCode(user.id),
        db.getReferralStats(user.id),
      ]);

      setInviteCode(fetchedInviteCode);
      setReferralStats(fetchedReferralStats || {
        totalReferrals: 0,
        totalCreditsEarned: 0,
      });
    } catch (error) {
      console.error("Error loading invite data:", error);
      setLoadError(
        "Couldn’t load your invite. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const ensureInviteReady = () => {
    if (!inviteCode) {
      Alert.alert("Error", "Invite code not available");
      return false;
    }
    return true;
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
    return `Join R/HOOD - The DJ Community\n\nUse my invite code when you sign up: ${inviteCode}\n\nYou'll help me earn credits and I'll help you get started.\n\nDownload R/HOOD app: https://rhood.io/download`;
  };

  // Copy invite code
  const handleCopyCode = async () => {
    if (!ensureInviteReady()) return;
    try {
      await Clipboard.setStringAsync(inviteCode);
      HapticPatterns.success();
      Alert.alert("Copied!", "Invite code copied to clipboard");
    } catch (error) {
      console.error("Failed to copy:", error);
      Alert.alert("Error", "Failed to copy invite code");
    }
  };

  // Copy referral link
  const handleCopyLink = async () => {
    if (!ensureInviteReady()) return;
    const link = getReferralLink();
    if (!link) return;
    try {
      await Clipboard.setStringAsync(link);
      HapticPatterns.success();
      Alert.alert("Copied!", "Referral link copied to clipboard");
    } catch (error) {
      console.error("Failed to copy link:", error);
      Alert.alert("Error", "Failed to copy link");
    }
  };

  /** Opens system share sheet with subject line (Mail and other apps can use it). Not a dedicated mailto: composer. */
  const handleShareWithEmailSubject = async () => {
    if (!ensureInviteReady()) return;
    const message = getReferralShareMessage();
    const link = getReferralLink();
    if (!message || !link) return;

    const subject = "Join R/HOOD - The DJ Community";
    const body = `${message}\n\n${link}`;

    try {
      await Share.share({
        message: body,
        subject,
        title: subject,
      });
    } catch (error) {
      console.error("Error opening share sheet (email subject):", error);
      Alert.alert("Error", "Could not open share sheet. Please try again.");
    }
  };

  // Share via SMS
  const handleShareSMS = async () => {
    if (!ensureInviteReady()) return;
    const message = getReferralShareMessage();
    if (!message) return;
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
    if (!ensureInviteReady()) return;
    const message = getReferralShareMessage();
    const link = getReferralLink();
    if (!message || !link) return;
    try {
      await Share.share({
        message: `${message}\n\n${link}`,
        title: "Invite a DJ to R/HOOD",
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header — safe area replaces fixed paddingTop */}
      <View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, 12) + 8 },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            HapticPatterns.backButton();
            onBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite a DJ</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
      >
        {loadError ? (
          <View style={styles.errorBanner}>
            <Ionicons
              name="warning-outline"
              size={22}
              color="hsl(45, 100%, 55%)"
            />
            <Text style={styles.errorBannerText}>{loadError}</Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => {
                HapticPatterns.itemPress();
                loadInviteData();
              }}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Invite Code Card */}
        <View style={styles.inviteCodeCard}>
          <View style={styles.inviteCodeHeader}>
            <Ionicons name="gift" size={20} color="hsl(75, 100%, 60%)" />
            <Text style={styles.inviteCodeTitle}>Your Invite Code</Text>
          </View>
          <TouchableOpacity
            style={styles.inviteCodeContainer}
            onPress={handleCopyCode}
          >
            {loading ? (
              <View style={styles.codeLoadingRow}>
                <ActivityIndicator color="hsl(75, 100%, 60%)" />
                <Text style={styles.inviteCodeTextMuted}>Loading…</Text>
              </View>
            ) : (
              <Text style={styles.inviteCodeText}>
                {inviteCode || "Not available"}
              </Text>
            )}
            <Ionicons
              name="copy-outline"
              size={18}
              color="hsl(0, 0%, 70%)"
            />
          </TouchableOpacity>
          <Text style={styles.inviteCodeDescription}>
            Share this code with friends. When they sign up, you'll earn 25
            credits!
          </Text>
        </View>

        {/* Referral Link Card */}
        <View style={styles.referralLinkCard}>
          <View style={styles.referralLinkHeader}>
            <Ionicons name="link" size={20} color="hsl(75, 100%, 60%)" />
            <Text style={styles.referralLinkTitle}>Shareable Link</Text>
          </View>
          <TouchableOpacity
            style={styles.referralLinkContainer}
            onPress={handleCopyLink}
          >
            {loading ? (
              <View style={styles.codeLoadingRow}>
                <ActivityIndicator size="small" color="hsl(75, 100%, 60%)" />
                <Text style={styles.referralLinkTextMuted} numberOfLines={1}>
                  Loading…
                </Text>
              </View>
            ) : (
              <Text style={styles.referralLinkText} numberOfLines={1}>
                {getReferralLink() || "Not available"}
              </Text>
            )}
            <Ionicons
              name="copy-outline"
              size={18}
              color="hsl(0, 0%, 70%)"
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.copyLinkButton}
            onPress={handleCopyLink}
          >
            <Ionicons name="copy" size={16} color="hsl(0, 0%, 0%)" />
            <Text style={styles.copyLinkButtonText}>Copy Link</Text>
          </TouchableOpacity>
        </View>

        {/* Share Options */}
        <View style={styles.shareOptionsContainer}>
          <Text style={styles.shareOptionsTitle}>Share via</Text>
          <View style={styles.shareButtonsRow}>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShareSMS}
            >
              <Ionicons name="chatbubble" size={24} color="hsl(75, 100%, 60%)" />
              <Text style={styles.shareButtonText}>SMS</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShareWithEmailSubject}
              accessibilityLabel="Share with email subject"
            >
              <Ionicons name="mail" size={24} color="hsl(75, 100%, 60%)" />
              <Text style={styles.shareButtonText}>Email</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShareNative}
            >
              <Ionicons name="share-social" size={24} color="hsl(0, 0%, 70%)" />
              <Text style={styles.shareButtonText}>More</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.shareOptionsHint}>
            Use "More" to share via WhatsApp, Instagram, or other apps
          </Text>
        </View>

        {/* Referral Stats */}
        <View style={styles.referralStatsCard}>
          <View style={styles.referralStatsRow}>
            <View style={styles.referralStatItem}>
              <Text style={styles.referralStatNumber}>
                {referralStats.totalReferrals}
              </Text>
              <Text style={styles.referralStatLabel}>Referrals</Text>
            </View>
            <View style={styles.referralStatDivider} />
            <View style={styles.referralStatItem}>
              <Text style={styles.referralStatNumber}>
                {referralStats.totalCreditsEarned}
              </Text>
              <Text style={styles.referralStatLabel}>Credits Earned</Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "hsl(45, 30%, 12%)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "hsl(45, 60%, 30%)",
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 85%)",
    lineHeight: 18,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    fontWeight: "700",
    color: "hsl(0, 0%, 0%)",
  },
  codeLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  inviteCodeTextMuted: {
    fontSize: 15,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 50%)",
  },
  referralLinkTextMuted: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 50%)",
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    padding: 20,
    paddingBottom: 200, // Increased to account for audio player (120px position + ~70px height + spacing)
  },
  inviteCodeCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
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
  shareOptionsHint: {
    fontSize: 11,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 50%)",
    marginTop: 12,
    textAlign: "center",
    fontStyle: "italic",
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
});

