import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase, db } from "../lib/supabase";
import ProgressiveImage from "./ProgressiveImage";
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
} from "../lib/sharedStyles";

export default function BrandGigsPortal({ user, onBack }) {
  const [gigs, setGigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedGig, setSelectedGig] = useState(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [updating, setUpdating] = useState(null);

  useEffect(() => {
    loadGigs();
  }, [user?.id]);

  const loadGigs = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Get gigs where the opportunity was created by this user (brand)
      // Using RPC function for better performance and proper joins
      const { data, error } = await supabase.rpc("get_brand_gigs", {
        brand_user_id: user.id,
      });

      if (error) {
        // Fallback to direct query if RPC doesn't exist
        console.warn("RPC function not found, using direct query:", error);
        const { data: directData, error: directError } = await supabase
          .from("gigs")
          .select(`
            *,
            opportunities!inner(created_by, title, venue, location),
            user_profiles!gigs_dj_id_fkey(
              id,
              dj_name,
              profile_image_url
            )
          `)
          .eq("opportunities.created_by", user.id)
          .order("event_date", { ascending: false });

        if (directError) throw directError;
        setGigs(directData || []);
      } else {
        setGigs(data || []);
      }
    } catch (error) {
      console.error("Error loading gigs:", error);
      Alert.alert("Error", "Failed to load gigs");
      setGigs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadGigs();
  };

  const handleCompleteGig = (gig) => {
    setSelectedGig(gig);
    setRating(gig.dj_rating || 0);
    setShowRatingModal(true);
  };

  const handleSubmitRating = async () => {
    if (!selectedGig || rating === 0) {
      Alert.alert("Error", "Please select a rating");
      return;
    }

    try {
      setUpdating(selectedGig.id);

      // Update gig to completed status with rating
      await db.updateGig(selectedGig.id, {
        status: "completed",
        dj_rating: rating,
      });

      // Trigger achievement check for the DJ
      if (selectedGig.dj_id) {
        await db.checkAndAwardAchievements(selectedGig.dj_id);
      }

      Alert.alert(
        "Success",
        "Gig marked as completed and DJ rated. The DJ's profile has been updated."
      );

      setShowRatingModal(false);
      setSelectedGig(null);
      setRating(0);
      await loadGigs();
    } catch (error) {
      console.error("Error completing gig:", error);
      Alert.alert("Error", "Failed to complete gig");
    } finally {
      setUpdating(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "completed":
        return "hsl(75, 100%, 60%)";
      case "upcoming":
        return "hsl(45, 100%, 60%)";
      case "in_progress":
        return "hsl(200, 100%, 60%)";
      case "cancelled":
        return "hsl(0, 100%, 60%)";
      default:
        return "hsl(0, 0%, 50%)";
    }
  };

  const renderGig = (gig) => {
    // Handle both RPC format and direct query format
    const djName = gig.dj_name || gig.user_profiles?.dj_name || "Unknown DJ";
    const djImage = gig.dj_profile_image_url || gig.user_profiles?.profile_image_url;
    const canComplete = gig.status === "upcoming" || gig.status === "in_progress";

    return (
      <View key={gig.id} style={styles.gigCard}>
        <View style={styles.gigHeader}>
          <View style={styles.djInfo}>
            <ProgressiveImage
              source={djImage ? { uri: djImage } : null}
              style={styles.profileImage}
              placeholderStyle={styles.profileImagePlaceholder}
            />
            <View style={styles.djDetails}>
              <Text style={styles.djName}>{djName}</Text>
              <Text style={styles.gigName}>{gig.name}</Text>
              <Text style={styles.venue}>{gig.venue}</Text>
            </View>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(gig.status) },
            ]}
          >
            <Text style={styles.statusText}>
              {gig.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.gigDetails}>
          <View style={styles.detailRow}>
            <Ionicons
              name="calendar-outline"
              size={16}
              color={COLORS.textSecondary}
            />
            <Text style={styles.detailText}>
              {formatDate(gig.event_date)}
            </Text>
          </View>
          {gig.payment && (
            <View style={styles.detailRow}>
              <Ionicons
                name="cash-outline"
                size={16}
                color={COLORS.textSecondary}
              />
              <Text style={styles.detailText}>
                {gig.currency || "GBP"} {gig.payment}
              </Text>
            </View>
          )}
          {gig.dj_rating && (
            <View style={styles.detailRow}>
              <Ionicons name="star" size={16} color="hsl(45, 100%, 60%)" />
              <Text style={styles.detailText}>
                Rated: {gig.dj_rating.toFixed(1)}/5.0
              </Text>
            </View>
          )}
        </View>

        {canComplete && (
          <TouchableOpacity
            style={styles.completeButton}
            onPress={() => handleCompleteGig(gig)}
            disabled={updating === gig.id}
          >
            <Ionicons name="checkmark-circle" size={20} color={COLORS.background} />
            <Text style={styles.completeButtonText}>
              {updating === gig.id ? "Updating..." : "Mark as Completed"}
            </Text>
          </TouchableOpacity>
        )}

        {gig.status === "completed" && gig.dj_rating && (
          <View style={styles.completedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={COLORS.primary} />
            <Text style={styles.completedText}>
              Completed and rated {gig.dj_rating.toFixed(1)}/5.0
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Gigs</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading gigs...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>My Gigs</Text>
          <Text style={styles.headerSubtitle}>
            Manage your bookings and rate DJs
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        {gigs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="calendar-outline"
              size={64}
              color={COLORS.textTertiary}
            />
            <Text style={styles.emptyTitle}>No Gigs Yet</Text>
            <Text style={styles.emptyText}>
              Approved applications will appear here as gigs. You can mark them
              as completed and rate the DJ after the event.
            </Text>
          </View>
        ) : (
          gigs.map(renderGig)
        )}
      </ScrollView>

      {/* Rating Modal */}
      <Modal
        visible={showRatingModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Rate the DJ</Text>
            <Text style={styles.modalSubtitle}>
              How would you rate{" "}
              {selectedGig?.dj_name ||
                selectedGig?.user_profiles?.dj_name ||
                "this DJ"}
              ?
            </Text>

            <View style={styles.ratingContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={star <= rating ? "star" : "star-outline"}
                    size={40}
                    color={
                      star <= rating
                        ? "hsl(45, 100%, 60%)"
                        : COLORS.textTertiary
                    }
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.ratingText}>
              {rating > 0 ? `${rating}.0 / 5.0` : "Select a rating"}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowRatingModal(false);
                  setRating(0);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  rating === 0 && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmitRating}
                disabled={rating === 0 || updating === selectedGig?.id}
              >
                <Text style={styles.submitButtonText}>
                  {updating === selectedGig?.id ? "Updating..." : "Complete & Rate"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontFamily: "TS Block Bold",
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: TYPOGRAPHY.base,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: SPACING.xxl * 2,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontFamily: "TS Block Bold",
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.base,
    color: COLORS.textSecondary,
    textAlign: "center",
    paddingHorizontal: SPACING.xl,
  },
  gigCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gigHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  djInfo: {
    flexDirection: "row",
    flex: 1,
  },
  profileImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: SPACING.md,
  },
  profileImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.backgroundTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  djDetails: {
    flex: 1,
  },
  djName: {
    fontSize: TYPOGRAPHY.base,
    fontFamily: "TS Block Bold",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  gigName: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.primary,
    marginBottom: 2,
  },
  venue: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
  },
  statusText: {
    fontSize: TYPOGRAPHY.xs,
    fontFamily: "TS Block Bold",
    color: COLORS.background,
  },
  gigDetails: {
    marginBottom: SPACING.md,
    gap: SPACING.xs,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  detailText: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textSecondary,
  },
  completeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
  },
  completeButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontFamily: "TS Block Bold",
    color: COLORS.background,
  },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${COLORS.primary}20`,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  completedText: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.primary,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  modalContainer: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontFamily: "TS Block Bold",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    fontSize: TYPOGRAPHY.base,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.xl,
  },
  ratingContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  starButton: {
    padding: SPACING.xs,
  },
  ratingText: {
    fontSize: TYPOGRAPHY.lg,
    fontFamily: "TS Block Bold",
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: SPACING.xl,
  },
  modalButtons: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.backgroundTertiary,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontFamily: "TS Block Bold",
    color: COLORS.textPrimary,
  },
  submitButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: TYPOGRAPHY.base,
    fontFamily: "TS Block Bold",
    color: COLORS.background,
  },
});

