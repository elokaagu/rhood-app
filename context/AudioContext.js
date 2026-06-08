/**
 * AudioContext — two-tier state split to prevent 250ms playback position updates
 * from re-rendering screens that don't care about scrubber position.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ AudioStateContext  (SLOW — updates only on meaningful events)            │
 * │   isPlaying, currentTrack, isLoading, isShuffled, repeatMode,           │
 * │   queue, currentQueueIndex, error, sound                                │
 * │   → ScreenRouter, ProfileScreen, UserProfileView, useListenMixes        │
 * ├──────────────────────────────────────────────────────────────────────────┤
 * │ AudioPlaybackContext  (FAST — updates every ~250 ms during playback)     │
 * │   positionMillis, durationMillis, progress                              │
 * │   → GlobalAudioPlayerUI, MiniPlayerBar, FullScreenPlayerModal,          │
 * │     ProfileScreen (progress bar only), UserProfileView (waveform only)  │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Consumers that only need play/pause state (ScreenRouter, useListenMixes, etc.)
 * subscribe to AudioStateContext — they will NOT re-render during scrubbing.
 * Only the player UI and the small progress widgets subscribe to both.
 */

import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useLayoutEffect,
  useCallback,
  useMemo,
} from "react";

// ── Initial values ─────────────────────────────────────────────────────────

const initialSlowState = {
  isPlaying: false,
  currentTrack: null,
  isLoading: false,
  isShuffled: false,
  repeatMode: "none",
  queue: [],
  currentQueueIndex: -1,
  error: null,
  sound: null,
};

const initialFastState = {
  positionMillis: 0,
  durationMillis: 0,
  progress: 0,
};

// ── Contexts ───────────────────────────────────────────────────────────────

/** Slow-changing playback metadata — safe for all screens to subscribe to. */
const AudioStateContext = createContext(initialSlowState);

/** High-frequency position updates — only player UI and progress widgets. */
const AudioPlaybackContext = createContext(initialFastState);

/** Setter actions context — stable references, never causes re-renders. */
const AudioActionsContext = createContext({
  setGlobalAudioState: () => {},
  setPlaybackState: () => {},
  actionsRef: { current: null },
  stateRef: { current: { ...initialSlowState, ...initialFastState } },
});

// ── Provider ───────────────────────────────────────────────────────────────

export function AudioProvider({ children }) {
  const [slowState, setSlowState] = useState(initialSlowState);
  const [fastState, setFastState] = useState(initialFastState);

  // Stable setter refs so callbacks captured early never go stale
  const setSlowRef = useRef(setSlowState);
  const setFastRef = useRef(setFastState);
  const actionsRef = useRef(null);

  // Merged ref — read by useAudioPlayback hook to avoid stale closures in
  // callbacks like setOnPlaybackStatusUpdate and lock-screen handlers.
  const stateRef = useRef({ ...initialSlowState, ...initialFastState });

  useLayoutEffect(() => {
    setSlowRef.current = setSlowState;
  }, []);

  useLayoutEffect(() => {
    setFastRef.current = setFastState;
  }, []);

  // Keep stateRef merged and current — useLayoutEffect fires synchronously
  // after every render so reads in the same frame are always fresh.
  useLayoutEffect(() => {
    stateRef.current = { ...slowState, ...fastState };
  }, [slowState, fastState]);

  // Stable setters — memoised once, refs updated via useLayoutEffect above
  const stableSetSlowState = useCallback((update) => {
    setSlowRef.current?.(update);
  }, []);

  const stableSetFastState = useCallback((update) => {
    setFastRef.current?.(update);
  }, []);

  const actionsValue = useMemo(
    () => ({
      setGlobalAudioState: stableSetSlowState,
      setPlaybackState: stableSetFastState,
      actionsRef,
      stateRef,
    }),
    [stableSetSlowState, stableSetFastState]
  );

  return (
    <AudioStateContext.Provider value={slowState}>
      <AudioPlaybackContext.Provider value={fastState}>
        <AudioActionsContext.Provider value={actionsValue}>
          {children}
        </AudioActionsContext.Provider>
      </AudioPlaybackContext.Provider>
    </AudioStateContext.Provider>
  );
}

// ── Hooks ──────────────────────────────────────────────────────────────────

/**
 * Slow-changing state: isPlaying, currentTrack, queue, isShuffled, etc.
 * Safe for any screen — will NOT re-render on scrubber position changes.
 */
export function useAudioState() {
  const ctx = useContext(AudioStateContext);
  if (ctx === undefined) {
    throw new Error("useAudioState must be used within an AudioProvider");
  }
  return ctx;
}

/**
 * High-frequency playback position: positionMillis, durationMillis, progress.
 * Only use in components that render a progress bar / scrubber — they will
 * re-render ~4× per second during playback.
 */
export function useAudioPlayback() {
  const ctx = useContext(AudioPlaybackContext);
  if (ctx === undefined) {
    throw new Error("useAudioPlayback must be used within an AudioProvider");
  }
  return ctx;
}

/** Stable action setters — subscribing to this context never triggers re-renders. */
export function useAudioActions() {
  const ctx = useContext(AudioActionsContext);
  if (ctx === undefined) {
    throw new Error("useAudioActions must be used within an AudioProvider");
  }
  return ctx;
}

/**
 * Backward-compatible hook that merges both contexts into a single
 * `globalAudioState` object.  Use only where you need BOTH position AND
 * track metadata in the same component (e.g. GlobalAudioPlayerUI).
 * Prefer `useAudioState()` + `useAudioPlayback()` separately in most cases.
 */
export function useAudio() {
  const slowState = useAudioState();
  const fastState = useAudioPlayback();
  const { setGlobalAudioState, setPlaybackState, actionsRef } = useAudioActions();

  // Merge into the legacy shape callers expect
  const globalAudioState = useMemo(
    () => ({ ...slowState, ...fastState }),
    [slowState, fastState]
  );

  return { globalAudioState, setGlobalAudioState, setPlaybackState, actionsRef };
}
