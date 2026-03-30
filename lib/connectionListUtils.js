/**
 * Pure helpers for connection list display (formatting, names, status color).
 */

export function formatMessageTime(timestamp) {
  if (!timestamp) return "";
  try {
    const now = new Date();
    const messageTime = new Date(timestamp);
    if (isNaN(messageTime.getTime())) return "";

    const diffMs = now - messageTime;
    if (diffMs <= 0) return "now";

    const diffInMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffInMinutes < 1) return "now";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    const formatted = messageTime.toLocaleDateString();
    return formatted || "";
  } catch {
    return "";
  }
}

/**
 * True when `lastMessages[connectionId]` is a real chat preview (non-empty text or attachment).
 */
export function lastMessageRepresentsChat(lastMessage) {
  if (!lastMessage || typeof lastMessage !== "object") return false;
  const type = String(lastMessage.messageType || "text").toLowerCase();
  if (type === "image" || type === "video" || type === "audio" || type === "file") {
    return true;
  }
  return String(lastMessage.content ?? "").trim().length > 0;
}

export function getUserName(connection) {
  return (
    connection?.name ||
    connection?.dj_name ||
    connection?.full_name ||
    connection?.connected_user_name ||
    connection?.username ||
    "DJ"
  );
}

export function getStatusColor(status) {
  switch (String(status || "").trim().toLowerCase()) {
    case "online":
      return "hsl(120, 100%, 50%)";
    case "recently_active":
      return "hsl(45, 100%, 50%)";
    case "offline":
      return "hsl(0, 0%, 50%)";
    default:
      return "hsl(0, 0%, 50%)";
  }
}
