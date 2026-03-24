/**
 * Best-effort play count from a `mixes` row (column names vary by schema/migrations).
 * Kept dependency-free so trending / fetch code never pulls in React Native via yourLikesUtils.
 */

export function resolveMixPlayCount(mix) {
  if (!mix || typeof mix !== "object") return 0;
  const candidates = [
    mix.play_count,
    mix.plays,
    mix.plays_count,
    mix.total_plays,
    mix.listen_count,
    mix.streams,
  ];
  for (const c of candidates) {
    if (c == null || c === "") continue;
    const n = typeof c === "string" ? parseInt(c, 10) : Number(c);
    if (Number.isFinite(n) && n >= 0) return Math.floor(n);
  }
  return 0;
}
