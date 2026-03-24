import { supabase } from "./supabase";

function fireAndForgetRpc(name, params) {
  supabase
    .rpc(name, params)
    .then(({ error }) => {
      if (error && __DEV__) {
        console.warn(`[mixStatsRpc] ${name}:`, error.message || error);
      }
    })
    .catch((err) => {
      if (__DEV__) {
        console.warn(
          `[mixStatsRpc] ${name} request failed:`,
          err?.message || err
        );
      }
    });
}

/**
 * Fire-and-forget: increment plays when a mix starts (any listener).
 * Needs `increment_mix_play_count` RPC — see database/mix-stats-rpc.sql.
 */
export function recordMixPlayStarted(mixId) {
  if (mixId == null || mixId === "") return;
  fireAndForgetRpc("increment_mix_play_count", { p_mix_id: String(mixId) });
}

/**
 * Backfill duration when DB has null/0 but the player knows the real length.
 * Needs `backfill_mix_duration_seconds` RPC — see database/mix-stats-rpc.sql.
 */
export function backfillMixDurationFromPlayback(mixId, seconds) {
  const sec = Math.floor(Number(seconds) || 0);
  if (mixId == null || mixId === "" || sec <= 0) return;
  fireAndForgetRpc("backfill_mix_duration_seconds", {
    p_mix_id: String(mixId),
    p_seconds: sec,
  });
}
