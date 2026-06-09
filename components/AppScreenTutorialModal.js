import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const localStyles = StyleSheet.create({
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
    fontSize: 22,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "bold",
    flex: 1,
    marginRight: 8,
  },
  tutorialTitleCompact: {
    fontSize: 18,
    letterSpacing: 0.2,
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
  tutorialTurnOffButton: {
    marginTop: 14,
    alignItems: "center",
    paddingVertical: 6,
  },
  tutorialTurnOffText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    textDecorationLine: "underline",
  },
});

/**
 * Reusable “How to use this screen” modal (matches Opportunities swipe tutorial look).
 * @param {{ visible: boolean, onDismiss: () => void, modalTitle: string, rows: Array<{ icon: string, iconColor?: string, title: string, body: string }> }} props
 */
export default function AppScreenTutorialModal({
  visible,
  onDismiss,
  onTurnOff,
  modalTitle,
  rows = [],
}) {
  // On some real devices, keeping a hidden RN Modal mounted can still interfere with touches.
  // Only mount the native modal when we truly intend to show it.
  if (!visible || !rows.length) return null;
  const compactTitle = String(modalTitle || "").trim().length >= 12;

  return (
    <View style={localStyles.tutorialOverlay} pointerEvents="auto">
      <View style={localStyles.tutorialContent}>
        <View style={localStyles.tutorialHeader}>
          <Text
            style={[
              localStyles.tutorialTitle,
              compactTitle ? localStyles.tutorialTitleCompact : null,
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
          >
            {modalTitle}
          </Text>
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
          {rows.map((row, i) => (
            <View
              key={`${row.title}-${i}`}
              style={localStyles.tutorialInstructionRow}
            >
              <View style={localStyles.tutorialIconContainer}>
                <Ionicons
                  name={row.icon}
                  size={28}
                  color={row.iconColor || "hsl(75, 100%, 60%)"}
                />
              </View>
              <View style={localStyles.tutorialTextContainer}>
                <Text style={localStyles.tutorialInstructionTitle}>
                  {row.title}
                </Text>
                <Text style={localStyles.tutorialInstructionText}>
                  {row.body}
                </Text>
              </View>
            </View>
          ))}
        </View>
        <TouchableOpacity
          style={localStyles.tutorialGotItButton}
          onPress={onDismiss}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss tutorial"
        >
          <Text style={localStyles.tutorialGotItButtonText}>Got it</Text>
        </TouchableOpacity>

        {onTurnOff && (
          <TouchableOpacity
            style={localStyles.tutorialTurnOffButton}
            onPress={onTurnOff}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Turn off all tutorial tips"
          >
            <Text style={localStyles.tutorialTurnOffText}>
              Turn off tips
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
