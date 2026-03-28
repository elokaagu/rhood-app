/**
 * Dynamic Expo config — keeps secrets out of git. Copy `.env.example` → `.env`
 * and set `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY`. For EAS builds, define the same
 * variable in Expo dashboard or `eas env:create`.
 */
require("dotenv").config();

const appJson = require("./app.json");

module.exports = () => {
  const key = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY?.trim() || "";
  return {
    expo: {
      ...appJson.expo,
      extra: {
        ...(appJson.expo.extra || {}),
        googlePlacesApiKey: key,
      },
    },
  };
};
