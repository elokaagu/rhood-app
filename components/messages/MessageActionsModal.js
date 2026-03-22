import React from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function MessageActionsModal({
  visible,
  message,
  styles,
  onClose,
  onCopy,
  onReply,
  onForward,
  onPin,
  onUnsend,
  onDeleteForYou,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.messageOptionsOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.messageOptionsContainer}>
          <View style={styles.messageOptionsContent}>
            {message ? (
              <>
                <TouchableOpacity
                  style={styles.messageOption}
                  onPress={() => onCopy(message)}
                >
                  <Ionicons name="copy-outline" size={24} color="hsl(0, 0%, 100%)" />
                  <Text style={styles.messageOptionText}>Copy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.messageOption}
                  onPress={() => onReply(message)}
                >
                  <Ionicons name="arrow-undo-outline" size={24} color="hsl(0, 0%, 100%)" />
                  <Text style={styles.messageOptionText}>Reply</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.messageOption}
                  onPress={() => onForward(message)}
                >
                  <Ionicons name="arrow-forward-outline" size={24} color="hsl(0, 0%, 100%)" />
                  <Text style={styles.messageOptionText}>Forward</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.messageOption}
                  onPress={() => onPin(message)}
                >
                  <Ionicons name="pin-outline" size={24} color="hsl(0, 0%, 100%)" />
                  <Text style={styles.messageOptionText}>Pin</Text>
                </TouchableOpacity>

                {message.isOwn ? (
                  <>
                    <View style={styles.messageOptionDivider} />
                    <TouchableOpacity
                      style={[styles.messageOption, styles.messageOptionDestructive]}
                      onPress={() => onUnsend(message)}
                    >
                      <Ionicons name="trash-outline" size={24} color="hsl(0, 100%, 60%)" />
                      <Text
                        style={[
                          styles.messageOptionText,
                          styles.messageOptionTextDestructive,
                        ]}
                      >
                        Unsend
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : null}

                <View style={styles.messageOptionDivider} />
                <TouchableOpacity
                  style={[styles.messageOption, styles.messageOptionDestructive]}
                  onPress={() => onDeleteForYou(message)}
                >
                  <Ionicons name="eye-off-outline" size={24} color="hsl(0, 100%, 60%)" />
                  <Text
                    style={[
                      styles.messageOptionText,
                      styles.messageOptionTextDestructive,
                    ]}
                  >
                    Delete for you
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
          <TouchableOpacity style={styles.messageOptionsCancel} onPress={onClose}>
            <Text style={styles.messageOptionsCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
