import { useCallback, useEffect, useState } from "react";
import { useOptionalAppTutorialContext } from "../context/AppTutorialContext";
import { APP_TUTORIAL_CONTENT } from "../lib/appTutorialContent";

/**
 * When Tutorial mode is on and this screen hasn’t been dismissed, show the guide modal.
 * @param {string} screenId — key in {@link APP_TUTORIAL_CONTENT}
 * @param {{ blockVisible?: boolean }} [options] — e.g. block until first-run Opportunities tutorial finishes
 */
export function useAppTutorialModal(screenId, options = {}) {
  const { blockVisible = false } = options;
  const ctx = useOptionalAppTutorialContext();
  const [visible, setVisible] = useState(false);

  const hydrated = ctx?.hydrated ?? false;
  const enabled = ctx?.enabled ?? false;
  const dismissed = ctx?.dismissed ?? {};
  const dismissFor = ctx?.dismissFor;

  const content = APP_TUTORIAL_CONTENT[screenId];

  useEffect(() => {
    if (!ctx || !hydrated || !enabled || dismissed[screenId] || !content) {
      setVisible(false);
      return;
    }
    if (blockVisible) {
      setVisible(false);
      return;
    }
    setVisible(true);
  }, [
    ctx,
    hydrated,
    enabled,
    dismissed,
    screenId,
    content,
    blockVisible,
  ]);

  const onDismiss = useCallback(() => {
    setVisible(false);
    dismissFor?.(screenId);
  }, [dismissFor, screenId]);

  if (!content) {
    return {
      showTutorialModal: false,
      tutorialModalProps: null,
      onDismiss: () => {},
    };
  }

  return {
    showTutorialModal: visible,
    tutorialModalProps: {
      visible,
      onDismiss,
      modalTitle: content.title,
      rows: content.rows,
    },
    onDismiss,
  };
}
