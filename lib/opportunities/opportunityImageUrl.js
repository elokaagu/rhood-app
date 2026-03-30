/**
 * Opportunity hero images are often full-resolution URLs. Prefer smaller variants
 * where the host supports it, and pair with expo-image disk cache in the UI.
 *
 * Note: Supabase `/storage/v1/render/image/` is only available when Storage image
 * transformations are enabled on the project; we do not rewrite object URLs here.
 *
 * @param {string | null | undefined} raw
 * @returns {string | null}
 */
export function optimizeOpportunityImageUrl(raw) {
  if (raw == null || typeof raw !== "string") return null;
  const u = raw.trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) return u;

  try {
    const url = new URL(u);

    if (url.hostname.includes("images.unsplash.com")) {
      if (!url.searchParams.has("w")) {
        // ~2× card width at 400pt height — enough sharpness, less download than full-res
        url.searchParams.set("w", "900");
        url.searchParams.set("q", "80");
        url.searchParams.set("auto", "format");
      }
      return url.toString();
    }
  } catch {
    return u;
  }

  return u;
}
