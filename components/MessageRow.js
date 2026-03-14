import React, { memo } from "react";
import {
  View,
  Text,
  Pressable,
  TouchableOpacity,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProgressiveImage from "./ProgressiveImage";
import OpportunityMessageCard from "./OpportunityMessageCard";
import { multimediaService } from "../lib/multimediaService";

const MessageRow = memo(function MessageRow({
  message,
  onLongPress,
  onOpportunityPress,
  setFullscreenImage,
  onVideoPlay,
  onAudioToggle,
  onFileOpen,
  playingAudioId,
  audioDurations,
  audioProgress,
  renderMessageText,
  renderLinkPreviews,
  formatTime,
  formatDuration,
  styles,
}) {
  return (
    <View
      style={[
        styles.messageContainer,
        message.isOwn ? styles.ownMessage : styles.otherMessage,
      ]}
    >
      {!message.isOwn && (
        <View style={styles.messageHeader}>
          <ProgressiveImage
            source={{ uri: message.senderImage }}
            style={styles.messageAvatar}
            placeholderStyle={styles.messageAvatarPlaceholder}
          />
          <Text style={styles.senderName}>{message.senderName}</Text>
        </View>
      )}
      <Pressable
        style={[
          styles.messageBubble,
          message.isOwn ? styles.ownBubble : styles.otherBubble,
          message.messageType !== "text" &&
            message.mediaUrl &&
            styles.mediaBubble,
        ]}
        onLongPress={() => onLongPress(message)}
        delayLongPress={250}
      >
        {message.messageType === "opportunity" && message.opportunity ? (
          <OpportunityMessageCard
            opportunity={message.opportunity}
            isOwn={message.isOwn}
            onPress={(opp) => onOpportunityPress(opp)}
          />
        ) : message.messageType !== "text" && message.mediaUrl ? (
          <View style={styles.mediaContent}>
            {message.messageType === "image" && (
              <TouchableOpacity
                onPress={() => setFullscreenImage(message.mediaUrl)}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: message.mediaUrl }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            )}
            {message.messageType === "video" && (
              <TouchableOpacity
                onPress={() => onVideoPlay(message.mediaUrl)}
                activeOpacity={0.9}
              >
                {message.thumbnailUrl ? (
                  <View style={styles.messageVideo}>
                    <Image
                      source={{ uri: message.thumbnailUrl }}
                      style={styles.messageVideoThumbnail}
                      resizeMode="cover"
                    />
                    <View style={styles.videoPlayOverlay}>
                      <View style={styles.videoPlayButton}>
                        <Ionicons
                          name="play"
                          size={32}
                          color="hsl(0, 0%, 100%)"
                        />
                      </View>
                    </View>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.messageVideoFile,
                      message.isOwn && styles.ownMessageVideoFile,
                    ]}
                  >
                    <View
                      style={[
                        styles.videoFileIconContainer,
                        message.isOwn && styles.ownVideoFileIconContainer,
                      ]}
                    >
                      <Ionicons
                        name="videocam"
                        size={32}
                        color={
                          message.isOwn
                            ? "hsl(0, 0%, 0%)"
                            : "hsl(75, 100%, 60%)"
                        }
                      />
                    </View>
                    <View style={styles.videoFileInfo}>
                      <Text
                        style={[
                          styles.videoFileName,
                          message.isOwn && styles.ownVideoFileName,
                        ]}
                        numberOfLines={1}
                      >
                        {message.mediaFilename || "Video"}
                      </Text>
                      <View style={styles.videoFileMeta}>
                        <Ionicons
                          name="play-circle"
                          size={16}
                          color={
                            message.isOwn
                              ? "hsl(0, 0%, 40%)"
                              : "hsl(75, 85%, 70%)"
                          }
                        />
                        <Text
                          style={[
                            styles.videoFileMetaText,
                            message.isOwn && styles.ownVideoFileMetaText,
                          ]}
                        >
                          Tap to play
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            )}
            {message.messageType === "audio" && (
              <View
                style={[
                  styles.messageAudio,
                  message.isOwn && styles.ownMessageAudio,
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.audioPlayButton,
                    message.isOwn && styles.ownAudioPlayButton,
                  ]}
                  onPress={() => onAudioToggle(message.id, message.mediaUrl)}
                >
                  <Ionicons
                    name={
                      playingAudioId === message.id ? "pause" : "play"
                    }
                    size={20}
                    color={
                      message.isOwn ? "hsl(0, 0%, 0%)" : "hsl(0, 0%, 0%)"
                    }
                  />
                </TouchableOpacity>
                <View style={styles.audioContent}>
                  <View
                    style={[
                      styles.audioProgressBar,
                      message.isOwn && styles.ownAudioProgressBar,
                    ]}
                  >
                    <View
                      style={[
                        styles.audioProgressFill,
                        message.isOwn && styles.ownAudioProgressFill,
                        {
                          width: `${
                            audioDurations[message.id] && audioProgress[message.id]
                              ? Math.min(
                                  100,
                                  (audioProgress[message.id] /
                                    audioDurations[message.id]) *
                                    100
                                )
                              : 0
                          }%`,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.audioInfoRow}>
                    <View style={styles.audioLabelContainer}>
                      {message.mediaFilename && (
                        <Text
                          style={[
                            styles.audioLabel,
                            message.isOwn
                              ? styles.ownAudioLabel
                              : styles.otherAudioLabel,
                          ]}
                          numberOfLines={1}
                        >
                          {message.mediaFilename.replace(/\.[^/.]+$/, "")}
                        </Text>
                      )}
                      <Text
                        style={[
                          styles.audioDuration,
                          message.isOwn
                            ? styles.ownAudioDuration
                            : styles.otherAudioDuration,
                        ]}
                      >
                        {playingAudioId === message.id
                          ? formatDuration(audioProgress[message.id] || 0)
                          : "0:00"}{" "}
                        / {formatDuration(audioDurations[message.id] || 0)}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
            {message.messageType !== "image" &&
              message.messageType !== "video" &&
              message.messageType !== "audio" &&
              message.mediaUrl && (
                <TouchableOpacity
                  style={[
                    styles.messageFile,
                    message.isOwn && styles.ownMessageFile,
                  ]}
                  onPress={() =>
                    onFileOpen(
                      message.mediaUrl,
                      message.mediaFilename,
                      message.mediaMimeType
                    )
                  }
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.fileIconContainer,
                      message.isOwn && styles.ownFileIconContainer,
                    ]}
                  >
                    <Ionicons
                      name={multimediaService.getFileIcon(
                        message.fileExtension
                      )}
                      size={28}
                      color={
                        message.isOwn
                          ? "hsl(0, 0%, 0%)"
                          : "hsl(75, 100%, 60%)"
                      }
                    />
                  </View>
                  <View style={styles.fileInfo}>
                    <Text
                      style={[
                        styles.fileName,
                        message.isOwn && styles.ownFileName,
                      ]}
                    >
                      {message.mediaFilename || "Attachment"}
                    </Text>
                    <Text
                      style={[
                        styles.fileSize,
                        message.isOwn && styles.ownFileSize,
                      ]}
                    >
                      {message.mediaSize
                        ? multimediaService.formatFileSize(
                            message.mediaSize
                          )
                        : message.mediaMimeType || ""}
                    </Text>
                  </View>
                  <Ionicons
                    name="download-outline"
                    size={20}
                    color={
                      message.isOwn
                        ? "hsl(0, 0%, 0%)"
                        : "hsl(75, 100%, 60%)"
                    }
                    style={styles.downloadIcon}
                  />
                </TouchableOpacity>
              )}
            {message.content && message.content.trim() && (
              <View
                style={{
                  paddingHorizontal: 12,
                  paddingTop: 8,
                  paddingBottom: 4,
                }}
              >
                {renderMessageText(message)}
              </View>
            )}
          </View>
        ) : (
          renderMessageText(message)
        )}
        {message.messageType !== "opportunity" &&
          renderLinkPreviews(message)}
        <Text
          style={[
            styles.messageTime,
            message.isOwn ? styles.ownMessageTime : styles.otherMessageTime,
          ]}
        >
          {formatTime(message.timestamp)}
        </Text>
      </Pressable>
    </View>
  );
});

export default MessageRow;
