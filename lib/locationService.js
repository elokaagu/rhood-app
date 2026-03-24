// Conditionally import expo-location to handle cases where native module isn't available
// This prevents crashes when running in Expo Go or when native code isn't built yet
let Location = null;
let hasLoggedMissingLocationModule = false;

function warnMissingLocationModule(context = "") {
  if (!__DEV__) return;
  if (hasLoggedMissingLocationModule) return;
  hasLoggedMissingLocationModule = true;
  console.warn(
    "⚠️ expo-location not available - native module not installed",
    context ? `(${context})` : ""
  );
}

try {
  Location = require("expo-location");
} catch (error) {
  // expo-location requires native code - will be null in Expo Go or before prebuild
  warnMissingLocationModule("module-load");
}

/**
 * Get user's current location with one-time permission request
 * @returns {Promise<{latitude: number, longitude: number} | null>}
 */
export async function getCurrentLocation() {
  if (!Location) {
    warnMissingLocationModule("getCurrentLocation");
    return null;
  }

  try {
    // Check if location services are enabled
    const isEnabled = await Location.hasServicesEnabledAsync();
    if (!isEnabled) {
      if (__DEV__) {
        console.warn("Location services disabled");
      }
      return null;
    }

    // Check existing permission first, request only if needed.
    const existingPermission = await Location.getForegroundPermissionsAsync();
    let status = existingPermission.status;
    if (status !== "granted") {
      const requestedPermission = await Location.requestForegroundPermissionsAsync();
      status = requestedPermission.status;
    }
    if (status !== "granted") {
      if (__DEV__) {
        console.warn("Location permission not granted");
      }
      return null;
    }

    // Get current position with timeout to prevent hanging
    // In some countries/areas, GPS can take a long time to get a fix (especially on first load)
    const locationPromise = Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced, // Balanced accuracy for better battery life
      maximumAge: 60000, // Accept cached location up to 1 minute old (faster if available)
    });

    // Add timeout wrapper to prevent hanging - critical for first load in new countries
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Location request timed out after 10 seconds")), 10000); // 10 second hard timeout
    });

    const location = await Promise.race([locationPromise, timeoutPromise]);

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
    };
  } catch (error) {
    console.error("Error getting location:", error);
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
  if (!Location) {
    warnMissingLocationModule("reverseGeocode");
    return null;
  }

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
 * Uses a more flexible matching algorithm that considers:
 * - Exact city name matches
 * - Partial matches (e.g., "San Francisco" matches "San Francisco, CA")
 * - Common city name variations
 * @param {string} profileCity - User's profile city
 * @param {number} latitude - Current latitude
 * @param {number} longitude - Current longitude
 * @returns {Promise<{matches: boolean, currentCity: string | null, distance: number | null}>}
 */
export async function checkLocationMatch(profileCity, latitude, longitude) {
  if (!profileCity || latitude == null || longitude == null) {
    return { matches: true, currentCity: null, distance: null };
  }

  try {
    const currentCity = await reverseGeocode(latitude, longitude);
    
    if (!currentCity) {
      // If we can't determine current city, assume match to avoid false positives
      return { matches: true, currentCity: null, distance: null };
    }
    
    // Normalize city names for comparison (case-insensitive, trim whitespace, remove common suffixes)
    const normalizeCity = (city) => {
      if (!city) return "";
      return city
        .toLowerCase()
        .trim()
        .replace(/\s*,\s*[a-z]{2}$/i, "") // Remove state abbreviations (e.g., ", CA")
        .replace(/\s*,\s*usa$/i, "") // Remove ", USA"
        .replace(/\s*,\s*united states$/i, "") // Remove ", United States"
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim();
    };

    const profileCityNormalized = normalizeCity(profileCity);
    const currentCityNormalized = normalizeCity(currentCity);

    // Check if cities match exactly
    let matches = profileCityNormalized === currentCityNormalized;

    // If no exact match, try partial matching (check if one contains the other)
    if (!matches) {
      // Check if profile city is contained in current city or vice versa
      // This handles cases like "San Francisco" vs "San Francisco, CA"
      matches = 
        currentCityNormalized.includes(profileCityNormalized) ||
        profileCityNormalized.includes(currentCityNormalized);
    }

    // If still no match, check for common city name variations
    if (!matches) {
      const cityVariations = {
        "sf": ["san francisco", "san fran"],
        "nyc": ["new york", "new york city"],
        "la": ["los angeles"],
        "dc": ["washington", "washington dc", "washington d.c."],
      };

      // Check if either city matches a variation
      for (const [key, variations] of Object.entries(cityVariations)) {
        const keyMatch = 
          profileCityNormalized === key || 
          currentCityNormalized === key;
        const variationMatch = 
          variations.some(v => profileCityNormalized.includes(v) || currentCityNormalized.includes(v));
        
        if (keyMatch && variationMatch) {
          matches = true;
          break;
        }
      }
    }

    return {
      matches,
      currentCity,
      distance: null, // Distance calculation would require profile city coordinates
    };
  } catch (error) {
    console.error("Error checking location match:", error);
    // On error, assume match to avoid false positives
    return { matches: true, currentCity: null, distance: null };
  }
}

