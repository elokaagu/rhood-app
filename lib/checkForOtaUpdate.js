/**
 * Fetch and apply EAS Update on launch (production / TestFlight builds only).
 * Without this, Expo downloads updates but often waits until the *next* cold start.
 */
import { Platform } from "react-native";

export async function checkForOtaUpdateAndReload() {
  if (__DEV__) return { status: "skipped_dev" };
  try {
    const Updates = require("expo-updates");
    if (!Updates?.isEnabled) return { status: "disabled" };

    const result = await Updates.checkForUpdateAsync();
    if (!result?.isAvailable) return { status: "up_to_date" };

    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
    return { status: "reloaded" };
  } catch (error) {
    if (__DEV__) {
      console.warn(
        `[OTA] check failed (${Platform.OS}):`,
        error?.message || error
      );
    }
    return { status: "error", error };
  }
}
