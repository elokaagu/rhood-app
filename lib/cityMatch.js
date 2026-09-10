/**
 * City-level matching for Discover "near you" lists.
 * Profile city is often stored as "Hackney, London, United Kingdom" — nearby
 * DJs should still match anyone whose city is London.
 */

const COUNTRY_TOKENS = new Set([
  "uk",
  "united kingdom",
  "great britain",
  "england",
  "scotland",
  "wales",
  "northern ireland",
  "usa",
  "us",
  "united states",
  "united states of america",
  "canada",
  "australia",
  "germany",
  "france",
  "spain",
  "italy",
  "netherlands",
  "sweden",
  "norway",
  "denmark",
  "ireland",
  "portugal",
  "belgium",
  "switzerland",
  "austria",
  "japan",
  "south korea",
  "brazil",
  "mexico",
  "south africa",
  "uae",
  "united arab emirates",
]);

const AREA_PREFIX = /^(north|south|east|west|central|greater|inner|outer|city of)\s+/i;

export function sanitizeIlikeFragment(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[%_,()"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractCityName(raw) {
  if (typeof raw !== "string") return "";
  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !COUNTRY_TOKENS.has(part.toLowerCase()));
  if (parts.length === 0) return raw.trim();
  return parts[parts.length - 1];
}

export function canonicalCityName(raw) {
  let city = extractCityName(raw).toLowerCase().trim();
  if (!city) return "";
  city = city.replace(AREA_PREFIX, "").trim();
  return city;
}

export function citiesShareSameCity(a, b) {
  const ca = canonicalCityName(a);
  const cb = canonicalCityName(b);
  return Boolean(ca && cb && ca === cb);
}
