import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  getTutorialModeEnabled,
  setTutorialModeEnabled as persistTutorialMode,
  getDismissedTutorialScreens,
  dismissScreenTutorial as persistDismissScreen,
  resetAllDismissedTutorials as persistResetDismissed,
} from "../lib/appTutorialPrefs";

const AppTutorialContext = createContext(null);

/**
 * Module-level ref so callers that live *above* AppTutorialProvider in the
 * component tree (e.g. App.js's completeOnboarding callback) can imperatively
 * call setTutorialEnabled / resetDismissed without going through props.
 *
 * Pattern: populate the ref inside the provider, clear it on unmount.
 */
export const tutorialContextRef = { current: null };

export function AppTutorialProvider({ children, activeScreenId = null }) {
  const [hydrated, setHydrated] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [dismissed, setDismissed] = useState({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [e, d] = await Promise.all([
        getTutorialModeEnabled(),
        getDismissedTutorialScreens(),
      ]);
      if (cancelled) return;
      setEnabled(e);
      setDismissed(d);
      setHydrated(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setTutorialEnabled = useCallback(async (value) => {
    setEnabled(!!value);
    await persistTutorialMode(!!value);
  }, []);

  const dismissFor = useCallback(async (screenId) => {
    if (!screenId) return;
    setDismissed((prev) => ({ ...prev, [screenId]: true }));
    await persistDismissScreen(screenId);
  }, []);

  const resetDismissed = useCallback(async () => {
    setDismissed({});
    await persistResetDismissed();
  }, []);

  // Activates tutorial mode fresh: clears dismissed screens AND enables in one
  // batched render instead of two sequential ones. Use this after onboarding so
  // all screen tips appear, without causing multiple cascading re-renders.
  const enableFresh = useCallback(async () => {
    setDismissed({});
    setEnabled(true);
    await Promise.all([persistResetDismissed(), persistTutorialMode(true)]);
  }, []);

  const refreshFromStorage = useCallback(async () => {
    const [e, d] = await Promise.all([
      getTutorialModeEnabled(),
      getDismissedTutorialScreens(),
    ]);
    setEnabled(e);
    setDismissed(d);
  }, []);

  // Populate the module-level ref so callers above the provider can reach in.
  // `enabled`/`dismissed` are included so callers can read live tutorial
  // state (e.g. "is a tip currently showing on screen X?"), not just act on it.
  useEffect(() => {
    tutorialContextRef.current = {
      setTutorialEnabled,
      resetDismissed,
      enableFresh,
      enabled,
      dismissed,
    };
    return () => {
      tutorialContextRef.current = null;
    };
  }, [setTutorialEnabled, resetDismissed, enableFresh, enabled, dismissed]);

  const value = useMemo(
    () => ({
      hydrated,
      enabled,
      dismissed,
      activeScreenId,
      setTutorialEnabled,
      dismissFor,
      resetDismissed,
      enableFresh,
      refreshFromStorage,
    }),
    [
      hydrated,
      enabled,
      dismissed,
      activeScreenId,
      setTutorialEnabled,
      dismissFor,
      resetDismissed,
      enableFresh,
      refreshFromStorage,
    ]
  );

  return (
    <AppTutorialContext.Provider value={value}>
      {children}
    </AppTutorialContext.Provider>
  );
}

export function useAppTutorialContext() {
  const ctx = useContext(AppTutorialContext);
  if (!ctx) {
    throw new Error("useAppTutorialContext must be used within AppTutorialProvider");
  }
  return ctx;
}

/** Safe for optional provider (returns inert handlers). */
export function useOptionalAppTutorialContext() {
  return useContext(AppTutorialContext);
}
