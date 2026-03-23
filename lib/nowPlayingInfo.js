// lib/nowPlayingInfo.js
// iOS: native NowPlayingInfoModule → MPNowPlayingInfoCenter + MPRemoteCommandCenter.
// Remote command events are consumed in hooks/useAudioPlayback.js (NativeEventEmitter).
// Android lock screen / media style: lib/lockScreenControls.js

import { Platform, NativeModules } from "react-native";

const NativeNowPlaying =
  Platform.OS === "ios" ? NativeModules.NowPlayingInfoModule ?? null : null;

if (__DEV__ && Platform.OS === "ios") {
  if (NativeNowPlaying) {
    console.log(
      "✅ NowPlayingInfo native module available (lock screen / Control Center)"
    );
  } else {
    console.warn(
      "⚠️ NowPlayingInfoModule missing — rebuild iOS native app with NowPlayingInfoModule."
    );
  }
}

const UPDATE_THROTTLE_MS = 900;
let lastUpdateTime = 0;

/** @param {unknown} value @param {number} [fallback=0] */
function safeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function isIosNowPlayingAvailable() {
  return Platform.OS === "ios" && !!NativeNowPlaying;
}

class NowPlayingInfoManager {
  /**
   * Full metadata + installs remote command handlers (native).
   * Call from the single global player when a track starts or metadata changes materially.
   * @param {object} [metadata={}]
   */
  async setNowPlayingInfo(metadata = {}) {
    if (!NativeNowPlaying) return;

    try {
      const durationMs = safeNumber(metadata.durationMillis, 0);
      const positionMs = safeNumber(metadata.positionMillis, 0);
      await NativeNowPlaying.setNowPlayingInfo({
        title: metadata.title || "R/HOOD Mix",
        artist: metadata.artist || "Unknown Artist",
        albumTitle: metadata.album || metadata.genre || "R/HOOD",
        artwork: metadata.image || null,
        duration: durationMs / 1000,
        elapsedPlaybackTime: positionMs / 1000,
        playbackRate: metadata.isPlaying ? 1.0 : 0.0,
      });
    } catch (error) {
      if (__DEV__) {
        console.warn(
          "Failed to set Now Playing info:",
          error?.message || error
        );
      }
    }
  }

  /**
   * Throttled elapsed / duration / rate updates from the live playback status callback.
   * @param {number} positionMillis
   * @param {number} durationMillis
   * @param {boolean} isPlaying
   * @param {boolean} [force=false] — bypass throttle (e.g. pause/resume)
   */
  async updatePlaybackTime(
    positionMillis,
    durationMillis,
    isPlaying,
    force = false
  ) {
    if (!NativeNowPlaying) return;

    const now = Date.now();
    if (!force && now - lastUpdateTime < UPDATE_THROTTLE_MS) {
      return;
    }
    lastUpdateTime = now;

    try {
      await NativeNowPlaying.updatePlaybackTime(
        safeNumber(positionMillis, 0) / 1000,
        safeNumber(durationMillis, 0) / 1000,
        isPlaying ? 1.0 : 0.0
      );
    } catch (error) {
      if (__DEV__) {
        console.warn(
          "Failed to update Now Playing time:",
          error?.message || error
        );
      }
    }
  }

  /** Call when playback is fully stopped / session ended (not on every screen unmount). */
  async clearNowPlayingInfo() {
    if (!NativeNowPlaying) return;

    try {
      await NativeNowPlaying.clearNowPlayingInfo();
    } catch (error) {
      if (__DEV__) {
        console.warn(
          "Failed to clear Now Playing info:",
          error?.message || error
        );
      }
    }
  }
}

export default new NowPlayingInfoManager();
