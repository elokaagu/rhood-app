import React, { memo, useCallback, useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import ProgressiveImage from "./ProgressiveImage";
import OpportunityMessageCard from "./OpportunityMessageCard";
import {
  safeImageSource,
  MessageRowImage,
  MessageRowVideo,
  MessageRowAudio,
  MessageRowFile,
} from "./MessageRowMedia";

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
  if (message.rowType === "separator") {
    return (
      <View style={styles.timeSeparatorWrap}>
        <Text style={styles.timeSeparatorText}>{message.label}</Text>
      </View>
    );
  }
  const isOwn = message.isOwn;
  const messageType = message.messageType;
  const mediaUrlRaw = message.mediaUrl;
  const mediaUrl =
    typeof mediaUrlRaw === "string" ? mediaUrlRaw.trim() : "";
  const hasMediaUri = mediaUrl.length > 0;
  const isNonTextMedia = messageType !== "text" && hasMediaUri;
  const isOpportunityRow =
    messageType === "opportunity" && message.opportunity;
  const hasCaption = Boolean(message.content?.trim());

  const senderAvatarSource = safeImageSource(message.senderImage);
  const showSenderHeader = !isOwn && message.showSenderHeader !== false;
  const showTimestamp = message.showTimestamp !== false;

  const fallbackDurationMs =
    Number(message?.metadata?.duration_millis) ||
    Number(message?.metadata?.durationMillis) ||
    0;
  const audioDurationMs = audioDurations[message.id] ?? fallbackDurationMs;
  const audioProgressMs = audioProgress[message.id] ?? 0;
  const audioProgressPct = useMemo(() => {
    if (audioDurationMs <= 0) return 0;
    return Math.min(100, (audioProgressMs / audioDurationMs) * 100);
  }, [audioDurationMs, audioProgressMs]);
  const isAudioPlaying = playingAudioId === message.id;

  const bubbleStyle = useMemo(
    () => [
      styles.messageBubble,
      isOwn ? styles.ownBubble : styles.otherBubble,
      isNonTextMedia && hasMediaUri ? styles.mediaBubble : null,
    ],
    [styles, isOwn, isNonTextMedia, hasMediaUri]
  );

  const messageTimeStyle = useMemo(
    () => [
      styles.messageTime,
      isOwn ? styles.ownMessageTime : styles.otherMessageTime,
    ],
    [styles, isOwn]
  );

  const containerStyle = useMemo(
    () => [
      styles.messageContainer,
      isOwn ? styles.ownMessage : styles.otherMessage,
      message.isGrouped ? styles.messageContainerGrouped : null,
    ],
    [styles, isOwn, message.isGrouped]
  );

  const onLongPressRow = useCallback(
    () => onLongPress(message),
    [onLongPress, message]
  );

  const onOpenImage = useCallback(
    () => setFullscreenImage(mediaUrl),
    [setFullscreenImage, mediaUrl]
  );

  const onPlayVideo = useCallback(
    () => onVideoPlay(mediaUrl),
    [onVideoPlay, mediaUrl]
  );

  const onToggleAudio = useCallback(
    () => onAudioToggle(message.id, mediaUrl),
    [onAudioToggle, message.id, mediaUrl]
  );

  const onOpenFile = useCallback(
    () =>
      onFileOpen(
        mediaUrl,
        message.mediaFilename,
        message.mediaMimeType
      ),
    [onFileOpen, mediaUrl, message.mediaFilename, message.mediaMimeType]
  );

  const isGenericFile =
    isNonTextMedia &&
    messageType !== "image" &&
    messageType !== "video" &&
    messageType !== "audio" &&
    hasMediaUri;

  return (
    <View style={containerStyle}>
      {showSenderHeader && (
        <View style={styles.messageHeader}>
          <ProgressiveImage
            source={senderAvatarSource}
            style={styles.messageAvatar}
            placeholder={
              <View style={styles.messageAvatarPlaceholder} />
            }
          />
          <Text style={styles.senderName}>{message.senderName}</Text>
        </View>
      )}
      <Pressable
        style={bubbleStyle}
        onLongPress={onLongPressRow}
        delayLongPress={250}
      >
        {isOpportunityRow ? (
          <OpportunityMessageCard
            opportunity={message.opportunity}
            isOwn={isOwn}
            onPress={onOpportunityPress}
          />
        ) : isNonTextMedia ? (
          <View style={styles.mediaContent}>
            {messageType === "image" && (
              <MessageRowImage
                mediaUrl={mediaUrl}
                styles={styles}
                onOpen={onOpenImage}
              />
            )}
            {messageType === "video" && (
              <MessageRowVideo
                isOwn={isOwn}
                thumbnailUrl={message.thumbnailUrl}
                mediaFilename={message.mediaFilename}
                durationMs={Number(message?.metadata?.duration_millis) || 0}
                styles={styles}
                onPlay={onPlayVideo}
              />
            )}
            {messageType === "audio" && (
              <MessageRowAudio
                isOwn={isOwn}
                mediaFilename={message.mediaFilename}
                styles={styles}
                progressPercent={audioProgressPct}
                isPlaying={isAudioPlaying}
                progressMs={audioProgressMs}
                durationMs={audioDurationMs}
                formatDuration={formatDuration}
                onToggle={onToggleAudio}
              />
            )}
            {isGenericFile && (
              <MessageRowFile
                isOwn={isOwn}
                fileExtension={message.fileExtension}
                mediaFilename={message.mediaFilename}
                mediaSize={message.mediaSize}
                mediaMimeType={message.mediaMimeType}
                styles={styles}
                onOpen={onOpenFile}
              />
            )}
            {hasCaption ? (
              <View style={styles.mediaCaptionWrap}>
                {renderMessageText(message)}
              </View>
            ) : null}
          </View>
        ) : (
          renderMessageText(message)
        )}
        {messageType !== "opportunity" && renderLinkPreviews(message)}
        {showTimestamp ? (
          <Text style={messageTimeStyle}>{formatTime(message.timestamp)}</Text>
        ) : null}
      </Pressable>
    </View>
  );
});

export default MessageRow;
