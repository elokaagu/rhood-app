import { useState, useCallback, useMemo } from "react";

/**
 * Connection status / confirm modal: read-only state vs mutation API.
 * Navigation stays outside this hook — pass `onNavigate` into `useConnectionsData` for loaders.
 */
export function useConnectionsModalState() {
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
    setConnectionMessage("");
    setConnectionModalType("success");
    setConnectionModalPrimaryAction(null);
    setConnectionModalPrimaryText("OK");
    setConnectionModalSecondaryText(null);
    setConnectionModalSecondaryAction(null);
    setSelectedConnection(null);
  }, []);

  const modalActions = useMemo(
    () => ({
      setConnectionMessage,
      setConnectionModalType,
      setConnectionModalPrimaryText,
      setConnectionModalPrimaryAction,
      setConnectionModalSecondaryText,
      setConnectionModalSecondaryAction,
      setShowConnectionModal,
      setSelectedConnection,
      handleCloseConnectionModal,
    }),
    [handleCloseConnectionModal]
  );

  const modalState = useMemo(
    () => ({
      showConnectionModal,
      connectionMessage,
      connectionModalType,
      connectionModalPrimaryText,
      connectionModalSecondaryText,
      selectedConnection,
      connectionModalPrimaryAction,
      connectionModalSecondaryAction,
    }),
    [
      showConnectionModal,
      connectionMessage,
      connectionModalType,
      connectionModalPrimaryText,
      connectionModalSecondaryText,
      selectedConnection,
      connectionModalPrimaryAction,
      connectionModalSecondaryAction,
    ]
  );

  return {
    modalActions,
    modalState,
    handleCloseConnectionModal,
    /** Convenience for ConnectionModal prop bundle */
    showConnectionModal,
    connectionMessage,
    connectionModalType,
    connectionModalPrimaryText,
    connectionModalSecondaryText,
  };
}
