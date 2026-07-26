import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const localStyles = StyleSheet.create({
  // Deliberately blocking (unlike AppScreenTutorialModal's box-none tip cards):
  // this teaches the swipe gesture, so it should cover the card while shown.
  // A plain absolutely-positioned View rather than a native Modal — an RN
  // Modal is a separate native window, and on some Android devices a Modal
  // that has just been dismissed keeps intercepting touches for a beat
  // (see AppScreenTutorialModal's fix history). Early-returning null below
  // when hidden means this never lingers mounted either way.
  tutorialOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    zIndex: 9999,
    elevation: 9999,
  },
  tutorialContent: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 20,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  tutorialHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  tutorialTitle: {
    fontSize: 24,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "bold",
  },
  tutorialCloseButton: {
    padding: 4,
  },
  tutorialInstructions: {
    marginBottom: 24,
  },
  tutorialInstructionRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  tutorialIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "hsl(0, 0%, 12%)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  tutorialTextContainer: {
    flex: 1,
  },
  tutorialInstructionTitle: {
    fontSize: 17,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
  },
  tutorialInstructionText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    lineHeight: 20,
  },
  tutorialGotItButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  tutorialGotItButtonText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    color: "hsl(0, 0%, 0%)",
  },
});

/**
 * First-run swipe tutorial for the opportunities deck.
 */
export default function OpportunitiesSwipeTutorialModal({ visible, onDismiss }) {
  if (!visible) return null;
  return (
    <View style={localStyles.tutorialOverlay} pointerEvents="auto">
      <View style={localStyles.tutorialContent}>
        <View style={localStyles.tutorialHeader}>
          <Text style={localStyles.tutorialTitle}>How to Use</Text>
          <TouchableOpacity
            onPress={onDismiss}
            style={localStyles.tutorialCloseButton}
            accessibilityRole="button"
            accessibilityLabel="Close tutorial"
          >
            <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
          </TouchableOpacity>
        </View>
        <View style={localStyles.tutorialInstructions}>
          <View style={localStyles.tutorialInstructionRow}>
            <View style={localStyles.tutorialIconContainer}>
              <Ionicons name="arrow-forward" size={32} color="hsl(75, 100%, 60%)" />
            </View>
            <View style={localStyles.tutorialTextContainer}>
              <Text style={localStyles.tutorialInstructionTitle}>Swipe Right</Text>
              <Text style={localStyles.tutorialInstructionText}>
                To apply for an opportunity
              </Text>
            </View>
          </View>
          <View style={localStyles.tutorialInstructionRow}>
            <View style={localStyles.tutorialIconContainer}>
              <Ionicons name="arrow-back" size={32} color="hsl(0, 100%, 60%)" />
            </View>
            <View style={localStyles.tutorialTextContainer}>
              <Text style={localStyles.tutorialInstructionTitle}>Swipe Left</Text>
              <Text style={localStyles.tutorialInstructionText}>
                To dismiss and see the next opportunity
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={localStyles.tutorialGotItButton}
          onPress={onDismiss}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss tutorial"
        >
          <Text style={localStyles.tutorialGotItButtonText}>Got It</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
