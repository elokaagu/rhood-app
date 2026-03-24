/**
 * Canonical splash / intro brand assets (role-based names).
 *
 * Video: `assets/RHOOD_Logo_Spinner.mov` (iOS) — official R/HOOD logo loop.
 * Android and web use `RHOOD_Logo_Spinner.mp4` (H.264/AAC) for reliable decode.
 */

import { Platform } from "react-native";

/** Looping logo video; format chosen per platform (see file header). */
export const SPLASH_VIDEO =
  Platform.OS === "ios"
    ? require("../assets/RHOOD_Logo_Spinner.mov")
    : require("../assets/RHOOD_Logo_Spinner.mp4");

/** Static logo — used when the spinner video fails to load or decode. */
export const SPLASH_LOGO = require("../assets/rhood_logo.png");

/**
 * White wordmark image — sits on the dark splash background below the spinner.
 */
export const SPLASH_LETTERING = require("../assets/RHOOD_Lettering_White.png");
