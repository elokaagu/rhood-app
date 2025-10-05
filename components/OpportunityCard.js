import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  sharedStyles,
} from "../lib/sharedStyles";

export default function OpportunityCard({ opportunity, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      {/* Large featured image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: opportunity.image }}
          style={styles.featuredImage}
        />
        <View style={styles.imageOverlay}>
          <View style={styles.overlayHeader}>
            <Text style={styles.venueName}>{opportunity.venue}</Text>
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
          <Text style={styles.eventTitle}>{opportunity.title}</Text>
          <Text style={styles.applicationsLeft}>
            {opportunity.applicationsLeft} applications left
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
  featuredImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
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
