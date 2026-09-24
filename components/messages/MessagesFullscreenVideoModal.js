import React from "react";
import {
  Modal,
  View,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Video } from "expo-av";

import { rhoodAlert } from "../../lib/rhoodAlert";
export default function MessagesFullscreenVideoModal({
  uri,
  styles,
  onClose,
}) {
  return (
    <Modal
      visible={!!uri}
      transparent={false}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.fullscreenVideoContainer}>
        <TouchableOpacity
          style={styles.fullscreenVideoCloseButton}
          onPress={onClose}
        >
          <Ionicons name="close" size={32} color="hsl(0, 0%, 100%)" />
        </TouchableOpacity>
        {uri ? (
          <Video
            source={{ uri }}
            style={styles.fullscreenVideo}
            useNativeControls
            resizeMode={Video.RESIZE_MODE_CONTAIN}
            shouldPlay
            isLooping={false}
            onError={(error) => {
              console.error("Video playback error:", error);
              rhoodAlert("Error", "Failed to play video");
              onClose();
            }}
          />
        ) : null}
      </View>
    </Modal>
  );
}
