// src/audio/player.js
// Wrapper around react-native-track-player (v4.x — see ios/Podfile.lock).
// Prefer getPlaybackSnapshot() for app UI; it composes RNTP’s getPlaybackState + getProgress.

let TrackPlayer = null;
let Capability = null;
let State = null;

function loadTrackPlayerModule() {
  if (TrackPlayer) return true;
  try {
    const trackPlayerModule = require("react-native-track-player");
    TrackPlayer = trackPlayerModule.default || trackPlayerModule;
    Capability = trackPlayerModule.Capability;
    State = trackPlayerModule.State;
    return !!TrackPlayer;
  } catch (error) {
    console.warn("react-native-track-player not available:", error?.message);
    return false;
  }
}

loadTrackPlayerModule();

let isInitialized = false;
let optionsUpdated = false;

function assertTrackPlayer() {
  if (!loadTrackPlayerModule() || !TrackPlayer) {
    throw new Error("react-native-track-player is not available");
  }
}

/**
 * Best-effort: iOS lock screen prefers HTTPS artwork. Only works if the host serves TLS.
 */
function normalizeArtworkUrl(raw) {
  if (!raw || typeof raw !== "string") return undefined;
  let url = raw.trim();
  if (!url) return undefined;
  if (url.startsWith("http://")) {
    url = url.replace("http://", "https://");
  }
  return url;
}

/** Prefer stable IDs from the app; fall back to URL or a one-off key. */
function stableTrackId(track, index = 0) {
  if (track.id != null && String(track.id).length > 0) {
    return String(track.id);
  }
  if (track.url && String(track.url).length > 0) {
    return `url:${String(track.url)}`;
  }
  return `rhood-${Date.now()}-${index}`;
}

function buildTrackObject(track, index = 0) {
  return {
    id: stableTrackId(track, index),
    url: track.url,
    title: track.title || "R/HOOD Mix",
    artist: track.artist || "Unknown Artist",
    artwork: normalizeArtworkUrl(track.artwork),
    duration: track.duration || undefined,
    album: track.album || track.genre || "R/HOOD",
    genre: track.genre || "Electronic",
  };
}

/**
 * Idempotent: call before any TrackPlayer queue API.
 * Per RNTP docs, setupPlayer() should run once per app lifetime.
 */
export async function setupPlayer() {
  assertTrackPlayer();

  if (!isInitialized) {
    await TrackPlayer.setupPlayer();
    isInitialized = true;
    console.log("✅ TrackPlayer initialized");
  }

  if (!optionsUpdated) {
    const capabilities = [
      Capability.Play,
      Capability.Pause,
      Capability.Stop,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
      Capability.JumpForward,
      Capability.JumpBackward,
    ];

    const compactCapabilities = [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
    ];

    await TrackPlayer.updateOptions({
      capabilities,
      compactCapabilities,
      iosCategory: "playback",
      forwardJumpInterval: 15,
      backwardJumpInterval: 15,
      android: {
        alwaysShowNotification: true,
      },
    });
    optionsUpdated = true;
    console.log("✅ TrackPlayer options updated with full lock screen capabilities");
    if (__DEV__ && Array.isArray(capabilities)) {
      console.log("📱 Capabilities:", capabilities.join(", "));
    }
  }
}

/**
 * Add one track to the queue (does not clear queue).
 */
export async function addTrack(track) {
  assertTrackPlayer();
  await setupPlayer();

  const trackObject = buildTrackObject(track, 0);
  if (__DEV__) {
    console.log("📱 Adding track to TrackPlayer:", {
      id: trackObject.id,
      title: trackObject.title,
      artist: trackObject.artist,
      hasArtwork: !!trackObject.artwork,
      duration: trackObject.duration,
    });
  }

  await TrackPlayer.add(trackObject);
  console.log("✅ Track added to queue:", trackObject.title);
}

/**
 * Replace queue with a single track and play (typical “play this mix now” flow).
 */
export async function playTrack(track) {
  assertTrackPlayer();
  await setupPlayer();

  await TrackPlayer.reset();
  const trackObject = buildTrackObject(track, 0);
  if (__DEV__) {
    console.log("📱 playTrack:", {
      id: trackObject.id,
      title: trackObject.title,
      hasArtwork: !!trackObject.artwork,
    });
  }
  await TrackPlayer.add(trackObject);
  await TrackPlayer.play();
  console.log("✅ Track started playing:", track.title);
}

/**
 * Append multiple tracks (does not reset queue).
 */
export async function addTracks(tracks) {
  assertTrackPlayer();
  if (!Array.isArray(tracks)) {
    throw new Error("addTracks requires an array of tracks");
  }

  await setupPlayer();

  const trackObjects = tracks.map((t, index) => buildTrackObject(t, index));

  if (__DEV__) {
    console.log(`📱 Adding ${trackObjects.length} tracks to TrackPlayer queue`);
    trackObjects.forEach((tr, i) => {
      console.log(`  Track ${i + 1}:`, {
        title: tr.title,
        artist: tr.artist,
        hasArtwork: !!tr.artwork,
      });
    });
  }

  await TrackPlayer.add(trackObjects);
  console.log(`✅ Added ${trackObjects.length} tracks to queue`);
}

/**
 * Replace queue, optionally start at startIndex, then play.
 */
export async function playTracks(tracks, startIndex = 0) {
  assertTrackPlayer();

  if (!tracks || tracks.length === 0) {
    throw new Error("No tracks provided");
  }

  await setupPlayer();

  await TrackPlayer.reset();

  const trackObjects = tracks.map((t, index) => buildTrackObject(t, index));
  if (__DEV__) {
    console.log(`📱 playTracks: ${trackObjects.length} tracks`);
  }
  await TrackPlayer.add(trackObjects);

  if (startIndex > 0 && startIndex < trackObjects.length) {
    await TrackPlayer.skip(startIndex);
  }

  await TrackPlayer.play();

  if (__DEV__) {
    try {
      const currentTrackIndex = await TrackPlayer.getCurrentTrack();
      if (currentTrackIndex !== null && currentTrackIndex !== undefined) {
        const currentTrack = await TrackPlayer.getTrack(currentTrackIndex);
        console.log("📱 Current track metadata on lock screen:", {
          title: currentTrack?.title,
          artist: currentTrack?.artist,
          hasArtwork: !!currentTrack?.artwork,
          duration: currentTrack?.duration,
        });
      }
    } catch (error) {
      console.warn("⚠️ Could not verify current track metadata:", error);
    }
  }

  console.log(
    `✅ Started playing track ${startIndex + 1} of ${tracks.length}: ${tracks[startIndex]?.title}`
  );
}

export async function pause() {
  assertTrackPlayer();
  await TrackPlayer.pause();
  console.log("⏸️ Playback paused");
}

export async function resume() {
  assertTrackPlayer();
  await TrackPlayer.play();
  console.log("▶️ Playback resumed");
}

export async function stop() {
  assertTrackPlayer();
  await TrackPlayer.stop();
  await TrackPlayer.reset();
  console.log("⏹️ Playback stopped");
}

export async function seekTo(position) {
  assertTrackPlayer();
  await TrackPlayer.seekTo(position);
  console.log(`⏩ Seeked to ${position}s`);
}

/**
 * App-level snapshot: RNTP playback state + progress + active track metadata.
 * Not the same object as TrackPlayer.getPlaybackState() (library type).
 */
export async function getPlaybackSnapshot() {
  const empty = {
    isPlaying: false,
    position: 0,
    duration: 0,
    buffered: 0,
    track: null,
    state: State?.None ?? State?.Stopped ?? "none",
  };

  if (!loadTrackPlayerModule() || !TrackPlayer) {
    return empty;
  }

  try {
    const playbackState = await TrackPlayer.getPlaybackState();
    const progress = await TrackPlayer.getProgress();
    const trackIndex = await TrackPlayer.getCurrentTrack();
    const track =
      trackIndex !== null && trackIndex !== undefined
        ? await TrackPlayer.getTrack(trackIndex)
        : null;

    const state = playbackState?.state ?? playbackState;
    return {
      isPlaying: state === State.Playing,
      position: progress?.position ?? 0,
      duration: progress?.duration ?? 0,
      buffered: progress?.buffered ?? 0,
      track,
      state,
    };
  } catch (error) {
    console.error("Error getting playback snapshot:", error);
    return {
      ...empty,
      state: State?.None ?? empty.state,
    };
  }
}

/**
 * @deprecated Prefer {@link getPlaybackSnapshot} — name overlapped with RNTP’s getPlaybackState().
 * Behavior is identical to getPlaybackSnapshot().
 */
export async function getPlaybackState() {
  return getPlaybackSnapshot();
}

export async function skipToNext() {
  assertTrackPlayer();
  await TrackPlayer.skipToNext();
  console.log("⏭️ Skipped to next track");
}

export async function skipToPrevious() {
  assertTrackPlayer();
  await TrackPlayer.skipToPrevious();
  console.log("⏮️ Skipped to previous track");
}

export async function getCurrentTrack() {
  if (!loadTrackPlayerModule() || !TrackPlayer) {
    return null;
  }
  try {
    const trackIndex = await TrackPlayer.getCurrentTrack();
    if (trackIndex !== null && trackIndex !== undefined) {
      return await TrackPlayer.getTrack(trackIndex);
    }
    return null;
  } catch (error) {
    console.error("Error getting current track:", error);
    return null;
  }
}

export async function getQueue() {
  if (!loadTrackPlayerModule() || !TrackPlayer) {
    return [];
  }
  try {
    return await TrackPlayer.getQueue();
  } catch (error) {
    console.error("Error getting queue:", error);
    return [];
  }
}

export function getTrackPlayer() {
  return TrackPlayer;
}

/** Track Player `State` enum (e.g. Playing, Paused). */
export function getState() {
  return State;
}

export function getCapability() {
  return Capability;
}
