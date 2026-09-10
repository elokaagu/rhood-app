import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

/**
 * Privacy + Terms links on Login / Signup (reachable before an account exists).
 */
export default function AuthLegalLinks({ onPrivacy, onTerms }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>
        By continuing you agree to our{" "}
        <Text style={styles.link} onPress={onPrivacy}>
          Privacy Policy
        </Text>{" "}
        and{" "}
        <Text style={styles.link} onPress={onTerms}>
          Terms of Service
        </Text>
        .
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 20,
    paddingHorizontal: 8,
  },
  text: {
    color: "hsl(0, 0%, 55%)",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    fontFamily: "Helvetica Neue",
  },
  link: {
    color: "hsl(75, 100%, 60%)",
    fontWeight: "600",
  },
});
