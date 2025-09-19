// Rhood design tokens (keep these in one place so UI stays consistent)
export const RH = {
  color: {
    bgElevated: "rgba(0,0,0,0.72)", // fallback if blur not supported
    stroke: "#2A2A2A",
    textPrimary: "rgba(255,255,255,0.90)",
    textSecondary: "rgba(255,255,255,0.70)",
    active: "#C9FF2F", // neon accent (updated to match brand)
    shadow: "#000000",
  },
  radius: {
    xl: 22,
    card: 12,
  },
  space: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
  },
  tabbar: {
    height: 58,
    sideInset: 12,
    bottomInset: 12, // extra spacing above home indicator
    icon: 24,
    label: 11, // pt
    shadowOpacity: 0.25,
    shadowRadius: 24,
    shadowOffsetY: 8,
    borderWidth: 1,
    blurIntensity: 40, // 0..100
  },
} as const;
