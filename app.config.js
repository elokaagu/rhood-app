/**
 * Dynamic Expo config — keeps secrets out of git. Copy `.env.example` → `.env`
 * and set `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`. For EAS builds, define the same
 * variable in Expo dashboard or `eas env:create`.
 */
require("dotenv").config();

const appJson = require("./app.json");

module.exports = () => {
  const key = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY?.trim() || "";
  const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() || "";
  const plugins = [...(appJson.expo.plugins || [])];
  if (process.env.SENTRY_ORG && process.env.SENTRY_PROJECT) {
    plugins.push([
      "@sentry/react-native/expo",
      {
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
      },
    ]);
  }
  return {
    expo: {
      ...appJson.expo,
      plugins,
      extra: {
        ...(appJson.expo.extra || {}),
        googlePlacesApiKey: key,
        sentryDsn,
      },
    },
  };
};
