/**
 * Branded error UI via RhoodModal (replaces Alert.alert for errors).
 *
 * @example
 * const { showError, hideError, ErrorModal } = useErrorModal();
 * showError("Network", "Check your connection");
 * showError(new Error("Failed")); // title defaults to "Error"
 * showError({ title: "Payment", message: "…", secondaryButtonText: "Cancel", onSecondaryPress: fn });
 */

import React, { useCallback, useRef, useState } from "react";
import RhoodModal from "../components/RhoodModal";
import { LogLevel, remoteLog } from "./remoteLogger";

const DEFAULT_TITLE = "Error";
const DEFAULT_MESSAGE = "Something went wrong. Please try again.";

function normalizeShowErrorInput(input, fallbackMessage) {
  let title = DEFAULT_TITLE;
  let message = DEFAULT_MESSAGE;
  let primaryButtonText = "OK";
  let secondaryButtonText;
  let skipIfOpen = false;

  if (typeof input === "string") {
    title = input.trim() || DEFAULT_TITLE;
    message =
      (typeof fallbackMessage === "string" && fallbackMessage.trim()) ||
      DEFAULT_MESSAGE;
  } else if (input instanceof Error) {
    message = (input.message && String(input.message).trim()) || DEFAULT_MESSAGE;
    if (typeof fallbackMessage === "string" && fallbackMessage.trim()) {
      title = fallbackMessage.trim();
    }
  } else if (input != null && typeof input === "object") {
    title =
      (typeof input.title === "string" && input.title.trim()) || DEFAULT_TITLE;
    message =
      (typeof input.message === "string" && input.message.trim()) ||
      DEFAULT_MESSAGE;
    if (typeof input.primaryButtonText === "string" && input.primaryButtonText) {
      primaryButtonText = input.primaryButtonText;
    }
    if (
      typeof input.secondaryButtonText === "string" &&
      input.secondaryButtonText
    ) {
      secondaryButtonText = input.secondaryButtonText;
    }
    if (input.skipIfOpen === true) {
      skipIfOpen = true;
    }
  }

  return {
    title,
    message,
    primaryButtonText,
    secondaryButtonText,
    skipIfOpen,
  };
}

export function useErrorModal() {
  const [errorState, setErrorState] = useState({
    visible: false,
    title: "",
    message: "",
    primaryButtonText: "OK",
    secondaryButtonText: undefined,
  });

  const visibleRef = useRef(false);

  const callbacksRef = useRef({
    onPrimaryPress: null,
    onSecondaryPress: null,
  });

  const hideError = useCallback(() => {
    visibleRef.current = false;
    setErrorState((prev) => ({ ...prev, visible: false }));
    callbacksRef.current = {
      onPrimaryPress: null,
      onSecondaryPress: null,
    };
  }, []);

  const showError = useCallback((input, fallbackMessage) => {
    const normalized = normalizeShowErrorInput(input, fallbackMessage);
    if (normalized.skipIfOpen && visibleRef.current) {
      return;
    }

    const extra =
      input != null && typeof input === "object" && !(input instanceof Error)
        ? input
        : null;

    callbacksRef.current = {
      onPrimaryPress:
        typeof extra?.onPrimaryPress === "function"
          ? extra.onPrimaryPress
          : null,
      onSecondaryPress:
        typeof extra?.onSecondaryPress === "function"
          ? extra.onSecondaryPress
          : null,
    };

    visibleRef.current = true;
    setErrorState({
      visible: true,
      title: normalized.title,
      message: normalized.message,
      primaryButtonText: normalized.primaryButtonText,
      secondaryButtonText: normalized.secondaryButtonText,
    });

    remoteLog(LogLevel.WARN, "ERROR_MODAL", normalized.title, {
      messagePreview: String(normalized.message).slice(0, 500),
    });
  }, []);

  const handlePrimaryPress = useCallback(() => {
    const fn = callbacksRef.current.onPrimaryPress;
    try {
      fn?.();
    } finally {
      hideError();
    }
  }, [hideError]);

  const handleSecondaryPress = useCallback(() => {
    const fn = callbacksRef.current.onSecondaryPress;
    try {
      fn?.();
    } finally {
      hideError();
    }
  }, [hideError]);

  const ErrorModal = useCallback(() => {
    return (
      <RhoodModal
        visible={errorState.visible}
        onClose={hideError}
        title={errorState.title}
        message={errorState.message}
        type="error"
        primaryButtonText={errorState.primaryButtonText}
        onPrimaryPress={handlePrimaryPress}
        secondaryButtonText={errorState.secondaryButtonText}
        onSecondaryPress={
          errorState.secondaryButtonText ? handleSecondaryPress : undefined
        }
      />
    );
  }, [
    errorState.visible,
    errorState.title,
    errorState.message,
    errorState.primaryButtonText,
    errorState.secondaryButtonText,
    hideError,
    handlePrimaryPress,
    handleSecondaryPress,
  ]);

  return { showError, hideError, ErrorModal };
}
