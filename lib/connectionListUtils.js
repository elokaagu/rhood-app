/**
 * Pure helpers for connection list display (formatting, names, status color).
 */

export function formatMessageTime(timestamp) {
  if (!timestamp) return "";
  try {
    const now = new Date();
    const messageTime = new Date(timestamp);
    if (isNaN(messageTime.getTime())) return "";
    const diffInMinutes = Math.floor((now - messageTime) / (1000 * 60));
    if (diffInMinutes < 1) return "now";
    if (diffInMinutes < 60) return String(`${diffInMinutes}m`);
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return String(`${diffInHours}h`);
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return String(`${diffInDays}d`);
    const formatted = messageTime.toLocaleDateString();
    return String(formatted || "");
  } catch (error) {
    console.error("Error formatting message time:", error);
    return "";
  }
}

export function getUserName(connection) {
  const name =
    connection.name ||
    connection.dj_name ||
    connection.full_name ||
    connection.connected_user_name ||
    connection.username ||
    "DJ";
  return String(name || "DJ");
}

export function getStatusColor(status) {
  switch (status) {
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
