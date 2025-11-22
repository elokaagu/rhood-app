// components/AdminApplicationsScreen.js
// Admin interface for reviewing and updating application status

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import ProgressiveImage from "./ProgressiveImage";
import { sendApplicationStatusNotification } from "../lib/notificationService";

export default function AdminApplicationsScreen({ user, onNavigate }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  0;
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      setLoading(true);

      // Call the database function to get applications for review
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
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadApplications();
    setRefreshing(false);
  };

  const updateApplicationStatus = async (applicationId, newStatus) => {
    try {
      setUpdating(applicationId);

      // Get application details before updating (to get applicant email)
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

      // Send notifications (push, in-app, and email) to the applicant
      // Note: In-app notification is also created by database trigger, but we send it here for consistency
      if (
        application &&
        application.applicant_email &&
        application.applicant_name
      ) {
        try {
          // Get user_id from the application
          const { data: appData, error: appError } = await supabase
            .from("applications")
            .select("user_id")
            .eq("id", applicationId)
            .single();

          if (appData && appData.user_id) {
            await sendApplicationStatusNotification(
              appData.user_id,
              application.opportunity_title,
              newStatus,
              applicationId,
              application.applicant_email,
              application.applicant_name
            );
          }
        } catch (notificationError) {
          console.error("Error sending notifications:", notificationError);
          // Don't fail the whole operation if notifications fail
          // The in-app notification will still be sent via the database trigger
        }
      }

      // Refresh applications list
      await loadApplications();

      Alert.alert(
        "Success",
        `Application ${
          newStatus === "approved" ? "approved" : "rejected"
        } successfully. The applicant will be notified via email and in-app notification.`
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
    return new Date(dateString).toLocaleDateString("en-US", {
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
        return "hsl(60, 100%, 50%)";
      default:
        return "hsl(0, 0%, 50%)";
    }
  };

  const renderApplication = (application) => {
    const isBoosted = application.is_boosted && 
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

    return (
      <View key={application.application_id} style={[
        styles.applicationCard,
        isBoosted && styles.boostedCard
      ]}>
        <View style={styles.applicationHeader}>
          <View style={styles.applicantInfo}>
            <ProgressiveImage
              source={{ uri: application.applicant_profile_url }}
              style={styles.profileImage}
              placeholderStyle={styles.profileImagePlaceholder}
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

      {application.application_message && (
        <View style={styles.messageContainer}>
          <Text style={styles.messageLabel}>Application Message:</Text>
          <Text style={styles.messageText}>
            {application.application_message}
          </Text>
        </View>
      )}

      {application.application_status === "pending" && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(application.application_id)}
            disabled={updating === application.application_id}
          >
            <Ionicons name="checkmark" size={20} color="hsl(0, 0%, 100%)" />
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleReject(application.application_id)}
            disabled={updating === application.application_id}
          >
            <Ionicons name="close" size={20} color="hsl(0, 0%, 100%)" />
            <Text style={styles.actionButtonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => onNavigate && onNavigate("back")}
          >
            <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Application Reviews</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading applications...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => onNavigate && onNavigate("back")}
        >
          <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Application Reviews</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.gigsButton}
            onPress={() => onNavigate && onNavigate("brand-gigs-portal")}
          >
            <Ionicons name="calendar" size={20} color="hsl(75, 100%, 60%)" />
          </TouchableOpacity>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={onRefresh}
          disabled={refreshing}
        >
          <Ionicons name="refresh" size={24} color="hsl(75, 100%, 60%)" />
        </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {applications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="document-outline"
              size={64}
              color="hsl(0, 0%, 50%)"
            />
            <Text style={styles.emptyTitle}>No Applications</Text>
            <Text style={styles.emptySubtitle}>
              No applications have been submitted for your opportunities yet.
            </Text>
          </View>
        ) : (
          applications.map(renderApplication)
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 8%)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 20%)",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginLeft: 16,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  gigsButton: {
    padding: 8,
  },
  refreshButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "hsl(0, 0%, 60%)",
  },
  applicationCard: {
    backgroundColor: "hsl(0, 0%, 12%)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
  },
  boostedCard: {
    borderColor: "hsl(75, 100%, 60%)",
    borderWidth: 2,
    backgroundColor: "hsl(0, 0%, 10%)",
  },
  applicantNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  boostBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  boostBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "hsl(0, 0%, 0%)",
    letterSpacing: 0.5,
  },
  boostTimeRemaining: {
    fontSize: 11,
    color: "hsl(75, 100%, 60%)",
    marginTop: 4,
    fontStyle: "italic",
  },
  applicationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  applicantInfo: {
    flexDirection: "row",
    flex: 1,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  profileImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "hsl(0, 0%, 20%)",
    justifyContent: "center",
    alignItems: "center",
  },
  applicantDetails: {
    flex: 1,
  },
  applicantName: {
    fontSize: 16,
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  opportunityTitle: {
    fontSize: 14,
    color: "hsl(75, 100%, 60%)",
    marginBottom: 4,
  },
  appliedDate: {
    fontSize: 12,
    color: "hsl(0, 0%, 60%)",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
  messageContainer: {
    marginBottom: 16,
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "hsl(0, 0%, 80%)",
    marginBottom: 8,
  },
  messageText: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  approveButton: {
    backgroundColor: "hsl(120, 100%, 40%)",
  },
  rejectButton: {
    backgroundColor: "hsl(0, 100%, 40%)",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: "hsl(0, 0%, 60%)",
    textAlign: "center",
    lineHeight: 24,
  },
});
