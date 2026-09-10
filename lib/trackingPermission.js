import { Platform } from "react-native";

/**
 * App Tracking Transparency (iOS). Must run before Mixpanel/Firebase
 * initialize so we do not collect IDFA or cross-app tracking if the user declines.
 * Non-iOS platforms are treated as allowed (no ATT prompt).
 */
export async function requestAppTrackingIfNeeded() {
  if (Platform.OS !== "ios") return true;
  try {
    const {
      requestTrackingPermissionsAsync,
    } = require("expo-tracking-transparency");
    const { status } = await requestTrackingPermissionsAsync();
    return status === "granted";
  } catch (error) {
    if (__DEV__) {
      console.warn(
        "[trackingPermission]",
        error?.message || "ATT request failed"
      );
    }
    return false;
  }
}
