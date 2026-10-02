import { useEffect, useSyncExternalStore } from "react";

/**
 * Counts open RhoodModals so in-page overlays (the per-screen tip cards) can
 * step aside instead of stacking underneath a real popup.
 */
let openCount = 0;
const listeners = new Set();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return openCount > 0;
}

/** Call from a modal component; registers while `visible` is true. */
export function useRegisterModalPresence(visible) {
  useEffect(() => {
    if (!visible) return undefined;
    openCount += 1;
    emit();
    return () => {
      openCount = Math.max(0, openCount - 1);
      emit();
    };
  }, [visible]);
}

export function useAnyModalOpen() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
