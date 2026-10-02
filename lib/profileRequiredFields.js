/**
 * NOT NULL text columns on user_profiles with no default. Explicit nulls are
 * sent as "" — absent keys are left alone so an upsert never blanks an
 * existing value.
 */
export const REQUIRED_PROFILE_TEXT_COLUMNS = [
  "dj_name",
  "first_name",
  "last_name",
  "city",
];

/**
 * Row written when a DJ finishes onboarding. DJ name falls back to their real
 * name, then the email local part; city may be blank (location is optional).
 */
export function buildOnboardingProfilePayload(djProfile = {}, email = "") {
  const firstName = djProfile.first_name || djProfile.firstName || "";
  const lastName = djProfile.last_name || djProfile.lastName || "";
  const djName =
    djProfile.dj_name?.trim() ||
    djProfile.djName?.trim() ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    (email ? email.split("@")[0] : "") ||
    "DJ";
  const genres = Array.isArray(djProfile.genres) ? djProfile.genres : [];
  const city = djProfile.city?.trim() || "";

  return {
    dj_name: djName,
    first_name: firstName,
    last_name: lastName,
    instagram: djProfile.instagram || null,
    soundcloud: djProfile.soundcloud || null,
    tiktok: djProfile.tiktok || null,
    youtube: djProfile.youtube || null,
    city,
    genres,
    bio: city
      ? `DJ from ${city} specializing in ${genres.join(", ")}`
      : `DJ specializing in ${genres.join(", ")}`,
    profile_image_url: djProfile.profile_image_url || null,
  };
}

export function withRequiredProfileText(row) {
  const out = { ...row };
  for (const col of REQUIRED_PROFILE_TEXT_COLUMNS) {
    if (col in out && out[col] == null) out[col] = "";
  }
  return out;
}
