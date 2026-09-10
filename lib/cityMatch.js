/**
 * City-level matching for Discover "near you" lists.
 * Profile city is often stored as "Hackney, London, United Kingdom" or just
 * "Barnet" — nearby DJs should still match anyone in London.
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

const LONDON_BOROUGHS = new Set([
  "barnet",
  "barking",
  "barking and dagenham",
  "dagenham",
  "bexley",
  "brent",
  "bromley",
  "camden",
  "croydon",
  "ealing",
  "enfield",
  "greenwich",
  "hackney",
  "hammersmith",
  "hammersmith and fulham",
  "fulham",
  "haringey",
  "harrow",
  "havering",
  "hillingdon",
  "hounslow",
  "islington",
  "kensington",
  "chelsea",
  "kensington and chelsea",
  "kingston",
  "kingston upon thames",
  "lambeth",
  "lewisham",
  "merton",
  "newham",
  "redbridge",
  "richmond",
  "richmond upon thames",
  "southwark",
  "sutton",
  "tower hamlets",
  "waltham forest",
  "wandsworth",
  "westminster",
  "shoreditch",
  "soho",
  "brixton",
  "peckham",
  "dalston",
  "stratford",
]);

const PARENT_CITY = {
  manhattan: "new york",
  brooklyn: "new york",
  queens: "new york",
  bronx: "new york",
  "staten island": "new york",
  nyc: "new york",
};

export function sanitizeIlikeFragment(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[%_,()"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeToken(part) {
  let token = String(part || "")
    .toLowerCase()
    .trim();
  if (!token || COUNTRY_TOKENS.has(token)) return "";
  token = token.replace(AREA_PREFIX, "").trim();
  if (LONDON_BOROUGHS.has(token)) return "london";
  if (PARENT_CITY[token]) return PARENT_CITY[token];
  return token;
}

export function cityTokens(raw) {
  if (typeof raw !== "string" || !raw.trim()) return [];
  const parts = raw
    .split(",")
    .map((part) => normalizeToken(part))
    .filter(Boolean);
  return [...new Set(parts)];
}

export function extractCityName(raw) {
  const tokens = cityTokens(raw);
  if (tokens.length === 0) return typeof raw === "string" ? raw.trim() : "";
  return tokens[tokens.length - 1];
}

export function canonicalCityName(raw) {
  return extractCityName(raw).toLowerCase().trim();
}

export function citiesShareSameCity(a, b) {
  const tokensA = cityTokens(a);
  const tokensB = cityTokens(b);
  if (tokensA.length === 0 || tokensB.length === 0) return false;
  return tokensA.some((token) => tokensB.includes(token));
}

/** Extra ILIKE needles so "Barnet" still matches a user whose city is "London". */
export function citySearchAliases(raw) {
  const canonical = canonicalCityName(raw);
  if (!canonical) return [];
  const aliases = new Set([canonical]);
  if (canonical === "london") {
    LONDON_BOROUGHS.forEach((borough) => aliases.add(borough));
  }
  return [...aliases].map((alias) => sanitizeIlikeFragment(alias)).filter(Boolean);
}
