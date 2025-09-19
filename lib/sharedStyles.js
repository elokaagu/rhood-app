import { StyleSheet } from "react-native";

// R/HOOD Brand Colors
export const COLORS = {
  // Primary Brand Colors
  primary: "hsl(75, 100%, 60%)", // R/HOOD signature lime
  primaryDark: "hsl(75, 100%, 50%)",
  primaryLight: "hsl(75, 100%, 70%)",

  // Background Colors
  background: "hsl(0, 0%, 0%)", // Pure black
  backgroundSecondary: "hsl(0, 0%, 8%)",
  backgroundTertiary: "hsl(0, 0%, 10%)",
  backgroundCard: "hsl(0, 0%, 12%)",

  // Text Colors
  textPrimary: "hsl(0, 0%, 100%)", // Pure white
  textSecondary: "hsl(0, 0%, 70%)", // Muted white
  textTertiary: "hsl(0, 0%, 50%)", // Dimmed white
  textMuted: "hsl(0, 0%, 40%)", // Very dimmed white

  // Border Colors
  border: "hsl(0, 0%, 15%)",
  borderLight: "hsl(0, 0%, 20%)",
  borderDark: "hsl(0, 0%, 10%)",

  // Status Colors
  success: "hsl(120, 100%, 60%)",
  warning: "hsl(45, 100%, 60%)",
  error: "hsl(0, 100%, 60%)",
  info: "hsl(200, 100%, 60%)",

  // Overlay Colors
  overlay: "rgba(0, 0, 0, 0.8)",
  overlayLight: "rgba(0, 0, 0, 0.5)",
  overlayDark: "rgba(0, 0, 0, 0.9)",
};

// Typography
export const TYPOGRAPHY = {
  // Font Families
  primary: "Arial",
  bold: "Arial Black",

  // Font Sizes
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 32,
  "5xl": 36,

  // Font Weights
  normal: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  black: "900",
};

// Spacing
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

// Border Radius
export const RADIUS = {
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  full: 9999,
};

// Shared Styles
export const sharedStyles = StyleSheet.create({
  // Container Styles
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

  // Text Styles
  textPrimary: {
    fontSize: TYPOGRAPHY.base,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textPrimary,
  },
  textSecondary: {
    fontSize: TYPOGRAPHY.base,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textSecondary,
  },
  textTertiary: {
    fontSize: TYPOGRAPHY.base,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textTertiary,
  },
  textMuted: {
    fontSize: TYPOGRAPHY.base,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textMuted,
  },

  // Heading Styles
  heading1: {
    fontSize: TYPOGRAPHY["4xl"],
    fontFamily: TYPOGRAPHY.bold,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.textPrimary,
  },
  heading2: {
    fontSize: TYPOGRAPHY["3xl"],
    fontFamily: TYPOGRAPHY.bold,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },
  heading3: {
    fontSize: TYPOGRAPHY["2xl"],
    fontFamily: TYPOGRAPHY.bold,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
  },
  heading4: {
    fontSize: TYPOGRAPHY.xl,
    fontFamily: TYPOGRAPHY.bold,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textPrimary,
  },

  // Brand Heading (R/HOOD signature style)
  brandHeading: {
    fontSize: TYPOGRAPHY["4xl"],
    fontFamily: TYPOGRAPHY.bold,
    fontWeight: TYPOGRAPHY.black,
    color: COLORS.primary,
    textAlign: "center",
  },

  // Input Styles
  input: {
    backgroundColor: COLORS.backgroundTertiary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.base,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.base,
    fontSize: TYPOGRAPHY.base,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textPrimary,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  inputFocused: {
    borderColor: COLORS.primary,
  },

  // Button Styles
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
  buttonText: {
    fontSize: TYPOGRAPHY.base,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textPrimary,
  },
  buttonTextPrimary: {
    fontSize: TYPOGRAPHY.base,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.background,
  },

  // Card Styles
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
    fontSize: TYPOGRAPHY.lg,
    fontFamily: TYPOGRAPHY.bold,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  cardSubtitle: {
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textSecondary,
  },

  // Modal Styles
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
    fontSize: TYPOGRAPHY.lg,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.semibold,
  },

  // Form Styles
  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: TYPOGRAPHY.base,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  errorText: {
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },

  // Layout Styles
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },

  // Shadow Styles
  shadow: {
    shadowColor: COLORS.background,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },

  // Text Shadow for readability over images
  textShadow: {
    textShadowColor: "rgba(0, 0, 0, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});

// Utility functions
export const createTextStyle = (
  size = TYPOGRAPHY.base,
  weight = TYPOGRAPHY.normal,
  color = COLORS.textPrimary
) => ({
  fontSize: size,
  fontFamily: TYPOGRAPHY.primary,
  fontWeight: weight,
  color: color,
});

export const createSpacing = (vertical = 0, horizontal = 0) => ({
  paddingVertical: vertical,
  paddingHorizontal: horizontal,
});

export const createMargin = (vertical = 0, horizontal = 0) => ({
  marginVertical: vertical,
  marginHorizontal: horizontal,
});
