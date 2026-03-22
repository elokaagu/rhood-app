import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Bottom input: either “connect to message” (1:1 not connected) or composer row.
 */
export default function MessagesInputFooter({
  chatType,
  isConnected,
  connectionStatus,
  bottomInputPadding,
  styles,
  navigation,
  replyingToMessage,
  onClearReply,
  newMessage,
  onChangeMessage,
  selectedMediaCount,
  sending,
  onSend,
  onOpenMediaPicker,
  uploadingMedia,
}) {
  const showConnectionGate = chatType === "individual" && !isConnected;

  if (showConnectionGate) {
    return (
      <View
        style={[styles.inputContainer, { paddingBottom: bottomInputPadding }]}
      >
        <View style={styles.connectionRequiredContainer}>
          <Text style={styles.connectionRequiredText}>
            {connectionStatus === "pending"
              ? "Connection request pending..."
              : "Connect to start messaging"}
          </Text>
          <TouchableOpacity
            style={styles.connectButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.connectButtonText}>
              {connectionStatus === "pending" ? "View Status" : "Send Request"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const canSend =
    (!!newMessage.trim() || selectedMediaCount > 0) && !sending;

  return (
    <View
      style={[styles.inputContainer, { paddingBottom: bottomInputPadding }]}
    >
      {replyingToMessage ? (
        <View style={styles.replyIndicator}>
          <View style={styles.replyIndicatorContent}>
            <View style={styles.replyIndicatorLeft}>
              <Ionicons name="arrow-undo" size={16} color="hsl(75, 100%, 60%)" />
              <Text style={styles.replyIndicatorText} numberOfLines={1}>
                Replying to {replyingToMessage.senderName || "message"}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClearReply}
              style={styles.replyIndicatorClose}
            >
              <Ionicons name="close" size={18} color="hsl(0, 0%, 70%)" />
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
      <View style={styles.inputWrapper}>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={onOpenMediaPicker}
          disabled={uploadingMedia}
        >
          {uploadingMedia ? (
            <ActivityIndicator size="small" color="hsl(75, 100%, 60%)" />
          ) : (
            <Ionicons name="add" size={24} color="hsl(75, 100%, 60%)" />
          )}
        </TouchableOpacity>
        <TextInput
          style={styles.messageInput}
          placeholder={
            replyingToMessage ? "Type a reply..." : "Type a message..."
          }
          placeholderTextColor="hsl(0, 0%, 50%)"
          value={newMessage}
          onChangeText={onChangeMessage}
          multiline
          maxLength={500}
          onSubmitEditing={onSend}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            !canSend && styles.sendButtonDisabled,
          ]}
          onPress={onSend}
          disabled={!canSend}
        >
          {sending ? (
            <ActivityIndicator size="small" color="hsl(0, 0%, 0%)" />
          ) : (
            <Ionicons name="send" size={20} color="hsl(0, 0%, 0%)" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
