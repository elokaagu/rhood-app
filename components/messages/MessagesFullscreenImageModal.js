import React from "react";
import { Modal, View, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function MessagesFullscreenImageModal({
  uri,
  styles,
  onClose,
}) {
  return (
    <Modal
      visible={!!uri}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.fullscreenImageContainer}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.fullscreenImageCloseButton}
          onPress={onClose}
        >
          <Ionicons name="close" size={32} color="hsl(0, 0%, 100%)" />
        </TouchableOpacity>
        {uri ? (
          <Image
            source={{ uri }}
            style={styles.fullscreenImage}
            resizeMode="contain"
          />
        ) : null}
      </TouchableOpacity>
    </Modal>
  );
}
