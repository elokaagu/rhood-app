/**
 * Display names for 1:1 chat (DJ ↔ DJ and Brand ↔ DJ).
 */
import { isBrandAccount } from "./accountUtils";

/**
 * @param {{ brand_name?: string, dj_name?: string, full_name?: string, username?: string, role?: string, email?: string } | null | undefined} profile
 * @returns {string}
 */
export function getMessagingDisplayName(profile) {
  if (!profile) return "Unknown";
  const brandName =
    typeof profile.brand_name === "string" ? profile.brand_name.trim() : "";
  if (brandName) return brandName;
  const djName = typeof profile.dj_name === "string" ? profile.dj_name.trim() : "";
  const fullName =
    typeof profile.full_name === "string" ? profile.full_name.trim() : "";
  const username =
    typeof profile.username === "string" ? profile.username.trim() : "";
  if (isBrandAccount(profile) || String(profile.role || "").toLowerCase() === "brand") {
    return djName || fullName || username || "Brand";
  }
  return djName || fullName || username || "DJ";
}

/**
 * @param {{ brand_name?: string, role?: string, email?: string } | null | undefined} profile
 */
export function isMessagingBrandProfile(profile) {
  if (!profile) return false;
  if (String(profile.role || "").toLowerCase() === "brand") return true;
  if (typeof profile.brand_name === "string" && profile.brand_name.trim()) {
    return true;
  }
  return isBrandAccount(profile);
}
