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

  const refreshFromStorage = useCallback(async () => {
    const [e, d] = await Promise.all([
      getTutorialModeEnabled(),
      getDismissedTutorialScreens(),
    ]);
    setEnabled(e);
    setDismissed(d);
  }, []);

  const value = useMemo(
    () => ({
      hydrated,
      enabled,
      dismissed,
      activeScreenId,
      setTutorialEnabled,
      dismissFor,
      resetDismissed,
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
