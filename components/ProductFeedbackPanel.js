import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import Constants from "expo-constants";
import { db } from "../lib/supabase";
import { HapticPatterns } from "../lib/haptics";
import { track, AnalyticsEvents } from "../lib/analytics";

const CATEGORIES = [
  { id: "idea", label: "Idea" },
  { id: "bug", label: "Bug" },
  { id: "general", label: "General" },
  { id: "other", label: "Other" },
];

function getAppMeta() {
  const appVersion =
    Constants.nativeAppVersion ?? Constants.expoConfig?.version ?? null;
  const platform = Platform.OS;
  return { appVersion, platform };
}

export default function ProductFeedbackPanel({ user }) {
  const [category, setCategory] = useState("general");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert("Feedback", "Please enter a message before sending.");
      return;
    }
    if (!user?.id) {
      Alert.alert("Sign in required", "Sign in to send feedback.");
      return;
    }

    HapticPatterns.buttonPress();
    setSubmitting(true);
    try {
      const { appVersion, platform } = getAppMeta();
      await db.submitProductFeedback({
        userId: user.id,
        body: trimmed,
        category,
        appVersion,
        platform,
      });
      setText("");
      HapticPatterns.success();
      await track(AnalyticsEvents.PRODUCT_FEEDBACK_SUBMITTED, {
        category,
        message_length: trimmed.length,
      });
      Alert.alert(
        "Thanks!",
        "Your feedback was sent to the team and will show up in the R/HOOD portal right away."
      );
    } catch (e) {
      console.error("Product feedback submit failed:", e);
      HapticPatterns.error();
      Alert.alert(
        "Could not send",
        e?.message ||
          "Something went wrong. Check your connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }, [text, user?.id, category]);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Type</Text>
      <View style={styles.chips}>
        {CATEGORIES.map((c) => {
          const active = category === c.id;
          return (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => {
                HapticPatterns.toggle();
                setCategory(c.id);
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                {c.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TextInput
        style={styles.input}
        placeholder="What should we know?"
        placeholderTextColor="hsl(0, 0%, 45%)"
        multiline
        value={text}
        onChangeText={setText}
        textAlignVertical="top"
        maxLength={4000}
        editable={!submitting}
      />

      <TouchableOpacity
        style={[styles.submit, submitting && styles.submitDisabled]}
        onPress={submit}
        disabled={submitting}
        activeOpacity={0.85}
      >
        {submitting ? (
          <ActivityIndicator color="hsl(0, 0%, 10%)" />
        ) : (
          <Text style={styles.submitText}>Send feedback</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
  },
  label: {
    fontSize: 12,
    color: "hsl(0, 0%, 50%)",
    fontFamily: "Helvetica Neue",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "hsl(0, 0%, 15%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 22%)",
  },
  chipActive: {
    backgroundColor: "hsla(75, 100%, 60%, 0.15)",
    borderColor: "hsl(75, 100%, 60%)",
  },
  chipLabel: {
    fontSize: 13,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
  },
  chipLabelActive: {
    color: "hsl(75, 100%, 60%)",
  },
  input: {
    minHeight: 100,
    maxHeight: 180,
    backgroundColor: "hsl(0, 0%, 12%)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "hsl(0, 0%, 100%)",
    fontFamily: "Helvetica Neue",
    marginBottom: 14,
  },
  submit: {
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitDisabled: {
    opacity: 0.7,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "700",
    color: "hsl(0, 0%, 10%)",
    fontFamily: "Helvetica Neue",
  },
});
