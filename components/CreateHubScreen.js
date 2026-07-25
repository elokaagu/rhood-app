import React, { useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "../lib/sharedStyles";
import { HapticPatterns } from "../lib/haptics";
import { SCREENS } from "../navigation/routes";

const androidSubtitleTextProps =
  Platform.OS === "android" ? { includeFontPadding: false } : {};

const CREATE_OPTIONS = [
  {
    key: SCREENS.UPLOAD_MIX,
    icon: "cloud-upload-outline",
    title: "Upload a mix",
    subtitle:
      "Share a set with the community. Add artwork, genres and metadata so DJs can find it.",
    cta: "Upload",
  },
  {
    key: SCREENS.CREATE_OPPORTUNITY,
    icon: "megaphone-outline",
    title: "Create an opportunity",
    subtitle:
      "Posting a gig? Submit it here and it goes into the opportunity deck once our team reviews it.",
    cta: "Submit a gig",
  },
];

/**
 * Landing screen for the Create tab: routes to the mix upload flow or the
 * opportunity submission flow.
 */
export default function CreateHubScreen({ onNavigate }) {
  const contentFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(contentFadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [contentFadeAnim]);

  const handlePress = useCallback(
    (screen) => {
      HapticPatterns.buttonPress();
      onNavigate?.(screen, { returnScreen: SCREENS.CREATE_HUB });
    },
    [onNavigate]
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: contentFadeAnim }}>
        <View style={styles.headerShell}>
          <Text style={styles.headerTitle}>Create</Text>
        </View>

        <Text style={styles.intro} {...androidSubtitleTextProps}>
          What do you want to put out into the world?
        </Text>

        {CREATE_OPTIONS.map(({ key, icon, title, subtitle, cta }) => (
          <TouchableOpacity
            key={key}
            style={styles.optionCard}
            onPress={() => handlePress(key)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={title}
          >
            <View style={styles.optionIconWrap}>
              <Ionicons name={icon} size={26} color={COLORS.primary} />
            </View>
            <View style={styles.optionBody}>
              <Text style={styles.optionTitle}>{title}</Text>
              <Text style={styles.optionSubtitle} {...androidSubtitleTextProps}>
                {subtitle}
              </Text>
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.optionCta}
              >
                <Text style={styles.optionCtaText}>{cta}</Text>
                <Ionicons
                  name="arrow-forward"
                  size={16}
                  color={COLORS.background}
                />
              </LinearGradient>
            </View>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: 120,
  },
  headerShell: {
    marginHorizontal: -SPACING.sm,
    marginBottom: SPACING.lg,
    paddingBottom: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontFamily: TYPOGRAPHY.bold,
    fontSize: TYPOGRAPHY["2xl"],
    color: COLORS.textPrimary,
    textAlign: "left",
    textTransform: "uppercase",
    letterSpacing: 1,
    lineHeight: 26,
  },
  intro: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  optionCard: {
    flexDirection: "row",
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    gap: SPACING.base,
  },
  optionIconWrap: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.full,
    backgroundColor: "rgba(204, 255, 0, 0.12)",
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  optionBody: {
    flex: 1,
  },
  optionTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontFamily: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    letterSpacing: 0.3,
  },
  optionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    lineHeight: 20,
    marginBottom: SPACING.base,
  },
  optionCta: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  optionCtaText: {
    color: COLORS.background,
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.weightBold,
  },
});
