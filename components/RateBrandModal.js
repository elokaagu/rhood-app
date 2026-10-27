import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HapticPatterns } from "../lib/haptics";
import { useRegisterModalPresence } from "../lib/modalPresence";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, sharedStyles } from "../lib/sharedStyles";

const STAR_COLOR = "hsl(45, 100%, 60%)";

/** DJ rates the brand 1–5 stars after a completed gig. */
export default function RateBrandModal({
  visible,
  brandName,
  gigName,
  initialStars = null,
  submitting = false,
  onSubmit,
  onClose,
}) {
  useRegisterModalPresence(!!visible);
  const [stars, setStars] = useState(initialStars || 0);

  useEffect(() => {
    if (visible) setStars(initialStars || 0);
  }, [visible, initialStars]);

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={submitting ? undefined : onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>Rate {brandName}</Text>
          {gigName ? (
            <Text style={styles.subtitle} numberOfLines={2}>
              How was working with them on "{gigName}"?
            </Text>
          ) : null}

          <View style={styles.starsRow} accessibilityRole="adjustable">
            {[1, 2, 3, 4, 5].map((value) => (
              <TouchableOpacity
                key={value}
                onPress={() => {
                  HapticPatterns.buttonPress();
                  setStars(value);
                }}
                disabled={submitting}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`${value} star${value === 1 ? "" : "s"}`}
                accessibilityState={{ selected: stars === value }}
              >
                <Ionicons
                  name={value <= stars ? "star" : "star-outline"}
                  size={40}
                  color={value <= stars ? STAR_COLOR : COLORS.textTertiary}
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.privacyNote}>
            Only {brandName} and the R/HOOD team can see your rating.
          </Text>

          <TouchableOpacity
            style={[styles.submitButton, (!stars || submitting) && styles.submitButtonDisabled]}
            onPress={() => stars && onSubmit?.(stars)}
            disabled={!stars || submitting}
          >
            {submitting ? (
              <ActivityIndicator color={COLORS.background} />
            ) : (
              <Text style={styles.submitText}>
                {initialStars ? "Update rating" : "Submit rating"}
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={submitting}>
            <Text style={styles.cancelText}>Not now</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    alignItems: "center",
  },
  title: {
    ...sharedStyles.tsBlockBoldHeading,
    fontSize: TYPOGRAPHY.lg,
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  subtitle: {
    ...sharedStyles.bodyText,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: SPACING.sm,
  },
  starsRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginVertical: SPACING.lg,
  },
  privacyNote: {
    fontSize: TYPOGRAPHY.sm,
    color: COLORS.textTertiary,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  submitButton: {
    alignSelf: "stretch",
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitText: {
    ...sharedStyles.buttonText,
    color: COLORS.background,
  },
  cancelButton: {
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  cancelText: {
    fontSize: TYPOGRAPHY.base,
    color: COLORS.textSecondary,
  },
});
