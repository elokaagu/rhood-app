import * as Location from "expo-location";
import { Alert } from "react-native";

/**
 * Get user's current location with one-time permission request
 * @returns {Promise<{latitude: number, longitude: number} | null>}
 */
export async function getCurrentLocation() {
  try {
    // Check if location services are enabled
    const isEnabled = await Location.hasServicesEnabledAsync();
    if (!isEnabled) {
      Alert.alert(
        "Location Services Disabled",
        "Please enable location services in your device settings to see nearby opportunities.",
        [{ text: "OK" }]
      );
      return null;
    }

    // Request permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Location Permission Required",
        "We need your location to show nearby opportunities and calculate distances. You can enable this in your device settings.",
        [{ text: "OK" }]
      );
      return null;
    }

    // Get current position
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced, // Balanced accuracy for better battery life
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
    };
  } catch (error) {
    console.error("Error getting location:", error);
    Alert.alert(
      "Location Error",
      "Unable to get your location. Please check your device settings.",
      [{ text: "OK" }]
    );
    return null;
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in kilometers
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
}

/**
 * Convert degrees to radians
 */
function toRad(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Format distance for display
 * @param {number} distanceKm - Distance in kilometers
 * @returns {string} Formatted distance string
 */
export function formatDistance(distanceKm) {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m away`;
  } else if (distanceKm < 10) {
    return `${distanceKm.toFixed(1)}km away`;
  } else {
    return `${Math.round(distanceKm)}km away`;
  }
}

/**
 * Reverse geocode coordinates to get city name
 * @param {number} latitude
 * @param {number} longitude
 * @returns {Promise<string | null>} City name or null
 */
export async function reverseGeocode(latitude, longitude) {
  try {
    const addresses = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (addresses && addresses.length > 0) {
      const address = addresses[0];
      return address.city || address.subAdministrativeArea || null;
    }
    return null;
  } catch (error) {
    console.error("Error reverse geocoding:", error);
    return null;
  }
}

/**
 * Check if user's current location matches their profile city
 * @param {string} profileCity - User's profile city
 * @param {number} latitude - Current latitude
 * @param {number} longitude - Current longitude
 * @returns {Promise<{matches: boolean, currentCity: string | null, distance: number | null}>}
 */
export async function checkLocationMatch(profileCity, latitude, longitude) {
  if (!profileCity || !latitude || !longitude) {
    return { matches: true, currentCity: null, distance: null };
  }

  try {
    const currentCity = await reverseGeocode(latitude, longitude);
    
    // Normalize city names for comparison (case-insensitive, trim whitespace)
    const normalizeCity = (city) => {
      if (!city) return "";
      return city.toLowerCase().trim();
    };

    const profileCityNormalized = normalizeCity(profileCity);
    const currentCityNormalized = normalizeCity(currentCity);

    // Check if cities match
    const matches = profileCityNormalized === currentCityNormalized;

    return {
      matches,
      currentCity,
      distance: null, // Distance calculation would require profile city coordinates
    };
  } catch (error) {
    console.error("Error checking location match:", error);
    return { matches: true, currentCity: null, distance: null };
  }
}

