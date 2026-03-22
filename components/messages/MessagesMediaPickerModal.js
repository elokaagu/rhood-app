import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function MessagesMediaPickerModal({
  visible,
  uploadingMedia,
  styles,
  onClose,
  onPickImage,
  onPickVideo,
  onPickAudio,
  onPickDocument,
}) {
  if (!visible) return null;

  return (
    <View style={styles.mediaPickerOverlay}>
      <View style={styles.mediaPickerContainer}>
        <Text style={styles.mediaPickerTitle}>Choose Media Type</Text>
        <View style={styles.mediaPickerButtons}>
          <TouchableOpacity
            style={styles.mediaPickerButton}
            onPress={onPickImage}
            disabled={uploadingMedia}
          >
            <Ionicons name="image" size={24} color="hsl(75, 100%, 60%)" />
            <Text style={styles.mediaPickerButtonText}>Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mediaPickerButton}
            onPress={onPickVideo}
            disabled={uploadingMedia}
          >
            <Ionicons name="videocam" size={24} color="hsl(75, 100%, 60%)" />
            <Text style={styles.mediaPickerButtonText}>Video</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mediaPickerButton}
            onPress={onPickAudio}
            disabled={uploadingMedia}
          >
            <Ionicons name="musical-notes" size={24} color="hsl(75, 100%, 60%)" />
            <Text style={styles.mediaPickerButtonText}>Audio</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.mediaPickerButton}
            onPress={onPickDocument}
            disabled={uploadingMedia}
          >
            <Ionicons name="document" size={24} color="hsl(75, 100%, 60%)" />
            <Text style={styles.mediaPickerButtonText}>File</Text>
          </TouchableOpacity>
        </View>
        {uploadingMedia && (
          <ActivityIndicator
            style={styles.mediaPickerSpinner}
            size="small"
            color="hsl(75, 100%, 60%)"
          />
        )}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onClose}
          disabled={uploadingMedia}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
