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
      {selectedMedia.map((media, index) => {
        const isFileLike = media.type === "file" || media.type === "audio";
        const mediaKindLabel =
          media.type === "video"
            ? "VIDEO"
            : media.type === "audio"
              ? "AUDIO"
              : media.type === "image"
                ? "IMAGE"
                : "FILE";
        const uploadProgressPct = Number(media.uploadProgress ?? media.progress ?? 0);
        return (
        <View
          key={index}
          style={[
            styles.mediaPreviewContainer,
            isFileLike && {
              width: 160,
              height: 92,
            },
          ]}
        >
          <View style={styles.mediaPreview}>
            <View
              style={{
                position: "absolute",
                top: 6,
                left: 6,
                zIndex: 2,
                backgroundColor: "rgba(0,0,0,0.65)",
                borderRadius: 8,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text
                style={{
                  color: "hsl(75, 100%, 60%)",
                  fontSize: 10,
                  fontFamily: "Helvetica Neue",
                  fontWeight: "700",
                  letterSpacing: 0.6,
                }}
              >
                {mediaKindLabel}
              </Text>
            </View>
            {media.type === "image" && (
              <Image
                source={{ uri: media.url }}
                style={styles.mediaPreviewImage}
                resizeMode="cover"
              />
            )}
            {media.type === "video" && (
              <>
                {media.thumbnailUrl || media.thumbnail ? (
                  <Image
                    source={{ uri: media.thumbnailUrl || media.thumbnail }}
                    style={styles.mediaPreviewImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.mediaPreviewVideo}>
                    <Ionicons
                      name="videocam"
                      size={24}
                      color="hsl(75, 100%, 60%)"
                    />
                    <Text style={styles.mediaPreviewText}>Video</Text>
                  </View>
                )}
                <View
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    paddingVertical: 6,
                    paddingHorizontal: 8,
                    backgroundColor: "rgba(0,0,0,0.45)",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 4,
                  }}
                  pointerEvents="none"
                >
                  <Ionicons name="play" size={12} color="hsl(0, 0%, 100%)" />
                  <Text
                    style={{
                      color: "hsl(0, 0%, 100%)",
                      fontSize: 12,
                      fontFamily: "Helvetica Neue",
                    }}
                  >
                    Video
                  </Text>
                </View>
              </>
            )}
            {(media.type === "file" || media.type === "audio") && (
              <View
                style={[
                  styles.mediaPreviewFile,
                  {
                    alignItems: "flex-start",
                    justifyContent: "center",
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                  },
                ]}
              >
                <Ionicons
                  name={
                    media.type === "audio"
                      ? "musical-notes"
                      : multimediaService.getFileIcon(media.extension)
                  }
                  size={24}
                  color="hsl(75, 100%, 60%)"
                />
                <View style={{ marginTop: 6 }}>
                  <Text
                    style={[styles.mediaPreviewText, { marginLeft: 0, fontSize: 12 }]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {media.filename || "Attachment"}
                  </Text>
                  {media.size ? (
                    <Text
                      style={[styles.mediaPreviewMeta, { marginLeft: 0 }]}
                      numberOfLines={1}
                    >
                      {multimediaService.formatFileSize(media.size)}
                    </Text>
                  ) : null}
                </View>
              </View>
            )}
            {uploadProgressPct > 0 && uploadProgressPct < 100 ? (
              <View
                style={{
                  position: "absolute",
                  left: 6,
                  right: 6,
                  bottom: 6,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: "rgba(255,255,255,0.2)",
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    width: `${Math.max(0, Math.min(100, uploadProgressPct))}%`,
                    height: "100%",
                    backgroundColor: "hsl(75, 100%, 60%)",
                  }}
                />
              </View>
            ) : null}
          </View>
          <TouchableOpacity
            onPress={() => onRemoveMedia(index)}
            style={styles.removeMediaButton}
          >
            <Ionicons name="close" size={20} color="hsl(0, 0%, 100%)" />
          </TouchableOpacity>
        </View>
      )})}
    </ScrollView>
  );
}
