import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useLayoutEffect,
  useCallback,
  useMemo,
} from "react";

const initialAudioState = {
  isPlaying: false,
  currentTrack: null,
  progress: 0,
  isLoading: false,
  sound: null,
  isShuffled: false,
  repeatMode: "none",
  positionMillis: 0,
  durationMillis: 0,
  queue: [],
  currentQueueIndex: -1,
};

const AudioStateContext = createContext(initialAudioState);
const AudioActionsContext = createContext({
  setGlobalAudioState: () => {},
  actionsRef: { current: null },
});

export function AudioProvider({ children }) {
  const [globalAudioState, setGlobalAudioState] = useState(initialAudioState);
  const setStateRef = useRef(setGlobalAudioState);
  const actionsRef = useRef(null);

  useLayoutEffect(() => {
    setStateRef.current = setGlobalAudioState;
  }, []);

  const stableSetGlobalAudioState = useCallback((update) => {
    setStateRef.current?.(update);
  }, []);

  const actionsValue = useMemo(
    () => ({ setGlobalAudioState: stableSetGlobalAudioState, actionsRef }),
    [stableSetGlobalAudioState]
  );

  return (
    <AudioStateContext.Provider value={globalAudioState}>
      <AudioActionsContext.Provider value={actionsValue}>
        {children}
      </AudioActionsContext.Provider>
    </AudioStateContext.Provider>
  );
}

export function useAudioState() {
  const context = useContext(AudioStateContext);
  if (context === undefined) {
    throw new Error("useAudioState must be used within an AudioProvider");
  }
  return context;
}

export function useAudioActions() {
  const context = useContext(AudioActionsContext);
  if (context === undefined) {
    throw new Error("useAudioActions must be used within an AudioProvider");
  }
  return context;
}

export function useAudio() {
  const globalAudioState = useAudioState();
  const { setGlobalAudioState, actionsRef } = useAudioActions();
  return { globalAudioState, setGlobalAudioState, actionsRef };
}
