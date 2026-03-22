/**
 * Normalizes DB / realtime payloads into MessageRow-shaped objects.
 */
import { extractUrls } from "../messageUrlUtils";

export function transformDirectMessageFromQuery(msg, userId) {
  return {
    id: msg.id,
    content: msg.content || "",
    senderId: msg.sender_id,
    senderName: msg.sender?.dj_name || msg.sender?.full_name || "Unknown",
    senderImage: msg.sender?.profile_image_url,
    timestamp: msg.created_at,
    isOwn: msg.sender_id === userId,
    messageType: (msg.message_type || "text").toLowerCase(),
    mediaUrl: msg.media_url,
    mediaFilename: msg.media_filename,
    mediaSize: msg.media_size,
    mediaMimeType: msg.media_mime_type,
    thumbnailUrl: msg.thumbnail_url,
    metadata: msg.metadata || null,
    opportunity: msg.metadata?.opportunity || null,
    fileExtension: msg.file_extension,
    urls: extractUrls(msg.content || ""),
    recordType: "direct",
    threadId: msg.thread_id,
  };
}

export function transformGroupMessageFromQuery(msg, userId, communityId) {
  return {
    id: msg.id,
    content: msg.content || "",
    senderId: msg.author_id,
    senderName: msg.author?.dj_name || msg.author?.full_name || "Unknown",
    senderImage: msg.author?.profile_image_url,
    timestamp: msg.created_at,
    isOwn: msg.author_id === userId,
    messageType: (msg.message_type || "text").toLowerCase(),
    mediaUrl: msg.media_url,
    mediaFilename: msg.media_filename,
    mediaSize: msg.media_size,
    mediaMimeType: msg.media_mime_type,
    thumbnailUrl: msg.thumbnail_url,
    fileExtension: msg.file_extension,
    urls: extractUrls(msg.content || ""),
    recordType: "group",
    communityId,
  };
}

export function transformDirectMessageFromRealtime(payloadNew, senderProfile, userId) {
  return {
    id: payloadNew.id,
    content: payloadNew.content || "",
    senderId: payloadNew.sender_id,
    senderName:
      senderProfile?.dj_name || senderProfile?.full_name || "Unknown",
    senderImage: senderProfile?.profile_image_url,
    timestamp: payloadNew.created_at,
    isOwn: payloadNew.sender_id === userId,
    messageType: (payloadNew.message_type || "text").toLowerCase(),
    mediaUrl: payloadNew.media_url,
    mediaFilename: payloadNew.media_filename,
    mediaSize: payloadNew.media_size,
    mediaMimeType: payloadNew.media_mime_type,
    thumbnailUrl: payloadNew.thumbnail_url,
    fileExtension: payloadNew.file_extension,
    urls: extractUrls(payloadNew.content || ""),
    recordType: "direct",
    threadId: payloadNew.thread_id,
  };
}

export function transformGroupMessageFromRealtime(payloadNew, senderProfile, userId) {
  return {
    id: payloadNew.id,
    content: payloadNew.content || "",
    senderId: payloadNew.author_id,
    senderName:
      senderProfile?.dj_name || senderProfile?.full_name || "Unknown",
    senderImage: senderProfile?.profile_image_url,
    timestamp: payloadNew.created_at,
    isOwn: payloadNew.author_id === userId,
    messageType: (payloadNew.message_type || "text").toLowerCase(),
    mediaUrl: payloadNew.media_url,
    mediaFilename: payloadNew.media_filename,
    mediaSize: payloadNew.media_size,
    mediaMimeType: payloadNew.media_mime_type,
    thumbnailUrl: payloadNew.thumbnail_url,
    fileExtension: payloadNew.file_extension,
    urls: extractUrls(payloadNew.content || ""),
    recordType: "group",
    communityId: payloadNew.community_id,
  };
}
