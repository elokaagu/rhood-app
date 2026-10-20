/**
 * In-app "data changed" signals so screens refresh right after the user edits
 * something, instead of waiting for a cache to expire or an app restart.
 *
 * Topics:
 *   "profile" — the signed-in user's profile changed (photo, name, bio, …)
 *   "mixes"   — a mix was uploaded, edited or deleted; payload `{ mix }` when known
 */
const listeners = new Map();

export function onAppDataChanged(topic, callback) {
  if (!listeners.has(topic)) listeners.set(topic, new Set());
  listeners.get(topic).add(callback);
  return () => listeners.get(topic)?.delete(callback);
}

export function emitAppDataChanged(topic, payload) {
  const set = listeners.get(topic);
  if (!set) return;
  set.forEach((callback) => {
    try {
      callback(payload);
    } catch (error) {
      if (__DEV__) console.warn(`[appDataEvents] ${topic} listener failed:`, error);
    }
  });
}
