import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { SPACING } from "../lib/sharedStyles";
import { HapticPatterns } from "../lib/haptics";
import ProductFeedbackPanel from "./ProductFeedbackPanel";

export default function ProductFeedbackScreen({ user, onBack }) {
  const insets = useSafeAreaInsets();

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
        <Text style={styles.headerTitle}>Product feedback</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={{
            paddingBottom: insets.bottom + SPACING.xl,
            paddingHorizontal: SPACING.lg,
            paddingTop: SPACING.md,
          }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.intro}>
            Share ideas, bugs, or general notes. Submissions go to the same
            product inbox as the R/HOOD portal — the team sees them right away.
          </Text>
          <ProductFeedbackPanel user={user} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  flex: {
    flex: 1,
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
  intro: {
    fontSize: 14,
    lineHeight: 20,
    color: "hsl(0, 0%, 62%)",
    fontFamily: "Helvetica Neue",
    marginBottom: SPACING.lg,
  },
});
