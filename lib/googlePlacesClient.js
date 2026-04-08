/**
 * Google Maps Platform (legacy REST) — Places Autocomplete/Details + Geocoding.
 * Enable **Places API** and **Geocoding API** in Google Cloud; restrict the key to your apps.
 */

const AUTOCOMPLETE_URL = "https://maps.googleapis.com/maps/api/place/autocomplete/json";
const DETAILS_URL = "https://maps.googleapis.com/maps/api/place/details/json";
const GEOCODE_URL = "https://maps.googleapis.com/maps/api/geocode/json";

/** @param {{ address_components?: Array<{ long_name: string, types: string[] }>, formatted_address?: string }} result */
export function formatCityLabelFromPlaceResult(result) {
  const comps = result.address_components || [];
  const get = (type) =>
    comps.find((c) => Array.isArray(c.types) && c.types.includes(type))?.long_name;

  const specificPlace =
    get("sublocality_level_1") ||
    get("sublocality") ||
    get("neighborhood") ||
    get("premise") ||
    get("route");

  const city =
    get("locality") ||
    get("postal_town") ||
    get("administrative_area_level_2") ||
    get("sublocality") ||
    get("sublocality_level_1");
  const country = get("country");
  const admin1 = get("administrative_area_level_1");

  const parts = [];
  if (specificPlace) parts.push(specificPlace);
  if (city) parts.push(city);

  if (country === "United States" && admin1) {
    parts.push(admin1);
  } else if (country) {
    if (admin1 && admin1 !== city) parts.push(admin1);
    parts.push(country);
  } else if (admin1 && admin1 !== city) {
    parts.push(admin1);
  }

  const uniqueParts = parts.filter(
    (part, idx) =>
      part &&
      parts.findIndex(
        (candidate) => candidate?.toLowerCase() === part.toLowerCase()
      ) === idx
  );
  if (uniqueParts.length > 0) {
    return uniqueParts.join(", ");
  }

  if (result.formatted_address) {
    const addressParts = result.formatted_address.split(",").map((s) => s.trim());
    return addressParts.slice(0, 3).join(", ") || result.formatted_address;
  }
  return null;
}

/**
 * @param {string} input
 * @param {string} apiKey
 * @param {string} sessionToken
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array<{ placeId: string, title: string, subtitle: string, description: string }>>}
 */
export async function fetchCityPredictions(input, apiKey, sessionToken, signal) {
  const q = input?.trim();
  if (!apiKey || !q || q.length < 2) return [];

  const params = new URLSearchParams({
    input: q,
    key: apiKey,
    types: "geocode",
    sessiontoken: sessionToken,
  });

  const res = await fetch(`${AUTOCOMPLETE_URL}?${params.toString()}`, { signal });
  const data = await res.json();

  if (data.status === "ZERO_RESULTS") return [];
  if (data.status !== "OK") {
    if (__DEV__) {
      console.warn(
        "[googlePlaces] autocomplete:",
        data.status,
        data.error_message || ""
      );
    }
    return [];
  }

  return (data.predictions || []).map((p) => ({
    placeId: p.place_id,
    title: p.structured_formatting?.main_text || p.description || "",
    subtitle: p.structured_formatting?.secondary_text || "",
    description: p.description || "",
  }));
}

/**
 * @param {string} placeId
 * @param {string} apiKey
 * @param {string} sessionToken
 * @param {AbortSignal} [signal]
 * @returns {Promise<string>}
 */
export async function resolveCityLabelFromPlaceId(
  placeId,
  apiKey,
  sessionToken,
  signal
) {
  const params = new URLSearchParams({
    place_id: placeId,
    key: apiKey,
    fields: "address_component,formatted_address",
    sessiontoken: sessionToken,
  });

  const res = await fetch(`${DETAILS_URL}?${params.toString()}`, { signal });
  const data = await res.json();

  if (data.status !== "OK" || !data.result) {
    throw new Error(data.error_message || "Place details failed");
  }

  const label = formatCityLabelFromPlaceResult(data.result);
  if (!label) {
    throw new Error("Could not read city from place");
  }
  return label;
}

/**
 * Reverse-geocode GPS coordinates to a city label (same formatting as Place Details).
 * @param {number} lat
 * @param {number} lng
 * @param {string} apiKey
 * @param {AbortSignal} [signal]
 * @returns {Promise<string | null>}
 */
export async function reverseGeocodeLatLngWithGoogle(lat, lng, apiKey, signal) {
  if (!apiKey || lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  const params = new URLSearchParams({
    latlng: `${lat},${lng}`,
    key: apiKey,
  });

  const res = await fetch(`${GEOCODE_URL}?${params.toString()}`, { signal });
  const data = await res.json();

  if (data.status !== "OK" || !Array.isArray(data.results) || data.results.length === 0) {
    if (__DEV__) {
      console.warn(
        "[googlePlaces] geocode:",
        data.status,
        data.error_message || ""
      );
    }
    return null;
  }

  for (const result of data.results) {
    const label = formatCityLabelFromPlaceResult(result);
    if (label) {
      return label.length > 100 ? label.slice(0, 100) : label;
    }
  }
  return null;
}
