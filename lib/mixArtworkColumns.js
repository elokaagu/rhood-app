/**
 * Portal (Studio) reads mixes.image_url; the app reads mixes.artwork_url.
 * Always persist the public artwork URL on both columns.
 */
export function mixArtworkColumns(url) {
  const trimmed = typeof url === "string" ? url.trim() : "";
  if (!trimmed) return {};
  return { artwork_url: trimmed, image_url: trimmed };
}
