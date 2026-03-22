// components/AdminApplicationsScreen.js
// Admin interface for reviewing and updating application status

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { HapticPatterns } from "../lib/haptics";
import { COLORS, TYPOGRAPHY, SPACING } from "../lib/sharedStyles";
import ProgressiveImage from "./ProgressiveImage";
import { sendApplicationStatusNotification } from "../lib/notificationService";

export default function AdminApplicationsScreen({ user, onNavigate }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  /** @type {[{ id: string, status: 'approved' | 'rejected' }] | null} */
  const [updating, setUpdating] = useState(null);

  const goBack = useCallback(() => {
    HapticPatterns.backButton();
    onNavigate?.("back");
  }, [onNavigate]);

  const loadApplications = useCallback(async () => {
    if (!user?.id) {
      setApplications([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase.rpc(
        "get_applications_for_review",
        {
          organizer_user_id: user.id,
        }
      );

      if (error) {
        console.error("Error loading applications:", error);
        Alert.alert("Error", "Failed to load applications");
        return;
      }

      setApplications(data || []);
    } catch (error) {
      console.error("Error loading applications:", error);
      Alert.alert("Error", "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      loadApplications();
    } else {
      setApplications([]);
      setLoading(false);
    }
  }, [user?.id, loadApplications]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApplications();
    setRefreshing(false);
  };

  const updateApplicationStatus = async (applicationId, newStatus) => {
    try {
      setUpdating({ id: applicationId, status: newStatus });

      const application = applications.find(
        (app) => app.application_id === applicationId
      );

      const { error } = await supabase.rpc("update_application_status", {
        application_id: applicationId,
        new_status: newStatus,
      });

      if (error) {
        console.error("Error updating application status:", error);
        Alert.alert("Error", "Failed to update application status");
        return;
      }

      // Push + email from client. In-app row is created by notify_application_status_change
      // (see database/add-application-email-notifications.sql) — skip duplicate in-app insert.
      let applicantUserId = application?.applicant_user_id;
      if (!applicantUserId) {
        const { data: appData } = await supabase
          .from("applications")
          .select("user_id")
          .eq("id", applicationId)
          .single();
        applicantUserId = appData?.user_id;
      }

      if (applicantUserId) {
        try {
          const displayName =
            application?.applicant_name?.trim() || "Applicant";
          await sendApplicationStatusNotification(
            applicantUserId,
            application?.opportunity_title ?? "Opportunity",
            newStatus,
            applicationId,
            application?.applicant_email || undefined,
            displayName,
            { skipInApp: true }
          );
        } catch (notificationError) {
          console.error("Error sending notifications:", notificationError);
        }
      }

      await loadApplications();

      Alert.alert(
        "Success",
        `Application ${
          newStatus === "approved" ? "approved" : "rejected"
        } successfully. The applicant will be notified in-app, and by push or email when available.`
      );
    } catch (error) {
      console.error("Error updating application status:", error);
      Alert.alert("Error", "Failed to update application status");
    } finally {
      setUpdating(null);
    }
  };

  const handleApprove = (applicationId) => {
    Alert.alert(
      "Approve Application",
      "Are you sure you want to approve this application? The applicant will be notified.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Approve",
          onPress: () => updateApplicationStatus(applicationId, "approved"),
        },
      ]
    );
  };

  const handleReject = (applicationId) => {
    Alert.alert(
      "Reject Application",
      "Are you sure you want to reject this application? The applicant will be notified.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: () => updateApplicationStatus(applicationId, "rejected"),
        },
      ]
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "hsl(120, 100%, 50%)";
      case "rejected":
        return "hsl(0, 100%, 50%)";
      case "pending":
        return "hsl(48, 85%, 55%)";
      default:
        return "hsl(0, 0%, 50%)";
    }
  };

  const renderApplication = ({ item: application }) => {
    const isBoosted =
      application.is_boosted &&
      application.boost_expires_at &&
      new Date(application.boost_expires_at) > new Date();

    const getTimeRemaining = () => {
      if (!isBoosted) return null;
      const expires = new Date(application.boost_expires_at);
      const now = new Date();
      const diff = expires - now;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      if (hours > 0) return `${hours}h ${minutes}m`;
      return `${minutes}m`;
    };

    const isBusy = updating?.id === application.application_id;
    const isApproving = isBusy && updating.status === "approved";
    const isRejecting = isBusy && updating.status === "rejected";

    return (
      <View
        style={[
          styles.applicationCard,
          isBoosted && styles.boostedCard,
        ]}
      >
        <View style={styles.applicationHeader}>
          <View style={styles.applicantInfo}>
            <ProgressiveImage
              source={{ uri: application.applicant_profile_url }}
              style={styles.profileImage}
              placeholder={<View style={styles.profileImagePlaceholder} />}
              contentFit="cover"
            />
            <View style={styles.applicantDetails}>
              <View style={styles.applicantNameRow}>
                <Text style={styles.applicantName}>
                  {application.applicant_name}
                </Text>
                {isBoosted && (
                  <View style={styles.boostBadge}>
                    <Ionicons name="flash" size={12} color="hsl(0, 0%, 0%)" />
                    <Text style={styles.boostBadgeText}>BOOSTED</Text>
                  </View>
                )}
              </View>
              <Text style={styles.opportunityTitle}>
                {application.opportunity_title}
              </Text>
              <Text style={styles.appliedDate}>
                Applied: {formatDate(application.applied_at)}
              </Text>
              {isBoosted && (
                <Text style={styles.boostTimeRemaining}>
                  Boost expires in: {getTimeRemaining()}
                </Text>
              )}
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(application.application_status) },
            ]}
          >
            <Text style={styles.statusText}>
              {application.application_status.toUpperCase()}
            </Text>
          </View>
        </View>

        {application.application_message ? (
          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>Application Message:</Text>
            <Text style={styles.messageText}>
              {application.application_message}
            </Text>
          </View>
        ) : null}

        {application.application_status === "pending" ? (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApprove(application.application_id)}
              disabled={isBusy}
            >
              {isApproving ? (
                <ActivityIndicator size="small" color="hsl(0, 0%, 100%)" />
              ) : (
                <Ionicons name="checkmark" size={20} color="hsl(0, 0%, 100%)" />
              )}
              <Text style={styles.actionButtonText}>
                {isApproving ? "Approving..." : "Approve"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleReject(application.application_id)}
              disabled={isBusy}
            >
              {isRejecting ? (
                <ActivityIndicator size="small" color="hsl(0, 0%, 100%)" />
              ) : (
                <Ionicons name="close" size={20} color="hsl(0, 0%, 100%)" />
              )}
              <Text style={styles.actionButtonText}>
                {isRejecting ? "Rejecting..." : "Reject"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  const listEmpty = (
    <View style={styles.emptyContainer}>
      <Ionicons name="document-outline" size={64} color="hsl(0, 0%, 50%)" />
      <Text style={styles.emptyTitle}>No Applications</Text>
      <Text style={styles.emptySubtitle}>
        No applications have been submitted for your opportunities yet.
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={goBack}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Application Reviews</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading applications...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={goBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Application Reviews</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.gigsButton}
            onPress={() => onNavigate?.("brand-gigs-portal")}
          >
            <Ionicons name="calendar" size={20} color={COLORS.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Ionicons name="refresh" size={24} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={applications}
        keyExtractor={(item) => item.application_id}
        renderItem={renderApplication}
        contentContainerStyle={
          applications.length === 0
            ? styles.flatListContentEmpty
            : styles.flatListContent
        }
        ListEmptyComponent={listEmpty}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backButton: {
    padding: SPACING.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: TYPOGRAPHY["2xl"],
    fontFamily: TYPOGRAPHY.brand,
    color: COLORS.textPrimary,
    marginLeft: SPACING.md,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  gigsButton: {
    padding: SPACING.sm,
  },
  refreshButton: {
    padding: SPACING.sm,
  },
  flatListContent: {
    padding: SPACING.md,
    paddingBottom: SPACING["3xl"],
  },
  flatListContentEmpty: {
    flexGrow: 1,
    padding: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.base,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.primary,
  },
  applicationCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  boostedCard: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: COLORS.backgroundTertiary,
  },
  applicantNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: 4,
  },
  boostBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  boostBadgeText: {
    fontSize: TYPOGRAPHY.xs,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.background,
    letterSpacing: 0.5,
  },
  boostTimeRemaining: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 4,
    fontStyle: "italic",
  },
  applicationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.sm + 4,
  },
  applicantInfo: {
    flexDirection: "row",
    flex: 1,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: SPACING.sm + 4,
  },
  profileImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: COLORS.borderLight,
  },
  applicantDetails: {
    flex: 1,
  },
  applicantName: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  opportunityTitle: {
    fontSize: TYPOGRAPHY.base,
    color: COLORS.primary,
    marginBottom: 4,
  },
  appliedDate: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textTertiary,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textPrimary,
  },
  messageContainer: {
    marginBottom: SPACING.md,
  },
  messageLabel: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  messageText: {
    fontSize: TYPOGRAPHY.base,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: "row",
    gap: SPACING.sm + 4,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.sm + 4,
    borderRadius: 8,
    gap: SPACING.sm,
  },
  approveButton: {
    backgroundColor: "hsl(120, 100%, 40%)",
  },
  rejectButton: {
    backgroundColor: "hsl(0, 100%, 40%)",
  },
  actionButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textPrimary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
    minHeight: 280,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY["2xl"],
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.lg,
    color: COLORS.textTertiary,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: SPACING.lg,
  },
});
