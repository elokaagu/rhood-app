import { useState, useCallback, useMemo } from "react";

/**
 * Connection status / confirm modal state shared by useConnectionsData + useConnectionsActions.
 */
export function useConnectionsModalState(onNavigate) {
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState("");
  const [connectionModalType, setConnectionModalType] = useState("success");
  const [connectionModalPrimaryText, setConnectionModalPrimaryText] =
    useState("OK");
  const [connectionModalPrimaryAction, setConnectionModalPrimaryAction] =
    useState(null);
  const [connectionModalSecondaryText, setConnectionModalSecondaryText] =
    useState(null);
  const [connectionModalSecondaryAction, setConnectionModalSecondaryAction] =
    useState(null);
  const [selectedConnection, setSelectedConnection] = useState(null);

  const handleCloseConnectionModal = useCallback(() => {
    setShowConnectionModal(false);
    setConnectionModalPrimaryAction(null);
    setConnectionModalPrimaryText("OK");
    setConnectionModalSecondaryText(null);
    setConnectionModalSecondaryAction(null);
    setSelectedConnection(null);
  }, []);

  const modalCtx = useMemo(
    () => ({
      setConnectionMessage,
      setConnectionModalType,
      setConnectionModalPrimaryText,
      setConnectionModalPrimaryAction,
      setShowConnectionModal,
      handleCloseConnectionModal,
      onNavigate,
    }),
    [handleCloseConnectionModal, onNavigate]
  );

  const modalState = useMemo(
    () => ({
      showConnectionModal,
      setShowConnectionModal,
      connectionMessage,
      setConnectionMessage,
      connectionModalType,
      setConnectionModalType,
      connectionModalPrimaryText,
      setConnectionModalPrimaryText,
      connectionModalPrimaryAction,
      setConnectionModalPrimaryAction,
      connectionModalSecondaryText,
      setConnectionModalSecondaryText,
      connectionModalSecondaryAction,
      setConnectionModalSecondaryAction,
      handleCloseConnectionModal,
      setSelectedConnection,
    }),
    [
      showConnectionModal,
      connectionMessage,
      connectionModalType,
      connectionModalPrimaryText,
      connectionModalPrimaryAction,
      connectionModalSecondaryText,
      connectionModalSecondaryAction,
      handleCloseConnectionModal,
    ]
  );

  return {
    modalCtx,
    modalState,
    showConnectionModal,
    handleCloseConnectionModal,
    connectionMessage,
    connectionModalType,
    connectionModalPrimaryText,
    connectionModalSecondaryText,
  };
}
