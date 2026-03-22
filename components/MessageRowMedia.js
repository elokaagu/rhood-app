/**
 * Presentational pieces for MessageRow — keeps the row orchestrator thin.
 */
import React, { memo } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { multimediaService } from "../lib/multimediaService";

/** @param {string|null|undefined} uri */
export function safeImageSource(uri) {
  if (uri == null) return null;
  const s = String(uri).trim();
  return s ? { uri: s } : null;
}

export const MessageRowImage = memo(function MessageRowImage({
  mediaUrl,
  styles,
  onOpen,
}) {
  const source = safeImageSource(mediaUrl);
  if (!source) return null;
  return (
    <TouchableOpacity
      onPress={onOpen}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel="View image full screen"
    >
      <Image source={source} style={styles.messageImage} resizeMode="cover" />
    </TouchableOpacity>
  );
});

export const MessageRowVideo = memo(function MessageRowVideo({
  isOwn,
  thumbnailUrl,
  mediaFilename,
  styles,
  onPlay,
}) {
  const thumbSource = safeImageSource(thumbnailUrl);
  return (
    <TouchableOpacity
      onPress={onPlay}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel="Play video"
    >
      {thumbSource ? (
        <View style={styles.messageVideo}>
          <Image
            source={thumbSource}
            style={styles.messageVideoThumbnail}
            resizeMode="cover"
          />
          <View style={styles.videoPlayOverlay}>
            <View style={styles.videoPlayButton}>
              <Ionicons name="play" size={32} color="hsl(0, 0%, 100%)" />
            </View>
          </View>
        </View>
      ) : (
        <View
          style={[
            styles.messageVideoFile,
            isOwn && styles.ownMessageVideoFile,
          ]}
        >
          <View
            style={[
              styles.videoFileIconContainer,
              isOwn && styles.ownVideoFileIconContainer,
            ]}
          >
            <Ionicons
              name="videocam"
              size={32}
              color={
                isOwn ? "hsl(0, 0%, 0%)" : "hsl(75, 100%, 60%)"
              }
            />
          </View>
          <View style={styles.videoFileInfo}>
            <Text
              style={[
                styles.videoFileName,
                isOwn && styles.ownVideoFileName,
              ]}
              numberOfLines={1}
            >
              {mediaFilename || "Video"}
            </Text>
            <View style={styles.videoFileMeta}>
              <Ionicons
                name="play-circle"
                size={16}
                color={
                  isOwn ? "hsl(0, 0%, 40%)" : "hsl(75, 85%, 70%)"
                }
              />
              <Text
                style={[
                  styles.videoFileMetaText,
                  isOwn && styles.ownVideoFileMetaText,
                ]}
              >
                Tap to play
              </Text>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
});

export const MessageRowAudio = memo(function MessageRowAudio({
  isOwn,
  mediaFilename,
  styles,
  progressPercent,
  isPlaying,
  progressMs,
  durationMs,
  formatDuration,
  onToggle,
}) {
  return (
    <View
      style={[styles.messageAudio, isOwn && styles.ownMessageAudio]}
    >
      <TouchableOpacity
        style={[
          styles.audioPlayButton,
          isOwn && styles.ownAudioPlayButton,
        ]}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? "Pause audio" : "Play audio"}
      >
        <Ionicons
          name={isPlaying ? "pause" : "play"}
          size={20}
          color="hsl(0, 0%, 0%)"
        />
      </TouchableOpacity>
      <View style={styles.audioContent}>
        <View
          style={[
            styles.audioProgressBar,
            isOwn && styles.ownAudioProgressBar,
          ]}
        >
          <View
            style={[
              styles.audioProgressFill,
              isOwn && styles.ownAudioProgressFill,
              { width: `${progressPercent}%` },
            ]}
          />
        </View>
        <View style={styles.audioInfoRow}>
          <View style={styles.audioLabelContainer}>
            {mediaFilename ? (
              <Text
                style={[
                  styles.audioLabel,
                  isOwn ? styles.ownAudioLabel : styles.otherAudioLabel,
                ]}
                numberOfLines={1}
              >
                {mediaFilename.replace(/\.[^/.]+$/, "")}
              </Text>
            ) : null}
            <Text
              style={[
                styles.audioDuration,
                isOwn ? styles.ownAudioDuration : styles.otherAudioDuration,
              ]}
            >
              {isPlaying ? formatDuration(progressMs) : "0:00"} /{" "}
              {formatDuration(durationMs)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
});

export const MessageRowFile = memo(function MessageRowFile({
  isOwn,
  fileExtension,
  mediaFilename,
  mediaSize,
  mediaMimeType,
  styles,
  onOpen,
}) {
  return (
    <TouchableOpacity
      style={[styles.messageFile, isOwn && styles.ownMessageFile]}
      onPress={onOpen}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Open file ${mediaFilename || "attachment"}`}
    >
      <View
        style={[
          styles.fileIconContainer,
          isOwn && styles.ownFileIconContainer,
        ]}
      >
        <Ionicons
          name={multimediaService.getFileIcon(fileExtension)}
          size={28}
          color={isOwn ? "hsl(0, 0%, 0%)" : "hsl(75, 100%, 60%)"}
        />
      </View>
      <View style={styles.fileInfo}>
        <Text
          style={[styles.fileName, isOwn && styles.ownFileName]}
          numberOfLines={2}
        >
          {mediaFilename || "Attachment"}
        </Text>
        <Text
          style={[styles.fileSize, isOwn && styles.ownFileSize]}
        >
          {mediaSize
            ? multimediaService.formatFileSize(mediaSize)
            : mediaMimeType || ""}
        </Text>
      </View>
      <Ionicons
        name="download-outline"
        size={20}
        color={isOwn ? "hsl(0, 0%, 0%)" : "hsl(75, 100%, 60%)"}
        style={styles.downloadIcon}
      />
    </TouchableOpacity>
  );
});
