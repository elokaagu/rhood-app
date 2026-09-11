/**
 * Parse lock-screen / Control Center seek events from native Now Playing.
 * A non-finite or negative position must never reach expo-av (native crash).
 */
export function parseRemoteSeekSeconds(payload) {
  const seconds = Number(payload?.position);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  return seconds;
}
