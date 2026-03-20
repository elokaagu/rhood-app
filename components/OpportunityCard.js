import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  sharedStyles,
} from "../lib/sharedStyles";

function resolveImageUri(image) {
  if (typeof image !== "string") return null;
  const trimmed = image.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default function OpportunityCard({ opportunity, onPress }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUri = opportunity ? resolveImageUri(opportunity.image) : null;

  useEffect(() => {
    setImageFailed(false);
  }, [imageUri]);

  if (!opportunity) {
    return null;
  }

  const showImage = Boolean(imageUri && !imageFailed);
  const venue =
    String(opportunity.venue ?? "")
      .trim() || "Venue";
  const title =
    String(opportunity.title ?? "")
      .trim() || "DJ Opportunity";
  const applicationsLine =
    typeof opportunity.applicationsLeft === "number"
      ? `${opportunity.applicationsLeft} applications left`
      : "Applications open";

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress?.(opportunity)}
      activeOpacity={0.8}
      accessibilityRole="button"
    >
      {/* Large featured image */}
      <View style={styles.imageContainer}>
        {showImage ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.featuredImage}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View style={[styles.imageArea, styles.imagePlaceholder]}>
            <Ionicons
              name="image-outline"
              size={48}
              color={COLORS.textTertiary}
            />
          </View>
        )}
        <View style={styles.imageOverlay}>
          <View style={styles.overlayHeader}>
            <Text style={styles.venueName} numberOfLines={1}>
              {venue}
            </Text>
            {opportunity.status === "hot" && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>HOT</Text>
              </View>
            )}
            {opportunity.status === "new" && (
              <View style={[styles.statusBadge, styles.newBadge]}>
                <Text style={styles.statusBadgeText}>NEW</Text>
              </View>
            )}
            {opportunity.status === "closing" && (
              <View style={[styles.statusBadge, styles.closingBadge]}>
                <Text style={styles.statusBadgeText}>CLOSING</Text>
              </View>
            )}
          </View>
          <Text style={styles.eventTitle} numberOfLines={2}>
            {title}
          </Text>
          <Text style={styles.applicationsLeft} numberOfLines={1}>
            {applicationsLine}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: RADIUS.lg,
    marginHorizontal: 0,
    marginVertical: 0,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...sharedStyles.shadow,
    overflow: "hidden",
    flex: 1,
  },
  imageContainer: {
    position: "relative",
    flex: 1,
  },
  imageArea: {
    width: "100%",
    height: "100%",
    minHeight: 200,
  },
  featuredImage: {
    width: "100%",
    height: "100%",
    minHeight: 200,
    resizeMode: "cover",
  },
  imagePlaceholder: {
    backgroundColor: COLORS.backgroundTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  imageOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.overlay,
    padding: SPACING.md,
  },
  overlayHeader: {
    ...sharedStyles.rowBetween,
    marginBottom: SPACING.xs,
  },
  venueName: {
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.semibold,
    flex: 1,
  },
  statusBadge: {
    backgroundColor: COLORS.error,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  newBadge: {
    backgroundColor: COLORS.success,
  },
  closingBadge: {
    backgroundColor: COLORS.warning,
  },
  statusBadgeText: {
    fontSize: TYPOGRAPHY.xs,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.bold,
  },
  eventTitle: {
    fontSize: TYPOGRAPHY["2xl"],
    fontFamily: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    lineHeight: 26,
  },
  applicationsLeft: {
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.primary,
    marginTop: SPACING.xs,
    fontWeight: TYPOGRAPHY.semibold,
  },
});
