/**
 * Account-level helpers shared across discovery/connections services.
 *
 * Brand profiles (Studio/org accounts such as Soundboks) must not appear
 * in DJ directories, carousels, or people-search. Matching is by role,
 * email prefix, known brand domain, or brand name in profile fields.
 */

const BRAND_EMAIL_PREFIXES = [
  /^team@/i,
  /^support@/i,
  /^info@/i,
  /^admin@/i,
  /^contact@/i,
  /^hello@/i,
  /^noreply@/i,
  /^no-reply@/i,
];

const BRAND_DOMAINS = [
  "soundboks.com",
  "soundbloks.com",
  "soundblok.com",
];

const BRAND_NAME_MARKERS = ["soundboks", "soundbloks", "soundblok"];

const BRAND_ROLES = new Set(["brand"]);

const PLACEHOLDER_NAMES = new Set(["dj", "user", "r/hood", "rhood"]);

function normalize(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function emailLooksLikeBrand(email) {
  const emailLower = normalize(email);
  if (!emailLower) return false;
  if (BRAND_EMAIL_PREFIXES.some((pattern) => pattern.test(emailLower))) {
    return true;
  }
  const domain = emailLower.split("@")[1] || "";
  if (BRAND_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))) {
    return true;
  }
  return BRAND_NAME_MARKERS.some((marker) => emailLower.includes(marker));
}

function profileTextLooksLikeBrand(profile) {
  const haystack = [
    profile.email,
    profile.dj_name,
    profile.djName,
    profile.full_name,
    profile.fullName,
    profile.first_name,
    profile.firstName,
    profile.last_name,
    profile.lastName,
    profile.username,
    profile.bio,
    profile.name,
  ]
    .map(normalize)
    .filter(Boolean)
    .join(" ");
  if (!haystack) return false;
  return BRAND_NAME_MARKERS.some((marker) => haystack.includes(marker));
}

function roleLooksLikeBrand(profile) {
  return BRAND_ROLES.has(normalize(profile?.role));
}

/**
 * @param {string | { email?: string, dj_name?: string, full_name?: string, username?: string, bio?: string, name?: string, role?: string } | null} profileOrEmail
 */
export function isBrandAccount(profileOrEmail) {
  if (!profileOrEmail) return false;
  if (typeof profileOrEmail === "string") {
    return emailLooksLikeBrand(profileOrEmail);
  }
  if (typeof profileOrEmail !== "object") return false;
  return (
    roleLooksLikeBrand(profileOrEmail) ||
    emailLooksLikeBrand(profileOrEmail.email) ||
    profileTextLooksLikeBrand(profileOrEmail)
  );
}

export function hasDirectoryName(profile) {
  const name = (
    profile?.dj_name ||
    profile?.djName ||
    profile?.full_name ||
    profile?.fullName ||
    profile?.name ||
    ""
  ).trim();
  if (!name) return false;
  return !PLACEHOLDER_NAMES.has(name.toLowerCase());
}

export function hasDirectoryPhoto(profile) {
  const url = (
    profile?.profile_image_url ||
    profile?.profileImage ||
    ""
  )
    .toString()
    .trim();
  if (!url) return false;
  const lower = url.toLowerCase();
  return lower !== "null" && lower !== "undefined";
}

/** DJ listings that are complete enough to show in Discover / search. */
export function isDirectoryReadyDj(profile) {
  if (!profile) return false;
  if (isBrandAccount(profile)) return false;
  return hasDirectoryName(profile) && hasDirectoryPhoto(profile);
}

export function filterNonBrandProfiles(rows) {
  return (rows || []).filter((p) => !isBrandAccount(p));
}

export function filterDirectoryDjs(rows) {
  return (rows || []).filter(isDirectoryReadyDj);
}

export function excludeUserIds(rows, blockedIds) {
  if (!blockedIds?.length) return rows || [];
  const blocked = new Set(blockedIds);
  return (rows || []).filter((row) => row?.id && !blocked.has(row.id));
}
