export const MIN_MIX_GENRES = 1;
export const GENRE_OTHER = "Other";

const PRESET_MIX_GENRES = new Set([
  "House",
  "Techno",
  "R&B",
  "Soul",
  "Hip-Hop",
  "Electronic",
  "Drum & Bass",
  "Dubstep",
  "Trance",
  "Deep House",
  "Tech House",
  "Disco",
  "Funk",
]);

/** Swap the Other chip for the typed custom genre before storage. */
export function resolveMixGenres(genres, customGenre) {
  const custom = typeof customGenre === "string" ? customGenre.trim() : "";
  return (Array.isArray(genres) ? genres : [])
    .map((g) => (g === GENRE_OTHER ? custom : g))
    .filter(Boolean);
}

/** Split a stored comma list back into chips + custom Other text. */
export function parseMixGenresForForm(genreString) {
  const parsed =
    typeof genreString === "string"
      ? genreString
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean)
      : [];
  const genres = [];
  const customParts = [];
  for (const g of parsed) {
    if (PRESET_MIX_GENRES.has(g)) genres.push(g);
    else if (g && g !== GENRE_OTHER) customParts.push(g);
  }
  if (customParts.length) genres.push(GENRE_OTHER);
  return { genres, customGenre: customParts.join(", ") };
}
