import Constants from "expo-constants";

/**
 * Maps key from app config (`app.config.js` → `extra.googlePlacesApiKey`).
 * Used for Places autocomplete/details and Geocoding (GPS → city). Restrict the key
 * in Google Cloud to your iOS bundle ID and Android package.
 */
export function getGooglePlacesApiKey() {
  const extra = Constants.expoConfig?.extra ?? {};
  const raw = extra.googlePlacesApiKey;
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim();
  }
  return null;
}
