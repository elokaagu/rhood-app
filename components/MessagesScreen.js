import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  Image,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase, db } from "../lib/supabase";
import { multimediaService } from "../lib/multimediaService";
import ProgressiveImage from "./ProgressiveImage";

const MessagesScreen = ({ user, navigation, route }) => {
  const { params } = route || {};
  const { djId, communityId, chatType = "individual" } = params || {};

  // State
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  const [communityData, setCommunityData] = useState(null);
  const [memberCount, setMemberCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [threadId, setThreadId] = useState(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);

  // Refs
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const channelRef = useRef(null);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!user?.id) return;

    try {
      console.log("📥 Loading messages...", { chatType, djId, communityId });

      if (chatType === "individual" && djId) {
        // Get or create thread
        const currentThreadId = await db.findOrCreateIndividualMessageThread(
          user.id,
          djId
        );
        setThreadId(currentThreadId);
        console.log("🧵 Thread ID:", currentThreadId);

        // Load messages for this thread
        console.log("🔍 Querying messages for thread:", currentThreadId);
        console.log("🔍 Current user ID:", user.id);

        // First, try a simple query without joins to test RLS
        const { data: simpleData, error: simpleError } = await supabase
          .from("messages")
          .select("id, thread_id, sender_id, content, created_at")
          .eq("thread_id", currentThreadId);

        console.log("🔍 Simple query result:", {
          count: simpleData?.length || 0,
          error: simpleError?.message,
          errorCode: simpleError?.code,
          data: simpleData,
        });

        // Now try with the join
        const { data, error } = await supabase
          .from("messages")
          .select(
            `
            *,
            sender:user_profiles!messages_sender_id_fkey(
              id,
              dj_name,
              full_name,
              profile_image_url
            )
          `
          )
          .eq("thread_id", currentThreadId)
          .order("created_at", { ascending: true });

        console.log("🔍 Full query result:", {
          count: data?.length || 0,
          error: error?.message,
          errorCode: error?.code,
        });

        if (error) {
          console.error("❌ Error loading messages:", error);
          console.error("❌ Error details:", {
            code: error.code,
            message: error.message,
            hint: error.hint,
            details: error.details,
          });
          Alert.alert("Error", `Failed to load messages: ${error.message}`);
          return;
        }

        // Transform messages
        const transformedMessages = (data || []).map((msg) => ({
          id: msg.id,
          content: msg.content || "",
          senderId: msg.sender_id,
          senderName: msg.sender?.dj_name || msg.sender?.full_name || "Unknown",
          senderImage: msg.sender?.profile_image_url,
          timestamp: msg.created_at,
          isOwn: msg.sender_id === user.id,
          messageType: (msg.message_type || "text").toLowerCase(),
          mediaUrl: msg.media_url,
          mediaFilename: msg.media_filename,
          mediaSize: msg.media_size,
          mediaMimeType: msg.media_mime_type,
          thumbnailUrl: msg.thumbnail_url,
          fileExtension: msg.file_extension,
        }));

        console.log("📨 Loaded messages:", transformedMessages.length);
        setMessages(transformedMessages);

        // Load other user profile
        const otherUserProfile = await db.getUserProfilePublic(djId);
        if (otherUserProfile) {
          setOtherUser(otherUserProfile);
        }

        // Check connection status
        const connections = await db.getUserConnections(user.id);
        const connection = connections.find(
          (conn) => conn.connected_user_id === djId
        );
        setIsConnected(connection?.connection_status === "accepted");
        setConnectionStatus(connection?.connection_status || null);
        setMemberCount(0);
      } else if (chatType === "group" && communityId) {
        // Load group chat messages
        const groupMessages = await db.getGroupMessages(communityId);
        const transformedMessages = (groupMessages || []).map((msg) => ({
          id: msg.id,
          content: msg.content || "",
          senderId: msg.author_id,
          senderName: msg.author?.dj_name || msg.author?.full_name || "Unknown",
          senderImage: msg.author?.profile_image_url,
          timestamp: msg.created_at,
          isOwn: msg.author_id === user.id,
          messageType: (msg.message_type || "text").toLowerCase(),
          mediaUrl: msg.media_url,
          mediaFilename: msg.media_filename,
          mediaSize: msg.media_size,
          mediaMimeType: msg.media_mime_type,
          thumbnailUrl: msg.thumbnail_url,
          fileExtension: msg.file_extension,
        }));

        setMessages(transformedMessages);

        // Load community data
        const { data: community } = await supabase
          .from("communities")
          .select("*")
          .eq("id", communityId)
          .single();

        if (community) {
          setCommunityData(community);
        }

        try {
          const count = await db.getCommunityMemberCount(communityId);
          setMemberCount(count || 0);
        } catch (countError) {
          console.error("Error fetching community member count:", countError);
          setMemberCount(0);
        }
        setConnectionStatus(null);
      }
    } catch (error) {
      console.error("❌ Error in loadMessages:", error);
      Alert.alert("Error", "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [user?.id, chatType, djId, communityId]);

  // Set up real-time subscription
  useEffect(() => {
    if (!user?.id || loading) return;

    let channel;

    if (chatType === "individual" && threadId) {
      console.log("🔔 Setting up real-time subscription for thread:", threadId);

      channel = supabase
        .channel(`messages-${threadId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `thread_id=eq.${threadId}`,
          },
          async (payload) => {
            console.log("📨 New message received:", payload.new);

            // Fetch sender profile
            const senderProfile = await db.getUserProfilePublic(
              payload.new.sender_id
            );

            const newMessage = {
              id: payload.new.id,
              content: payload.new.content || "",
              senderId: payload.new.sender_id,
              senderName:
                senderProfile?.dj_name || senderProfile?.full_name || "Unknown",
              senderImage: senderProfile?.profile_image_url,
              timestamp: payload.new.created_at,
              isOwn: payload.new.sender_id === user.id,
              messageType: (payload.new.message_type || "text").toLowerCase(),
              mediaUrl: payload.new.media_url,
              mediaFilename: payload.new.media_filename,
              mediaSize: payload.new.media_size,
              mediaMimeType: payload.new.media_mime_type,
              thumbnailUrl: payload.new.thumbnail_url,
              fileExtension: payload.new.file_extension,
            };

            setMessages((prev) => {
              // Prevent duplicates
              if (prev.find((m) => m.id === newMessage.id)) {
                return prev;
              }
              return [...prev, newMessage];
            });

            // Scroll to bottom
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        )
        .subscribe();

      channelRef.current = channel;
    } else if (chatType === "group" && communityId) {
      channel = supabase
        .channel(`group-messages-${communityId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "community_posts",
            filter: `community_id=eq.${communityId}`,
          },
          async (payload) => {
            console.log("📨 New group message received:", payload.new);

            const senderProfile = await db.getUserProfilePublic(
              payload.new.author_id
            );

            const newMessage = {
              id: payload.new.id,
              content: payload.new.content || "",
              senderId: payload.new.author_id,
              senderName:
                senderProfile?.dj_name || senderProfile?.full_name || "Unknown",
              senderImage: senderProfile?.profile_image_url,
              timestamp: payload.new.created_at,
              isOwn: payload.new.author_id === user.id,
              messageType: (payload.new.message_type || "text").toLowerCase(),
              mediaUrl: payload.new.media_url,
              mediaFilename: payload.new.media_filename,
              mediaSize: payload.new.media_size,
              mediaMimeType: payload.new.media_mime_type,
              thumbnailUrl: payload.new.thumbnail_url,
              fileExtension: payload.new.file_extension,
            };

            setMessages((prev) => {
              if (prev.find((m) => m.id === newMessage.id)) {
                return prev;
              }
              return [...prev, newMessage];
            });

            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
          }
        )
        .subscribe();

      channelRef.current = channel;
    }

    return () => {
      if (channel) {
        console.log("🔕 Cleaning up subscription");
        supabase.removeChannel(channel);
      }
    };
  }, [user?.id, chatType, threadId, communityId, loading]);

  // Initial load
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Fade in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  const selectAndUploadMedia = useCallback(async (pickerFn, label) => {
    try {
      setUploadingMedia(true);
      const picked = await pickerFn();

      if (!picked) {
        return;
      }

      if (picked.type === "error" && picked.available === false) {
        Alert.alert(
          "Feature Unavailable",
          picked.message ||
            "This action requires a development build or production app."
        );
        setShowMediaPicker(false);
        return;
      }

      const uploadResult = await multimediaService.uploadToStorage(picked);
      const normalizedType = picked.type === "document" ? "file" : picked.type;

      setSelectedMedia({
        type: normalizedType,
        url: uploadResult.url,
        filename: uploadResult.filename || picked.filename,
        size: picked.size ?? uploadResult.size ?? 0,
        mimeType: picked.mimeType ?? uploadResult.mimeType,
        thumbnailUrl: uploadResult.thumbnailUrl || picked.thumbnail || null,
        extension:
          uploadResult.fileExtension ||
          picked.extension ||
          picked.filename?.split(".").pop()?.toLowerCase() ||
          null,
      });

      setShowMediaPicker(false);
    } catch (error) {
      console.error(`❌ Error uploading ${label}:`, error);
      Alert.alert(
        "Upload Error",
        error.message || `Failed to upload ${label}. Please try again.`
      );
    } finally {
      setUploadingMedia(false);
    }
  }, []);

  const handleImageUpload = useCallback(async () => {
    try {
      await selectAndUploadMedia(() => multimediaService.pickImage(), "photo");
    } catch (error) {
      console.error("❌ Error in handleImageUpload:", error);
      Alert.alert(
        "Image Upload Error",
        error.message || "Failed to pick image. Please try again."
      );
      setUploadingMedia(false);
      setShowMediaPicker(false);
    }
  }, [selectAndUploadMedia]);

  const handleVideoUpload = useCallback(async () => {
    try {
      await selectAndUploadMedia(() => multimediaService.pickVideo(), "video");
    } catch (error) {
      console.error("❌ Error in handleVideoUpload:", error);
      Alert.alert(
        "Video Upload Error",
        error.message || "Failed to pick video. Please try again."
      );
      setUploadingMedia(false);
      setShowMediaPicker(false);
    }
  }, [selectAndUploadMedia]);

  const handleAudioUpload = useCallback(async () => {
    try {
      await selectAndUploadMedia(() => multimediaService.pickAudio(), "audio");
    } catch (error) {
      console.error("❌ Error in handleAudioUpload:", error);
      Alert.alert(
        "Audio Upload Error",
        error.message || "Failed to pick audio. Please try again."
      );
      setUploadingMedia(false);
      setShowMediaPicker(false);
    }
  }, [selectAndUploadMedia]);

  const handleDocumentUpload = useCallback(async () => {
    try {
      await selectAndUploadMedia(
        () => multimediaService.pickDocument(),
        "file"
      );
    } catch (error) {
      console.error("❌ Error in handleDocumentUpload:", error);
      Alert.alert(
        "File Upload Error",
        error.message || "Failed to pick file. Please try again."
      );
      setUploadingMedia(false);
      setShowMediaPicker(false);
    }
  }, [selectAndUploadMedia]);

  const clearSelectedMedia = useCallback(() => {
    setSelectedMedia(null);
  }, []);

  // Send message
  const sendMessage = useCallback(async () => {
    if ((!newMessage.trim() && !selectedMedia) || sending) {
      console.log("⚠️ Cannot send:", {
        hasMessage: !!newMessage.trim(),
        hasMedia: !!selectedMedia,
        sending,
      });
      return;
    }

    if (!user?.id) {
      console.error("❌ No user ID");
      Alert.alert("Error", "You must be logged in to send messages");
      return;
    }

    const messageContent = newMessage.trim();
    const mediaData = selectedMedia;
    console.log("📤 Sending message:", {
      content: messageContent,
      chatType,
      djId,
      communityId,
      userId: user.id,
      isConnected,
      threadId,
      hasMedia: !!mediaData,
    });

    setNewMessage("");
    setSelectedMedia(null);
    setSending(true);

    try {
      if (chatType === "individual" && djId) {
        // Get thread ID (should already be set, but ensure it exists)
        let currentThreadId = threadId;

        if (!currentThreadId) {
          console.log("🔍 Thread ID not set, fetching...");
          currentThreadId = await db.findOrCreateIndividualMessageThread(
            user.id,
            djId
          );
          setThreadId(currentThreadId);
        }

        console.log("🧵 Using thread ID:", currentThreadId);

        if (!currentThreadId) {
          throw new Error("Failed to get thread ID");
        }

        console.log("💾 Inserting message to database...");
        const messageInsertData = {
          thread_id: currentThreadId,
          sender_id: user.id,
          content: messageContent || "",
          message_type: mediaData ? mediaData.type : "text",
        };

        if (mediaData) {
          messageInsertData.media_url = mediaData.url;
          messageInsertData.media_filename = mediaData.filename;
          messageInsertData.media_size = mediaData.size;
          messageInsertData.media_mime_type = mediaData.mimeType;
          messageInsertData.thumbnail_url = mediaData.thumbnailUrl;
          messageInsertData.file_extension = mediaData.extension;
        }

        const { data, error } = await supabase
          .from("messages")
          .insert(messageInsertData)
          .select("*")
          .single();

        if (error) {
          console.error("❌ Error sending message:", error);
          console.error("❌ Error details:", {
            code: error.code,
            message: error.message,
            hint: error.hint,
            details: error.details,
          });
          Alert.alert(
            "Error",
            `Failed to send message: ${error.message || "Unknown error"}`
          );
          setNewMessage(messageContent);
          setSelectedMedia(mediaData);
          setSending(false);
          return;
        }

        console.log("✅ Message sent successfully:", data.id);

        // Reload messages to ensure UI updates
        setTimeout(() => {
          loadMessages();
        }, 300);
      } else if (chatType === "group" && communityId) {
        const groupMessageInsertData = {
          community_id: communityId,
          author_id: user.id,
          content: messageContent || "",
          message_type: mediaData ? mediaData.type : "text",
        };

        if (mediaData) {
          groupMessageInsertData.media_url = mediaData.url;
          groupMessageInsertData.media_filename = mediaData.filename;
          groupMessageInsertData.media_size = mediaData.size;
          groupMessageInsertData.media_mime_type = mediaData.mimeType;
          groupMessageInsertData.thumbnail_url = mediaData.thumbnailUrl;
          groupMessageInsertData.file_extension = mediaData.extension;
        }

        const { data, error } = await supabase
          .from("community_posts")
          .insert(groupMessageInsertData)
          .select("*")
          .single();

        if (error) {
          console.error("❌ Error sending group message:", error);
          console.error("❌ Error details:", {
            code: error.code,
            message: error.message,
            hint: error.hint,
            details: error.details,
          });
          Alert.alert(
            "Error",
            `Failed to send message: ${error.message || "Unknown error"}`
          );
          setNewMessage(messageContent);
          setSelectedMedia(mediaData);
          setSending(false);
          return;
        }

        console.log("✅ Group message sent:", data.id);

        // Reload messages to ensure UI updates
        setTimeout(() => {
          loadMessages();
        }, 300);
      }
    } catch (error) {
      console.error("❌ Error in sendMessage:", error);
      console.error("❌ Error stack:", error.stack);
      Alert.alert(
        "Error",
        `Failed to send message: ${error.message || "Unknown error"}`
      );
      setNewMessage(messageContent);
      setSelectedMedia(mediaData);
    } finally {
      setSending(false);
    }
  }, [
    newMessage,
    sending,
    chatType,
    djId,
    communityId,
    user?.id,
    isConnected,
    threadId,
    selectedMedia,
    loadMessages,
  ]);

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return "now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="hsl(75, 100%, 60%)" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
          </TouchableOpacity>

          {chatType === "individual" && otherUser && (
            <View style={styles.headerInfo}>
              <ProgressiveImage
                source={
                  otherUser.profile_image_url
                    ? { uri: otherUser.profile_image_url }
                    : require("../assets/rhood_logo.webp")
                }
                style={styles.headerAvatar}
                placeholderStyle={styles.headerAvatarPlaceholder}
              />
              <View style={styles.headerText}>
                <Text style={styles.headerName}>
                  {otherUser.dj_name || otherUser.full_name || "Unknown User"}
                </Text>
                <Text style={styles.headerLocation}>
                  {otherUser.location ||
                    otherUser.city ||
                    otherUser.country ||
                    "Unknown Location"}
                </Text>
              </View>
            </View>
          )}

          {chatType === "group" && communityData && (
            <View style={styles.headerInfo}>
              <ProgressiveImage
                source={
                  communityData.image_url
                    ? { uri: communityData.image_url }
                    : require("../assets/rhood_logo.webp")
                }
                style={styles.headerAvatar}
                placeholderStyle={styles.headerAvatarPlaceholder}
              />
              <View style={styles.headerText}>
                <Text style={styles.headerName}>{communityData.name}</Text>
                <Text style={styles.headerLocation}>
                  {memberCount} member{memberCount !== 1 ? "s" : ""}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          onContentSizeChange={() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Image
                source={require("../assets/rhood_logo.webp")}
                style={styles.emptyIcon}
                resizeMode="contain"
              />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtitle}>
                Start the conversation by sending a message!
              </Text>
            </View>
          ) : (
            messages.map((message) => (
              <View
                key={message.id}
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
                <View
                  style={[
                    styles.messageBubble,
                    message.isOwn ? styles.ownBubble : styles.otherBubble,
                  ]}
                >
                  {message.messageType !== "text" && message.mediaUrl ? (
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
                        <View style={styles.messageVideo}>
                          <Image
                            source={{
                              uri: message.thumbnailUrl || message.mediaUrl,
                            }}
                            style={styles.messageVideoThumbnail}
                            resizeMode="cover"
                          />
                          <View style={styles.videoPlayOverlay}>
                            <Ionicons
                              name="play"
                              size={32}
                              color="hsl(0, 0%, 100%)"
                            />
                          </View>
                        </View>
                      )}
                      {message.messageType === "audio" && (
                        <View style={styles.messageFile}>
                          <Ionicons
                            name="musical-notes"
                            size={24}
                            color="hsl(75, 100%, 60%)"
                          />
                          <View style={styles.fileInfo}>
                            <Text style={styles.fileName}>
                              {message.mediaFilename || "Audio"}
                            </Text>
                            <Text style={styles.fileSize}>
                              {message.mediaSize
                                ? multimediaService.formatFileSize(
                                    message.mediaSize
                                  )
                                : message.mediaMimeType || ""}
                            </Text>
                          </View>
                        </View>
                      )}
                      {message.messageType !== "image" &&
                        message.messageType !== "video" &&
                        message.messageType !== "audio" &&
                        message.mediaUrl && (
                          <View style={styles.messageFile}>
                            <Ionicons
                              name={multimediaService.getFileIcon(
                                message.fileExtension
                              )}
                              size={24}
                              color="hsl(75, 100%, 60%)"
                            />
                            <View style={styles.fileInfo}>
                              <Text style={styles.fileName}>
                                {message.mediaFilename || "Attachment"}
                              </Text>
                              <Text style={styles.fileSize}>
                                {message.mediaSize
                                  ? multimediaService.formatFileSize(
                                      message.mediaSize
                                    )
                                  : message.mediaMimeType || ""}
                              </Text>
                            </View>
                          </View>
                        )}
                    </View>
                  ) : null}
                  {!!message.content && message.content.trim() && (
                    <Text
                      style={[
                        styles.messageText,
                        message.isOwn
                          ? styles.ownMessageText
                          : styles.otherMessageText,
                      ]}
                    >
                      {message.content}
                    </Text>
                  )}
                  <Text
                    style={[
                      styles.messageTime,
                      message.isOwn
                        ? styles.ownMessageTime
                        : styles.otherMessageTime,
                    ]}
                  >
                    {formatTime(message.timestamp)}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        {selectedMedia && (
          <View style={styles.mediaPreviewContainer}>
            <View style={styles.mediaPreview}>
              {selectedMedia.type === "image" && (
                <Image
                  source={{ uri: selectedMedia.url }}
                  style={styles.mediaPreviewImage}
                  resizeMode="cover"
                />
              )}
              {selectedMedia.type === "video" && (
                <View style={styles.mediaPreviewVideo}>
                  <Ionicons
                    name="videocam"
                    size={24}
                    color="hsl(75, 100%, 60%)"
                  />
                  <Text style={styles.mediaPreviewText}>Video</Text>
                </View>
              )}
              {(selectedMedia.type === "file" ||
                selectedMedia.type === "audio") && (
                <View style={styles.mediaPreviewFile}>
                  <Ionicons
                    name={
                      selectedMedia.type === "audio"
                        ? "musical-notes"
                        : multimediaService.getFileIcon(selectedMedia.extension)
                    }
                    size={24}
                    color="hsl(75, 100%, 60%)"
                  />
                  <View>
                    <Text style={styles.mediaPreviewText}>
                      {selectedMedia.filename || "Attachment"}
                    </Text>
                    {selectedMedia.size ? (
                      <Text style={styles.mediaPreviewMeta}>
                        {multimediaService.formatFileSize(selectedMedia.size)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={clearSelectedMedia}
              style={styles.removeMediaButton}
            >
              <Ionicons name="close" size={20} color="hsl(0, 0%, 100%)" />
            </TouchableOpacity>
          </View>
        )}

        {showMediaPicker && (
          <View style={styles.mediaPickerOverlay}>
            <View style={styles.mediaPickerContainer}>
              <Text style={styles.mediaPickerTitle}>Choose Media Type</Text>
              <View style={styles.mediaPickerButtons}>
                <TouchableOpacity
                  style={styles.mediaPickerButton}
                  onPress={handleImageUpload}
                  disabled={uploadingMedia}
                >
                  <Ionicons name="image" size={24} color="hsl(75, 100%, 60%)" />
                  <Text style={styles.mediaPickerButtonText}>Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.mediaPickerButton}
                  onPress={handleVideoUpload}
                  disabled={uploadingMedia}
                >
                  <Ionicons
                    name="videocam"
                    size={24}
                    color="hsl(75, 100%, 60%)"
                  />
                  <Text style={styles.mediaPickerButtonText}>Video</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.mediaPickerButton}
                  onPress={handleAudioUpload}
                  disabled={uploadingMedia}
                >
                  <Ionicons
                    name="musical-notes"
                    size={24}
                    color="hsl(75, 100%, 60%)"
                  />
                  <Text style={styles.mediaPickerButtonText}>Audio</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.mediaPickerButton}
                  onPress={handleDocumentUpload}
                  disabled={uploadingMedia}
                >
                  <Ionicons
                    name="document"
                    size={24}
                    color="hsl(75, 100%, 60%)"
                  />
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
                onPress={() => setShowMediaPicker(false)}
                disabled={uploadingMedia}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Fullscreen Image Modal */}
        <Modal
          visible={!!fullscreenImage}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setFullscreenImage(null)}
        >
          <TouchableOpacity
            style={styles.fullscreenImageContainer}
            activeOpacity={1}
            onPress={() => setFullscreenImage(null)}
          >
            <TouchableOpacity
              style={styles.fullscreenImageCloseButton}
              onPress={() => setFullscreenImage(null)}
            >
              <Ionicons name="close" size={32} color="hsl(0, 0%, 100%)" />
            </TouchableOpacity>
            {fullscreenImage && (
              <Image
                source={{ uri: fullscreenImage }}
                style={styles.fullscreenImage}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        </Modal>

        {/* Input */}
        {chatType === "individual" && !isConnected ? (
          <View style={styles.inputContainer}>
            <View style={styles.connectionRequiredContainer}>
              <Text style={styles.connectionRequiredText}>
                {connectionStatus === "pending"
                  ? "Connection request pending..."
                  : "Connect to start messaging"}
              </Text>
              <TouchableOpacity
                style={styles.connectButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.connectButtonText}>
                  {connectionStatus === "pending"
                    ? "View Status"
                    : "Send Request"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TouchableOpacity
                style={styles.attachButton}
                onPress={() => setShowMediaPicker(true)}
                disabled={uploadingMedia}
              >
                {uploadingMedia ? (
                  <ActivityIndicator size="small" color="hsl(75, 100%, 60%)" />
                ) : (
                  <Ionicons name="add" size={24} color="hsl(75, 100%, 60%)" />
                )}
              </TouchableOpacity>
              <TextInput
                style={styles.messageInput}
                placeholder="Type a message..."
                placeholderTextColor="hsl(0, 0%, 50%)"
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
                maxLength={500}
                onSubmitEditing={sendMessage}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  ((!newMessage.trim() && !selectedMedia) || sending) &&
                    styles.sendButtonDisabled,
                ]}
                onPress={sendMessage}
                disabled={(!newMessage.trim() && !selectedMedia) || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="hsl(0, 0%, 0%)" />
                ) : (
                  <Ionicons name="send" size={20} color="hsl(0, 0%, 0%)" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  loadingText: {
    color: "hsl(0, 0%, 100%)",
    fontSize: 16,
    marginTop: 16,
    fontFamily: "Helvetica Neue",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderBottomWidth: 1,
    borderBottomColor: "hsl(75, 100%, 60%)",
  },
  backButton: {
    marginRight: 16,
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  headerAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "hsl(0, 0%, 20%)",
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    color: "hsl(75, 100%, 60%)",
    fontSize: 16,
    fontWeight: "700",
    fontFamily: "TS Block Bold",
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  headerLocation: {
    color: "hsl(0, 0%, 60%)",
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    marginBottom: 24,
    opacity: 0.8,
  },
  emptyTitle: {
    color: "hsl(75, 100%, 60%)",
    fontSize: 24,
    fontWeight: "700",
    fontFamily: "TS Block Bold",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  emptySubtitle: {
    color: "hsl(0, 0%, 60%)",
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 280,
  },
  messageContainer: {
    marginBottom: 16,
  },
  ownMessage: {
    alignItems: "flex-end",
  },
  otherMessage: {
    alignItems: "flex-start",
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  messageAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  messageAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "hsl(0, 0%, 20%)",
  },
  senderName: {
    color: "hsl(75, 100%, 60%)",
    fontSize: 12,
    fontWeight: "600",
    fontFamily: "TS Block Bold",
    letterSpacing: 0.3,
  },
  messageBubble: {
    maxWidth: "80%",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  ownBubble: {
    backgroundColor: "hsl(75, 100%, 60%)",
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: "hsl(0, 0%, 12%)",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
  },
  ownMessageText: {
    color: "hsl(0, 0%, 0%)",
  },
  otherMessageText: {
    color: "hsl(0, 0%, 100%)",
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: "Helvetica Neue",
  },
  ownMessageTime: {
    color: "hsl(0, 0%, 0%)",
    opacity: 0.7,
  },
  otherMessageTime: {
    color: "hsl(0, 0%, 60%)",
  },
  inputContainer: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderTopWidth: 2,
    borderTopColor: "hsl(75, 100%, 60%)",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageInput: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: "hsl(0, 0%, 100%)",
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    maxHeight: 100,
    marginRight: 12,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%)",
  },
  sendButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "hsl(75, 100%, 60%)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: "hsl(0, 0%, 30%)",
    shadowColor: "hsl(0, 0%, 0%)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  connectionRequiredContainer: {
    padding: 20,
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 8%)",
  },
  connectionRequiredText: {
    color: "hsl(0, 0%, 60%)",
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    textAlign: "center",
    marginBottom: 16,
  },
  connectButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
    shadowColor: "hsl(75, 100%, 60%)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  connectButtonText: {
    color: "hsl(0, 0%, 0%)",
    fontSize: 16,
    fontFamily: "TS Block Bold",
    fontWeight: "600",
  },
  attachButton: {
    backgroundColor: "hsl(0, 0%, 8%)",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%)",
  },
  mediaPreviewContainer: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderTopWidth: 1,
    borderTopColor: "hsl(0, 0%, 20%)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  mediaPreview: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  mediaPreviewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  mediaPreviewVideo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 15%)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  mediaPreviewFile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 15%)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 12,
    maxWidth: 220,
  },
  mediaPreviewText: {
    color: "hsl(0, 0%, 100%)",
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    marginLeft: 8,
  },
  mediaPreviewMeta: {
    color: "hsl(0, 0%, 60%)",
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    marginLeft: 8,
  },
  removeMediaButton: {
    backgroundColor: "hsl(0, 0%, 30%)",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  mediaPickerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  mediaPickerContainer: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 32,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%)",
    width: "80%",
    maxWidth: 360,
  },
  mediaPickerTitle: {
    color: "hsl(0, 0%, 100%)",
    fontSize: 18,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 24,
  },
  mediaPickerButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  mediaPickerButton: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: "hsl(0, 0%, 15%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 25%)",
    minWidth: 90,
  },
  mediaPickerButtonText: {
    color: "hsl(0, 0%, 100%)",
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    marginTop: 8,
    textAlign: "center",
  },
  mediaPickerSpinner: {
    marginBottom: 16,
  },
  cancelButton: {
    backgroundColor: "hsl(0, 0%, 20%)",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "hsl(0, 0%, 100%)",
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
  },
  mediaContent: {
    marginBottom: 8,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
  },
  messageVideo: {
    position: "relative",
    width: 200,
    height: 150,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 4,
  },
  messageVideoThumbnail: {
    width: "100%",
    height: "100%",
  },
  videoPlayOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  messageFile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 15%)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 4,
    maxWidth: 250,
  },
  fileInfo: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    color: "hsl(0, 0%, 100%)",
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
  },
  fileSize: {
    color: "hsl(0, 0%, 60%)",
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    marginTop: 2,
  },
  fullscreenImageContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenImage: {
    width: "100%",
    height: "100%",
  },
  fullscreenImageCloseButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default MessagesScreen;
