import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
} from "../lib/sharedStyles";

/**
 * Guideline 4.8: Sign in with Apple must be at least as prominent as other
 * third-party logins, and must use Apple's official button (including the logo).
 */
export default function SocialAuthButtons({
  onGoogle,
  onApple,
  loading = false,
  disabled = false,
  appleButtonType = "signIn",
}) {
  const appleType =
    appleButtonType === "signUp"
      ? AppleAuthentication.AppleAuthenticationButtonType.CONTINUE
      : AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN;

  const googleButton = (
    <TouchableOpacity
      style={[styles.googleButton, (loading || disabled) && styles.disabled]}
      onPress={onGoogle}
      disabled={loading || disabled}
      accessibilityRole="button"
      accessibilityLabel="Continue with Google"
    >
      <Text style={styles.googleText}>Continue with Google</Text>
    </TouchableOpacity>
  );

  const appleButton =
    Platform.OS === "ios" ? (
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={appleType}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={RADIUS.md}
        style={[styles.appleOfficial, (loading || disabled) && styles.disabled]}
        onPress={loading || disabled ? undefined : onApple}
      />
    ) : null;

  return (
    <View style={styles.container}>
      {Platform.OS === "ios" ? (
        <>
          {appleButton}
          {googleButton}
        </>
      ) : (
        googleButton
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  appleOfficial: {
    width: "100%",
    height: 48,
  },
  googleButton: {
    backgroundColor: "hsl(0, 0%, 100%)",
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  googleText: {
    fontSize: TYPOGRAPHY.md,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.semibold,
    color: "hsl(0, 0%, 0%)",
  },
  disabled: {
    opacity: 0.5,
  },
});
