/**
 * Canonical splash / intro brand assets (role-based names).
 *
 * Video: `assets/RHOOD_Logo_Spinner.mov` — official R/HOOD logo loop.
 *
 * Metro resolves every static `require()` when building the bundle, even inside
 * `Platform.OS` branches. Do not `require()` an `.mp4` here unless that file
 * exists in `assets/`, or the packager fails on all platforms (including iOS).
 *
 * When you add `RHOOD_Logo_Spinner.mp4` for Android, use RN platform assets, e.g.
 * `RHOOD_Logo_Spinner.mov` + `RHOOD_Logo_Spinner.android.mp4` and
 * `require("../assets/RHOOD_Logo_Spinner")` (no extension) so Metro picks per platform.
 */

/** Looping logo video */
export const SPLASH_VIDEO = require("../assets/RHOOD_Logo_Spinner.mov");

/** Static logo — used when the spinner video fails to load or decode. */
export const SPLASH_LOGO = require("../assets/rhood_logo.png");

/**
 * White wordmark image — sits on the dark splash background below the spinner.
 */
export const SPLASH_LETTERING = require("../assets/RHOOD_Lettering_White.png");
