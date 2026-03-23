import React, { useCallback, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { SPACING, RADIUS } from "../lib/sharedStyles";
import { HapticPatterns } from "../lib/haptics";
import { useAppTutorialContext } from "../context/AppTutorialContext";

export default function TutorialModeScreen({ onBack }) {
  const insets = useSafeAreaInsets();
  const {
    hydrated,
    enabled,
    setTutorialEnabled,
    resetDismissed,
    refreshFromStorage,
  } = useAppTutorialContext();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    refreshFromStorage();
  }, [refreshFromStorage]);

  const handleToggle = useCallback(
    async (value) => {
      HapticPatterns.toggle();
      setPending(true);
      try {
        await setTutorialEnabled(value);
      } finally {
        setPending(false);
      }
    },
    [setTutorialEnabled]
  );

  const handleResetTips = useCallback(() => {
    HapticPatterns.itemPress();
    Alert.alert(
      "Show tips again?",
      "The next time you open each main screen, the short guide will appear again (while Tutorial mode is on).",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          onPress: async () => {
            setPending(true);
            try {
              await resetDismissed();
            } finally {
              setPending(false);
            }
          },
        },
      ]
    );
  }, [resetDismissed]);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity
          onPress={() => {
            HapticPatterns.itemPress();
            onBack?.();
          }}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={28} color="hsl(75, 100%, 60%)" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tutorial mode</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{
          paddingBottom: insets.bottom + SPACING.xl,
          paddingHorizontal: SPACING.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Ionicons name="school" size={56} color="hsl(75, 100%, 60%)" />
          <Text style={styles.heroTitle}>Learn the app</Text>
          <Text style={styles.heroSubtitle}>
            Turn on Tutorial mode to see quick tips on how to use the app.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Show screen tips</Text>
              <Text style={styles.rowSubtitle}>
                A short “Got it” card when you open each area
              </Text>
            </View>
            <Switch
              value={hydrated && enabled}
              onValueChange={handleToggle}
              disabled={!hydrated || pending}
              trackColor={{
                false: "hsl(0, 0%, 25%)",
                true: "hsl(75, 60%, 35%)",
              }}
              thumbColor={
                enabled ? "hsl(75, 100%, 60%)" : "hsl(0, 0%, 70%)"
              }
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.resetButton, pending && styles.resetButtonDisabled]}
          onPress={handleResetTips}
          disabled={!enabled || pending}
          activeOpacity={0.85}
        >
          <Ionicons
            name="refresh-outline"
            size={22}
            color={
              enabled && !pending
                ? "hsl(0, 0%, 100%)"
                : "hsl(0, 0%, 40%)"
            }
          />
          <Text
            style={[
              styles.resetButtonText,
              (!enabled || pending) && styles.resetButtonTextMuted,
            ]}
          >
            Show tips again
          </Text>
        </TouchableOpacity>
        <Text style={styles.resetHint}>
          Clears which screens you’ve already dismissed so tips replay on next
          visit.
        </Text>
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
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "hsl(0, 0%, 18%)",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 18,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 44,
  },
  scroll: {
    flex: 1,
  },
  hero: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
  },
  heroTitle: {
    marginTop: SPACING.md,
    fontSize: 22,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    textAlign: "center",
  },
  heroSubtitle: {
    marginTop: SPACING.md,
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 340,
  },
  card: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
  rowSubtitle: {
    marginTop: 4,
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 55%)",
    lineHeight: 18,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: RADIUS.md,
    backgroundColor: "hsl(0, 0%, 12%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 22%)",
  },
  resetButtonDisabled: {
    opacity: 0.5,
  },
  resetButtonText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
  resetButtonTextMuted: {
    color: "hsl(0, 0%, 45%)",
  },
  resetHint: {
    marginTop: SPACING.sm,
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 45%)",
    lineHeight: 17,
    textAlign: "center",
  },
});
