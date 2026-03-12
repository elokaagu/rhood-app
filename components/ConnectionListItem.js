import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProgressiveImage from "./ProgressiveImage";
import ProfileImagePlaceholder from "./ProfileImagePlaceholder";
import FadeInView from "./FadeInView";

/**
 * Single connection row in the connections/messages list.
 * No per-item animation to keep list scroll smooth (virtualized).
 */
function ConnectionListItem({
  connection,
  index,
  onPress,
  onLongPress,
  getUserName,
  getLastMessageSender,
  getLastMessageContent,
  getLastMessageTime,
  styles,
}) {
  return (
    <TouchableOpacity
        style={styles.messageItem}
        onPress={() => onPress(connection)}
        onLongPress={onLongPress}
        delayLongPress={350}
        activeOpacity={0.85}
      >
        <FadeInView style={styles.messageContent}>
          <View style={styles.avatarContainer}>
            <ProgressiveImage
              source={
                connection.profileImage &&
                typeof connection.profileImage === "string" &&
                connection.profileImage.trim()
                  ? { uri: connection.profileImage.trim() }
                  : null
              }
              style={styles.profileImage}
              placeholder={
                <ProfileImagePlaceholder
                  size={48}
                  style={styles.profileImage}
                />
              }
              transition={0}
            />
            <View style={styles.onlineIndicator} />
          </View>
          <View style={styles.messageInfo}>
            <View style={styles.messageHeader}>
              <Text style={styles.messageName} numberOfLines={1}>
                {String(getUserName(connection) || "")}
              </Text>
              <View style={styles.messageHeaderMeta}>
                <Text style={styles.messageTime}>
                  {String(connection.lastActive || "Recently")}
                </Text>
              </View>
            </View>
            {connection.statusMessage &&
            String(connection.statusMessage).trim() ? (
              <Text
                style={styles.connectionStatusMessage}
                numberOfLines={1}
              >
                {String(connection.statusMessage || "")}
              </Text>
            ) : null}
            <View style={styles.messagePreview}>
              <Text style={styles.messageText} numberOfLines={1}>
                {String(
                  (getLastMessageSender(connection) || "") +
                    (getLastMessageContent(connection) || "")
                )}
              </Text>
              <Text style={styles.messageTime}>
                {String(getLastMessageTime(connection) || "")}
              </Text>
            </View>
          </View>
        </FadeInView>
      </TouchableOpacity>
  );
}

export default memo(ConnectionListItem);
