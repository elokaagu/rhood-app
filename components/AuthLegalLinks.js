import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../lib/sharedStyles";

/**
 * Required Terms + Privacy acceptance on Login / Signup (App Store 1.2).
 * Apple requires the EULA to be presented before registering or logging in.
 */
export default function AuthLegalLinks({
  onPrivacy,
  onTerms,
  accepted = false,
  onAcceptedChange,
  style,
}) {
  return (
    <View style={[styles.wrap, style]}>
      <TouchableOpacity
        style={styles.row}
        onPress={() => onAcceptedChange?.(!accepted)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: !!accepted }}
        accessibilityLabel="Agree to the Terms of Service and Privacy Policy"
      >
        <View style={[styles.box, accepted && styles.boxChecked]}>
          {accepted ? (
            <Ionicons name="checkmark" size={14} color="#000" />
          ) : null}
        </View>
        <Text style={styles.text}>
          I agree to the{" "}
          <Text
            style={styles.link}
            onPress={() => {
              onTerms?.();
            }}
          >
            Terms of Service
          </Text>
          {" and "}
          <Text
            style={styles.link}
            onPress={() => {
              onPrivacy?.();
            }}
          >
            Privacy Policy
          </Text>
          .
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export function termsNotAcceptedMessage() {
  return "Please agree to the Terms of Service and Privacy Policy before continuing.";
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: "hsl(0, 0%, 45%)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  boxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  text: {
    flex: 1,
    color: "hsl(0, 0%, 55%)",
    fontSize: 13,
    lineHeight: 19,
    fontFamily: "Helvetica Neue",
  },
  link: {
    color: "hsl(75, 100%, 60%)",
    fontWeight: "600",
  },
});
