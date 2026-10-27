/**
 * Genre list shared with Studio's opportunity brief template. Used for DJ
 * profile genres and opportunity genres so both sides speak the same names.
 */
export const OPPORTUNITY_GENRES = [
  "House",
  "Tech House",
  "Deep House",
  "Techno",
  "Electronic",
  "R&B",
  "Hip-Hop",
  "Amapiano",
  "Afrobeats",
  "Garage",
  "Disco",
  "Funk",
  "Drum & Bass",
  "Dubstep",
  "Trap",
  "Progressive",
  "Trance",
  "Ambient",
  "Breakbeat",
];

/** Literal value Studio stores in opportunities.genre for open-to-everyone briefs. */
export const ALL_GENRES = "All genres";

/**
 * Comparison key: case, spacing and punctuation are ignored, so
 * "Hip-Hop", "Hip Hop" and "hip hop" are the same genre.
 */
export function genreKey(genre) {
  return String(genre ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9&]+/g, "");
}

const CANONICAL_BY_KEY = new Map(OPPORTUNITY_GENRES.map((g) => [genreKey(g), g]));

/** Map a stored genre onto the shared list's spelling when it matches one. */
export function canonicalGenre(genre) {
  const trimmed = String(genre ?? "").trim();
  if (!trimmed) return "";
  return CANONICAL_BY_KEY.get(genreKey(trimmed)) || trimmed;
}

/** Canonicalise and de-duplicate a genre array, keeping first-seen order. */
export function canonicalGenreList(genres) {
  const seen = new Set();
  const out = [];
  for (const g of Array.isArray(genres) ? genres : []) {
    const name = canonicalGenre(g);
    const key = genreKey(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  return out;
}

export function isAllGenres(genreString) {
  return genreKey(genreString) === genreKey(ALL_GENRES);
}

/**
 * Split opportunities.genre ("House, Techno") into display names.
 * "All genres" stays as a single entry; empty yields [].
 */
export function parseOpportunityGenres(genreString) {
  if (typeof genreString !== "string" || !genreString.trim()) return [];
  if (isAllGenres(genreString)) return [ALL_GENRES];
  return canonicalGenreList(genreString.split(","));
}

/** True when a free-text search query matches a genre ("hip hop" finds "Hip-Hop"). */
export function genreMatchesQuery(genre, query) {
  const q = genreKey(query);
  if (!q) return false;
  return genreKey(genre).includes(q);
}
