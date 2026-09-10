import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FONT_BODY, FONT_HEADING } from "./connectionsStyles/tokens";
import { registerForPushNotifications } from "../lib/pushNotifications";

export default function ApplicationPendingScreen({ status = "pending", onSignOut }) {
  const rejected = status === "rejected";

  useEffect(() => {
    registerForPushNotifications().catch(() => {});
  }, []);

  return (
    <View style={styles.inner}>
        <Ionicons
          name={rejected ? "close-circle-outline" : "hourglass-outline"}
          size={56}
          color="hsl(75, 100%, 60%)"
        />
        <Text style={styles.kicker}>R/HOOD</Text>
        <Text style={styles.title}>
          {rejected ? "Application not approved" : "Thank you!"}
        </Text>
        <Text style={styles.body}>
          {rejected
            ? "Your application to join R/HOOD was not approved this time. If you think this is a mistake, email hello@rhood.io."
            : "Your application has been received. R/HOOD is invite-only — we'll email you and send a notification when you've been approved."}
        </Text>
        <TouchableOpacity
          style={styles.signOut}
          onPress={onSignOut}
          accessibilityRole="button"
          accessibilityLabel="Sign out"
        >
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
    paddingHorizontal: 28,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
  },
  kicker: {
    fontFamily: FONT_HEADING,
    fontSize: 13,
    letterSpacing: 2,
    color: "hsl(75, 100%, 60%)",
    textTransform: "uppercase",
    marginTop: 8,
  },
  title: {
    fontFamily: FONT_HEADING,
    fontSize: 28,
    color: "hsl(0, 0%, 100%)",
    textAlign: "center",
    textTransform: "uppercase",
  },
  body: {
    fontFamily: FONT_BODY,
    fontSize: 16,
    lineHeight: 24,
    color: "hsl(0, 0%, 72%)",
    textAlign: "center",
    marginTop: 4,
  },
  signOut: {
    marginTop: 28,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 25%)",
  },
  signOutText: {
    fontFamily: FONT_BODY,
    fontSize: 15,
    color: "hsl(0, 0%, 100%)",
    fontWeight: "600",
  },
});
