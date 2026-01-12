/**
 * Utility to show R/HOOD themed error modals
 * Replaces Alert.alert() for better UX consistency
 */

import React, { useState } from "react";
import RhoodModal from "../components/RhoodModal";

/**
 * Hook to show error modals
 * Usage:
 *   const { showError, ErrorModal } = useErrorModal();
 *   showError("Error Title", "Error message");
 *   return <ErrorModal />;
 */
export function useErrorModal() {
  const [errorState, setErrorState] = useState({
    visible: false,
    title: "",
    message: "",
  });

  const showError = (title, message) => {
    setErrorState({
      visible: true,
      title: title || "Error",
      message: message || "Something went wrong. Please try again.",
    });
  };

  const hideError = () => {
    setErrorState({
      visible: false,
      title: "",
      message: "",
    });
  };

  const ErrorModal = () => (
    <RhoodModal
      visible={errorState.visible}
      onClose={hideError}
      title={errorState.title}
      message={errorState.message}
      type="error"
      primaryButtonText="OK"
      onPrimaryPress={hideError}
    />
  );

  return { showError, hideError, ErrorModal };
}

/**
 * Simple function to show error modal (for use in non-component contexts)
 * Note: This requires the component to render the modal separately
 */
export function createErrorModalState(title, message) {
  return {
    visible: true,
    title: title || "Error",
    message: message || "Something went wrong. Please try again.",
  };
}

