import { useCallback, useState } from "react";

import { deleteOwnAccount } from "../lib/moderation";

import { rhoodAlert } from "../lib/rhoodAlert";
/**
 * App Store 5.1.1(v): account deletion must be available wherever an
 * account exists — including onboarding and the application-pending screen.
 */
export function useDeleteAccount(onSignedOut) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => {
    if (!busy) setVisible(false);
  }, [busy]);

  const confirm = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      await deleteOwnAccount();
      setVisible(false);
      onSignedOut?.();
    } catch (error) {
      rhoodAlert(
        "Couldn't delete account",
        error?.message ||
          "Please try again. If this keeps happening, email hello@rhood.io."
      );
    } finally {
      setBusy(false);
    }
  }, [busy, onSignedOut]);

  return {
    visible,
    busy,
    open,
    close,
    confirm,
    title: "Delete Account",
    message:
      "This permanently deletes your R/HOOD profile, messages, and sign-in. This cannot be undone.",
    primaryButtonText: busy ? "Deleting…" : "Delete Account",
  };
}
