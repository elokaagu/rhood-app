import { StyleSheet } from "react-native";

/**
 * Design tokens: COLORS, FONT, SPACING, RADIUS.
 * sharedStyles groups layout / type / form primitives. Prefer FONT.* for new code; TYPOGRAPHY is a
 * backward-compatible flat view of the same values (see weightBold vs bold face).
 */

// —— Colors (hex / rgba for handoff consistency) ——
export const COLORS = {
  primary: "#D9FF33",
  primaryDark: "#B8E628",
  primaryLight: "#E8FF66",

  background: "#000000",
  backgroundSecondary: "#141414",
  backgroundTertiary: "#1A1A1A",
  backgroundCard: "#1F1F1F",

  textPrimary: "#FFFFFF",
  textSecondary: "#B3B3B3",
  textTertiary: "#808080",
  textMuted: "#666666",

  border: "#262626",
  borderLight: "#333333",
  borderDark: "#1A1A1A",

  /** Progress / slider track (semantic) */
  sliderTrack: "#383838",
  /** @deprecated Use COLORS.sliderTrack — kept for existing imports */
  TRACK_GREY: "#383838",
  /** @deprecated Alias for Hermes / older refs */
  TRACK_BG: "#383838",

  success: "#4ADE4A",
  warning: "#FBBF24",
  error: "#FF4444",
  info: "#38BDF8",

  overlay: "rgba(0, 0, 0, 0.8)",
  overlayLight: "rgba(0, 0, 0, 0.5)",
  overlayDark: "rgba(0, 0, 0, 0.9)",

  /** Pass to TextInput placeholderTextColor */
  inputPlaceholder: "#808080",
};

// —— Typography tokens (single source; use TYPOGRAPHY in legacy call sites) ——
export const FONT = {
  family: {
    body: "Helvetica Neue",
    brand: "TS Block Bold",
  },
  size: {
    xs: 10,
    sm: 12,
    base: 14,
    md: 16,
    lg: 16,
    xl: 18,
    "2xl": 20,
    "3xl": 24,
    "4xl": 28,
    "5xl": 32,
  },
  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    heavy: "900",
  },
  lineHeight: {
    xs: 14,
    sm: 16,
    base: 20,
    md: 22,
    lg: 22,
    xl: 26,
    "2xl": 28,
    "3xl": 32,
    "4xl": 36,
    "5xl": 40,
  },
};

/**
 * Flat token map for legacy imports. `bold` / `brand` are font *family* names (TS Block Bold).
 * For fontWeight: "700" use weightBold — never use `bold` as a weight (it is a string face name).
 */
export const TYPOGRAPHY = {
  primary: FONT.family.body,
  bold: FONT.family.brand,
  brand: FONT.family.brand,

  xs: FONT.size.xs,
  sm: FONT.size.sm,
  base: FONT.size.base,
  md: FONT.size.md,
  lg: FONT.size.lg,
  xl: FONT.size.xl,
  "2xl": FONT.size["2xl"],
  "3xl": FONT.size["3xl"],
  "4xl": FONT.size["4xl"],
  "5xl": FONT.size["5xl"],

  normal: FONT.weight.regular,
  medium: FONT.weight.medium,
  semibold: FONT.weight.semibold,
  black: FONT.weight.heavy,
  weightBold: FONT.weight.bold,
};

export const SPACING = {
  xs: 4,
  sm: 8,
  base: 12,
  md: 16,
  lg: 20,
  xl: 24,
  "2xl": 30,
  "3xl": 40,
  "4xl": 48,
  "5xl": 60,
};

export const RADIUS = {
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  full: 9999,
};

export const sharedStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  containerSecondary: {
    flex: 1,
    backgroundColor: COLORS.backgroundSecondary,
  },
  scrollContainer: {
    flexGrow: 1,
    padding: SPACING.lg,
  },

  textPrimary: {
    fontSize: FONT.size.base,
    lineHeight: FONT.lineHeight.base,
    fontFamily: FONT.family.body,
    fontWeight: FONT.weight.regular,
    color: COLORS.textPrimary,
  },
  textSecondary: {
    fontSize: FONT.size.base,
    lineHeight: FONT.lineHeight.base,
    fontFamily: FONT.family.body,
    fontWeight: FONT.weight.regular,
    color: COLORS.textSecondary,
  },
  textTertiary: {
    fontSize: FONT.size.base,
    lineHeight: FONT.lineHeight.base,
    fontFamily: FONT.family.body,
    fontWeight: FONT.weight.regular,
    color: COLORS.textTertiary,
  },
  textMuted: {
    fontSize: FONT.size.base,
    lineHeight: FONT.lineHeight.base,
    fontFamily: FONT.family.body,
    fontWeight: FONT.weight.regular,
    color: COLORS.textMuted,
  },

  heading1: {
    fontSize: FONT.size["4xl"],
    lineHeight: FONT.lineHeight["4xl"],
    fontFamily: FONT.family.brand,
    color: COLORS.textPrimary,
  },
  heading2: {
    fontSize: FONT.size["3xl"],
    lineHeight: FONT.lineHeight["3xl"],
    fontFamily: FONT.family.brand,
    color: COLORS.textPrimary,
  },
  heading3: {
    fontSize: FONT.size["2xl"],
    lineHeight: FONT.lineHeight["2xl"],
    fontFamily: FONT.family.brand,
    color: COLORS.textPrimary,
  },
  heading4: {
    fontSize: FONT.size.xl,
    lineHeight: FONT.lineHeight.xl,
    fontFamily: FONT.family.brand,
    color: COLORS.textPrimary,
  },

  /** Brand display type — no textAlign; compose with layoutCenter / brandHeadingCentered */
  brandHeading: {
    fontSize: FONT.size["4xl"],
    lineHeight: FONT.lineHeight["4xl"],
    fontFamily: FONT.family.brand,
    color: COLORS.primary,
  },
  brandHeadingCentered: {
    textAlign: "center",
  },

  /** Default field — use with inputFocused / inputError overrides */
  inputBase: {
    backgroundColor: COLORS.backgroundTertiary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.base,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.base,
    fontSize: FONT.size.base,
    lineHeight: FONT.lineHeight.base,
    fontFamily: FONT.family.body,
    fontWeight: FONT.weight.regular,
    color: COLORS.textPrimary,
  },
  input: {
    backgroundColor: COLORS.backgroundTertiary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.base,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.base,
    fontSize: FONT.size.base,
    lineHeight: FONT.lineHeight.base,
    fontFamily: FONT.family.body,
    fontWeight: FONT.weight.regular,
    color: COLORS.textPrimary,
  },
  inputMultiline: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: COLORS.error,
  },
  inputFocused: {
    borderColor: COLORS.primary,
  },

  buttonPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.base,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSecondary: {
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.base,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    backgroundColor: COLORS.border,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.base,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.85,
  },
  buttonText: {
    fontSize: FONT.size.base,
    lineHeight: FONT.lineHeight.base,
    fontFamily: FONT.family.body,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },
  buttonTextPrimary: {
    fontSize: FONT.size.base,
    lineHeight: FONT.lineHeight.base,
    fontFamily: FONT.family.body,
    fontWeight: FONT.weight.semibold,
    color: COLORS.background,
  },
  buttonTextDisabled: {
    fontSize: FONT.size.base,
    lineHeight: FONT.lineHeight.base,
    fontFamily: FONT.family.body,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textMuted,
  },

  card: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    marginBottom: SPACING.base,
  },
  cardTitle: {
    fontSize: FONT.size.lg,
    lineHeight: FONT.lineHeight.lg,
    fontFamily: FONT.family.brand,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  cardSubtitle: {
    fontSize: FONT.size.sm,
    lineHeight: FONT.lineHeight.sm,
    fontFamily: FONT.family.body,
    fontWeight: FONT.weight.regular,
    color: COLORS.textSecondary,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  modalContent: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: "100%",
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: FONT.size.lg,
    lineHeight: FONT.lineHeight.lg,
    fontFamily: FONT.family.body,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
  },

  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONT.size.base,
    lineHeight: FONT.lineHeight.base,
    fontFamily: FONT.family.body,
    fontWeight: FONT.weight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  errorText: {
    fontSize: FONT.size.sm,
    lineHeight: FONT.lineHeight.sm,
    fontFamily: FONT.family.body,
    fontWeight: FONT.weight.regular,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },

  /** @deprecated Prefer rowCenter for new code */
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowCenter: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  /** @deprecated Prefer layoutCenter */
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  layoutCenter: {
    alignItems: "center",
    justifyContent: "center",
  },

  /** @deprecated Prefer cardShadow */
  shadow: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardShadow: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  textShadow: {
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  /** Common screen title using brand face (used by legal/help/community flows) */
  tsBlockBoldHeading: {
    fontSize: FONT.size["3xl"],
    lineHeight: FONT.lineHeight["3xl"],
    fontFamily: FONT.family.brand,
    color: COLORS.textPrimary,
  },
  bodyText: {
    fontSize: FONT.size.base,
    lineHeight: FONT.lineHeight.base,
    fontFamily: FONT.family.body,
    fontWeight: FONT.weight.regular,
    color: COLORS.textSecondary,
  },
});

/**
 * Object form: { size, family, weight?, color, lineHeight? }
 * Legacy: (size?, weight?, color?) — uses body family.
 */
export function createTextStyle(arg1, arg2, arg3) {
  if (arg1 != null && typeof arg1 === "object" && !Array.isArray(arg1)) {
    const {
      size = FONT.size.base,
      family = FONT.family.body,
      weight,
      color = COLORS.textPrimary,
      lineHeight: lh,
    } = arg1;
    return {
      fontSize: size,
      fontFamily: family,
      ...(weight ? { fontWeight: weight } : {}),
      ...(lh != null ? { lineHeight: lh } : {}),
      color,
    };
  }
  return {
    fontSize: arg1 ?? FONT.size.base,
    fontFamily: FONT.family.body,
    fontWeight: arg2 ?? FONT.weight.regular,
    color: arg3 ?? COLORS.textPrimary,
  };
}

export const createSpacing = (vertical = 0, horizontal = 0) => ({
  paddingVertical: vertical,
  paddingHorizontal: horizontal,
});

export const createMargin = (vertical = 0, horizontal = 0) => ({
  marginVertical: vertical,
  marginHorizontal: horizontal,
});
