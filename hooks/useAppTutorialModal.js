import { useCallback, useMemo } from "react";
import { useIsFocused } from "@react-navigation/native";
import { useOptionalAppTutorialContext } from "../context/AppTutorialContext";
import { APP_TUTORIAL_CONTENT } from "../lib/appTutorialContent";

/** Stable no-op for screens with no tutorial content (avoids new fn each render). */
const NOOP = () => {};

/**
 * When Tutorial mode is on and this screen hasn’t been dismissed, show the guide modal.
 * Dismissal is persisted per screen via context / AsyncStorage (see lib/appTutorialPrefs.js).
 *
 * @param {string} screenId — key in {@link APP_TUTORIAL_CONTENT}
 * @param {{ preventShow?: boolean }} [options] — e.g. defer until first-run Opportunities swipe tutorial finishes
 */
export function useAppTutorialModal(screenId, options = {}) {
  const { preventShow = false, respectFocus = true } = options;
  const ctx = useOptionalAppTutorialContext();
  const isFocused = useIsFocused();

  const hydrated = ctx?.hydrated ?? false;
  const enabled = ctx?.enabled ?? false;
  const dismissed = ctx?.dismissed ?? {};
  const dismissFor = ctx?.dismissFor;

  const content = APP_TUTORIAL_CONTENT[screenId];

  const visible = Boolean(
    ctx &&
      hydrated &&
      enabled &&
      content &&
      !dismissed[screenId] &&
      (!respectFocus || isFocused) &&
      !preventShow
  );

  const onDismiss = useCallback(() => {
    dismissFor?.(screenId);
  }, [dismissFor, screenId]);

  const tutorialModalProps = useMemo(() => {
    if (!content) return null;
    if (!visible) return null;

    return {
      visible,
      onDismiss,
      modalTitle: content.title,
      rows: content.rows,
    };
  }, [content, visible, onDismiss]);

  return {
    showTutorialModal: visible,
    tutorialModalProps,
    onDismiss: content ? onDismiss : NOOP,
  };
}
