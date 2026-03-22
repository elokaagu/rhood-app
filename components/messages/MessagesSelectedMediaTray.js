import React from "react";
import { View, Text, ScrollView, Image, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { multimediaService } from "../../lib/multimediaService";

export default function MessagesSelectedMediaTray({
  selectedMedia,
  styles,
  onRemoveMedia,
}) {
  if (!selectedMedia?.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.selectedMediaContainer}
      contentContainerStyle={styles.selectedMediaContent}
    >
      {selectedMedia.map((media, index) => (
        <View key={index} style={styles.mediaPreviewContainer}>
          <View style={styles.mediaPreview}>
            {media.type === "image" && (
              <Image
                source={{ uri: media.url }}
                style={styles.mediaPreviewImage}
                resizeMode="cover"
              />
            )}
            {media.type === "video" && (
              <View style={styles.mediaPreviewVideo}>
                <Ionicons
                  name="videocam"
                  size={24}
                  color="hsl(75, 100%, 60%)"
                />
                <Text style={styles.mediaPreviewText}>Video</Text>
              </View>
            )}
            {(media.type === "file" || media.type === "audio") && (
              <View style={styles.mediaPreviewFile}>
                <Ionicons
                  name={
                    media.type === "audio"
                      ? "musical-notes"
                      : multimediaService.getFileIcon(media.extension)
                  }
                  size={24}
                  color="hsl(75, 100%, 60%)"
                />
                <View>
                  <Text style={styles.mediaPreviewText}>
                    {media.filename || "Attachment"}
                  </Text>
                  {media.size ? (
                    <Text style={styles.mediaPreviewMeta}>
                      {multimediaService.formatFileSize(media.size)}
                    </Text>
                  ) : null}
                </View>
              </View>
            )}
          </View>
          <TouchableOpacity
            onPress={() => onRemoveMedia(index)}
            style={styles.removeMediaButton}
          >
            <Ionicons name="close" size={20} color="hsl(0, 0%, 100%)" />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}
