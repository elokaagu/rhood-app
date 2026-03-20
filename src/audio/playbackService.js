// src/audio/playbackService.js
// Playback service for react-native-track-player (see Podfile / project for version; typically v4.x).
// Handles remote events: lock screen, Control Center, BT, CarPlay.

/** Dev-only logs; avoids flooding production / device logs from progress & state. */
const log = __DEV__ ? (...args) => console.log(...args) : () => {};
const logWarn = __DEV__ ? (...args) => console.warn(...args) : () => {};

/** Subscriptions from the last service run — removed if the service entry runs again (e.g. dev reload). */
let activeSubscriptions = [];

function clearSubscriptions() {
  for (const sub of activeSubscriptions) {
    try {
      if (sub && typeof sub.remove === "function") sub.remove();
    } catch (_e) {
      /* ignore */
    }
  }
  activeSubscriptions = [];
}

function subscribe(TrackPlayer, event, handler) {
  const sub = TrackPlayer.addEventListener(event, handler);
  if (sub && typeof sub.remove === "function") {
    activeSubscriptions.push(sub);
  }
}

/**
 * Clamp seek position when duration is known; otherwise allow any non-negative seek.
 */
function clampSeekPosition(position, duration) {
  const p = Number(position);
  if (!Number.isFinite(p) || p < 0) return null;
  if (
    typeof duration === "number" &&
    Number.isFinite(duration) &&
    duration > 0
  ) {
    return Math.min(p, Math.max(0, duration));
  }
  return p;
}

module.exports = async function playbackService() {
  log("🎧 [SERVICE] Playback service starting...");

  clearSubscriptions();

  let TrackPlayer;
  let Event;
  let State;

  try {
    // Plain require: service runs only in native dev/prod builds where the module exists.
    const trackPlayerModule = require("react-native-track-player");

    if (!trackPlayerModule) {
      logWarn("⚠️ [SERVICE] TrackPlayer module not available");
      return;
    }

    TrackPlayer = trackPlayerModule.default || trackPlayerModule;
    Event = trackPlayerModule.Event;
    State = trackPlayerModule.State;

    if (!TrackPlayer || !Event) {
      logWarn("⚠️ [SERVICE] TrackPlayer or Event not available");
      return;
    }

    log("✅ [SERVICE] TrackPlayer module loaded successfully");
  } catch (error) {
    logWarn("⚠️ [SERVICE] Failed to load TrackPlayer:", error?.message);
    return;
  }

  // REMOTE PLAY
  subscribe(TrackPlayer, Event.RemotePlay, async () => {
    log("🎧 [SERVICE] RemotePlay");
    try {
      await TrackPlayer.play();
      log("✅ [SERVICE] Playback resumed (RemotePlay)");
    } catch (error) {
      console.error("❌ [SERVICE] RemotePlay error:", error);
    }
  });

  // REMOTE PAUSE
  subscribe(TrackPlayer, Event.RemotePause, async () => {
    log("🎧 [SERVICE] RemotePause");
    try {
      await TrackPlayer.pause();
      log("✅ [SERVICE] Playback paused (RemotePause)");
    } catch (error) {
      console.error("❌ [SERVICE] RemotePause error:", error);
    }
  });

  // REMOTE STOP
  subscribe(TrackPlayer, Event.RemoteStop, async () => {
    log("🎧 [SERVICE] RemoteStop");
    try {
      await TrackPlayer.stop();
      log("✅ [SERVICE] Playback stopped (RemoteStop)");
    } catch (error) {
      console.error("❌ [SERVICE] RemoteStop error:", error);
    }
  });

  // REMOTE NEXT
  subscribe(TrackPlayer, Event.RemoteNext, async () => {
    log("🎧 [SERVICE] RemoteNext");
    try {
      const queue = await TrackPlayer.getQueue();
      const currentIndex = await TrackPlayer.getCurrentTrack();

      if (
        queue.length > 0 &&
        currentIndex !== null &&
        currentIndex !== undefined &&
        currentIndex < queue.length - 1
      ) {
        await TrackPlayer.skipToNext();
        log("✅ [SERVICE] Skipped to next");
      } else {
        log("⚠️ [SERVICE] No next track");
      }
    } catch (error) {
      console.error("❌ [SERVICE] RemoteNext error:", error);
    }
  });

  // REMOTE PREVIOUS — never skipToPrevious on first track when position ≤ 3s
  subscribe(TrackPlayer, Event.RemotePrevious, async () => {
    log("🎧 [SERVICE] RemotePrevious");
    try {
      const currentIndex = await TrackPlayer.getCurrentTrack();
      const position = await TrackPlayer.getPosition();
      const idx =
        currentIndex === null || currentIndex === undefined ? -1 : currentIndex;

      if (idx > 0) {
        if (position > 3) {
          await TrackPlayer.seekTo(0);
          log("✅ [SERVICE] Seek to start (same track, >3s)");
        } else {
          await TrackPlayer.skipToPrevious();
          log("✅ [SERVICE] Skipped to previous");
        }
      } else {
        await TrackPlayer.seekTo(0);
        log("✅ [SERVICE] First track — seek to 0");
      }
    } catch (error) {
      console.error("❌ [SERVICE] RemotePrevious error:", error);
    }
  });

  // REMOTE SEEK — seek if position valid; clamp only when duration is known
  subscribe(TrackPlayer, Event.RemoteSeek, async ({ position }) => {
    log(`🎧 [SERVICE] RemoteSeek ${position}s`);
    try {
      const duration = await TrackPlayer.getDuration();
      const target = clampSeekPosition(position, duration);
      if (target === null) {
        logWarn(`⚠️ [SERVICE] Invalid seek: ${position}`);
        return;
      }
      await TrackPlayer.seekTo(target);
      log(`✅ [SERVICE] Seeked to ${target}s`);
    } catch (error) {
      console.error("❌ [SERVICE] RemoteSeek error:", error);
    }
  });

  // REMOTE JUMP FORWARD — do not use duration || 0 (would jump to 0 when unknown)
  subscribe(TrackPlayer, Event.RemoteJumpForward, async () => {
    log("🎧 [SERVICE] RemoteJumpForward");
    try {
      const position = await TrackPlayer.getPosition();
      const duration = await TrackPlayer.getDuration();
      const newPosition =
        typeof duration === "number" &&
        Number.isFinite(duration) &&
        duration > 0
          ? Math.min(position + 15, duration)
          : position + 15;
      await TrackPlayer.seekTo(newPosition);
      log(`✅ [SERVICE] Jump forward → ${newPosition}s`);
    } catch (error) {
      console.error("❌ [SERVICE] RemoteJumpForward error:", error);
    }
  });

  // REMOTE JUMP BACKWARD
  subscribe(TrackPlayer, Event.RemoteJumpBackward, async () => {
    log("🎧 [SERVICE] RemoteJumpBackward");
    try {
      const position = await TrackPlayer.getPosition();
      const newPosition = Math.max(position - 15, 0);
      await TrackPlayer.seekTo(newPosition);
      log(`✅ [SERVICE] Jump backward → ${newPosition}s`);
    } catch (error) {
      console.error("❌ [SERVICE] RemoteJumpBackward error:", error);
    }
  });

  // PLAYBACK STATE — debug only (fires occasionally)
  subscribe(TrackPlayer, Event.PlaybackState, async ({ state }) => {
    log(`🎧 [SERVICE] PlaybackState: ${state}`);
  });

  // TRACK CHANGED — debug only
  subscribe(TrackPlayer, Event.PlaybackTrackChanged, async (payload) => {
    const track = payload?.track;
    log(
      `🎧 [SERVICE] PlaybackTrackChanged: track=${track?.id ?? track}, position=${payload?.position}`
    );
  });

  // PROGRESS — very frequent; no logging (App.js may listen separately)
  subscribe(TrackPlayer, Event.PlaybackProgressUpdated, async () => {});

  log("✅ [SERVICE] Remote handlers registered");
  log("🎧 [SERVICE] Lock screen controls active");
};
