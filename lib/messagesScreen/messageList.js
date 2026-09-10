const FIVE_MINUTES_MS = 5 * 60 * 1000;

export function formatMessageTime(timestamp, now = new Date()) {
  const date = new Date(timestamp);
  const diff = now - date;

  if (diff < 60000) return "now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
  return date.toLocaleDateString();
}

export function formatDaySeparator(timestamp, now = new Date()) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThatDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfThatDay.getTime()) / (24 * 60 * 60 * 1000)
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: now.getFullYear() === date.getFullYear() ? undefined : "numeric",
  });
}

export function buildChatListRows(messages, formatDay = formatDaySeparator) {
  const rows = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const prev = messages[i - 1];
    const next = messages[i + 1];
    const msgTime = new Date(msg.timestamp).getTime();
    const prevTime = prev ? new Date(prev.timestamp).getTime() : null;
    const nextTime = next ? new Date(next.timestamp).getTime() : null;

    const isNewDay =
      !prev ||
      new Date(prev.timestamp).toDateString() !==
        new Date(msg.timestamp).toDateString();
    if (isNewDay) {
      rows.push({
        id: `sep-${msg.id}`,
        rowType: "separator",
        label: formatDay(msg.timestamp),
      });
    }

    const groupedWithPrev =
      !!prev &&
      prev.senderId === msg.senderId &&
      Math.abs(msgTime - (prevTime || 0)) < FIVE_MINUTES_MS;
    const groupedWithNext =
      !!next &&
      next.senderId === msg.senderId &&
      Math.abs((nextTime || 0) - msgTime) < FIVE_MINUTES_MS;

    rows.push({
      ...msg,
      showSenderHeader: !groupedWithPrev,
      showTimestamp: !groupedWithNext,
      isGrouped: groupedWithPrev,
    });
  }
  return rows;
}

export function canAttemptSend({ sending, text, mediaCount }) {
  return !sending && (!!String(text || "").trim() || Number(mediaCount) > 0);
}
