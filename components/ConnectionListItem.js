import React, { memo, useMemo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import ProgressiveImage from "./ProgressiveImage";
import ProfileImagePlaceholder from "./ProfileImagePlaceholder";

/**
 * Single connection row in the connections/messages list.
 * No per-item animation to keep list scroll smooth (virtualized); section uses connectionsFadeAnim.
 */
function ConnectionListItem({
  connection,
  onPress,
  onLongPress,
  getUserName,
  getLastMessageSender,
  getLastMessageContent,
  getLastMessageTime,
  styles,
}) {
  const userName = getUserName(connection) || "";
  const sender = getLastMessageSender(connection) || "";
  const rawContent = getLastMessageContent(connection) || "";
  const content = rawContent === "No messages yet" ? "" : rawContent;
  const lastMessageTime = (getLastMessageTime(connection) || "").trim();
  const statusMessage = (connection.statusMessage || "").trim();

  const previewText = useMemo(
    () => [sender, content].filter(Boolean).join(" "),
    [sender, content]
  );

  /** Prefer last message time; fall back to presence-style label when there is no thread yet. */
  const headerTime =
    lastMessageTime || connection.lastActive || "Recently";

  const profileSource =
    connection.profileImage &&
    typeof connection.profileImage === "string" &&
    connection.profileImage.trim()
      ? { uri: connection.profileImage.trim() }
      : null;

  return (
    <TouchableOpacity
      style={styles.messageItem}
      onPress={() => onPress(connection)}
      onLongPress={() => onLongPress?.(connection)}
      delayLongPress={350}
      activeOpacity={0.85}
    >
      <View style={styles.messageContent}>
        <View style={styles.avatarContainer}>
          <ProgressiveImage
            source={profileSource}
            style={styles.profileImage}
            placeholder={
              <ProfileImagePlaceholder
                size={48}
                style={styles.profileImage}
                name={userName}
              />
            }
            transition={0}
          />
          {connection.isOnline === true ? (
            <View style={styles.onlineIndicator} />
          ) : null}
        </View>
        <View style={styles.messageInfo}>
          <View style={styles.messageHeader}>
            <Text style={styles.messageName} numberOfLines={1}>
              {userName}
            </Text>
            <View style={styles.messageHeaderMeta}>
              <Text style={styles.messageTime}>{headerTime}</Text>
            </View>
          </View>
          {statusMessage ? (
            <Text
              style={styles.connectionStatusMessage}
              numberOfLines={1}
            >
              {statusMessage}
            </Text>
          ) : null}
          <View style={styles.messagePreviewRow}>
            <Text style={styles.messageText} numberOfLines={1}>
              {previewText}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default memo(ConnectionListItem);
