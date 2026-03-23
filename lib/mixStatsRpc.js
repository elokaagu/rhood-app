import { supabase } from "./supabase";

/**
 * Fire-and-forget: increment plays when a mix starts (any listener).
 * Needs `increment_mix_play_count` RPC — see database/mix-stats-rpc.sql.
 */
export function recordMixPlayStarted(mixId) {
  if (mixId == null || mixId === "") return;
  const id = String(mixId);
  supabase
    .rpc("increment_mix_play_count", { p_mix_id: id })
    .then(({ error }) => {
      if (error && __DEV__) {
        console.warn(
          "[mixStatsRpc] increment_mix_play_count:",
          error.message || error
        );
      }
    })
    .catch(() => {});
}

/**
 * Backfill duration when DB has null/0 but the player knows the real length.
 * Needs `backfill_mix_duration_seconds` RPC — see database/mix-stats-rpc.sql.
 */
export function backfillMixDurationFromPlayback(mixId, seconds) {
  const sec = Math.floor(Number(seconds) || 0);
  if (mixId == null || mixId === "" || sec <= 0) return;
  const id = String(mixId);
  supabase
    .rpc("backfill_mix_duration_seconds", {
      p_mix_id: id,
      p_seconds: sec,
    })
    .then(({ error }) => {
      if (error && __DEV__) {
        console.warn(
          "[mixStatsRpc] backfill_mix_duration_seconds:",
          error.message || error
        );
      }
    })
    .catch(() => {});
}
