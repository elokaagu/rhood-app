import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAnyModalOpen } from "../lib/modalPresence";

const localStyles = StyleSheet.create({
  // Non-blocking: the overlay container lets touches pass through to the page
  // (pointerEvents="box-none" on the View) so the user can keep scrolling and
  // using the screen while the tip is visible. Only the card itself captures
  // touches. Anchored near the bottom so it doesn't sit over the content.
  tutorialOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 96,
    zIndex: 9999,
    elevation: 9999,
  },
  // Short windows (iPad running the iPhone build, small iPhones): the card
  // must shrink into the space between the screen header and tab bar, or it
  // grows upward past the top of the page and gets cut off.
  tutorialOverlayCompact: {
    paddingBottom: 16,
  },
  tutorialOverlayWide: {
    justifyContent: "center",
    paddingBottom: 12,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  tutorialContent: {
    backgroundColor: "hsl(0, 0%, 10%)",
    borderRadius: 20,
    padding: 22,
    width: "100%",
    maxWidth: 440,
    maxHeight: "100%",
    borderWidth: 1,
    borderColor: "hsla(75, 100%, 60%, 0.35)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
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
  tutorialContentCompact: {
    padding: 16,
  },
  tutorialInstructions: {
    flexGrow: 0,
    flexShrink: 1,
    marginBottom: 24,
  },
  tutorialInstructionsCompact: {
    marginBottom: 12,
  },
  tutorialHeaderCompact: {
    marginBottom: 12,
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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const anotherPopupOpen = useAnyModalOpen();
  // On some real devices, keeping a hidden RN Modal mounted can still interfere with touches.
  // Only mount the native modal when we truly intend to show it.
  if (!visible || !rows.length || anotherPopupOpen) return null;
  const compactTitle = String(modalTitle || "").trim().length >= 12;
  const compact = windowHeight < 760;
  const wide = windowWidth >= 700;

  return (
    <View
      style={[
        localStyles.tutorialOverlay,
        compact && localStyles.tutorialOverlayCompact,
        wide && localStyles.tutorialOverlayWide,
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          localStyles.tutorialContent,
          compact && localStyles.tutorialContentCompact,
        ]}
        pointerEvents="auto"
      >
        <View
          style={[
            localStyles.tutorialHeader,
            compact && localStyles.tutorialHeaderCompact,
          ]}
        >
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
        <ScrollView
          style={[
            localStyles.tutorialInstructions,
            compact && localStyles.tutorialInstructionsCompact,
          ]}
          bounces={false}
          showsVerticalScrollIndicator
        >
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
        </ScrollView>
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
