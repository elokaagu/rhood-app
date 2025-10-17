import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase, db } from "../lib/supabase";
import ProgressiveImage from "./ProgressiveImage";
// Dynamic import for multimedia service to avoid native module loading issues

const MessagesScreen = ({ user, navigation, route }) => {
  const { params } = route || {};
  const { djId, communityId, chatType = "individual" } = params || {};

  // State management
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  const [communityData, setCommunityData] = useState(null);
  const [memberCount, setMemberCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  // Multimedia state
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);

  // Refs
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Load initial data
  useEffect(() => {
    console.log("MessagesScreen useEffect triggered:", {
      chatType,
      djId,
      communityId,
      userId: user?.id,
    });
    if (chatType === "individual" && djId) {
      console.log("Loading individual chat for DJ:", djId);
      loadIndividualChat();
    } else if (chatType === "group" && communityId) {
      console.log("Loading group chat for community:", communityId);
      loadGroupChat();
    } else {
      console.log("No valid chat parameters, setting loading to false");
      setLoading(false);
    }
  }, [djId, communityId, chatType]);

  // Fade in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  // Load individual chat data
  const loadIndividualChat = async () => {
    try {
      setLoading(true);

      // Validate inputs
      if (!user?.id || !djId) {
        console.error("Missing user ID or DJ ID for individual chat");
        setLoading(false);
        return;
      }

      // Load other user's profile
      const otherUserProfile = await db.getUserProfilePublic(djId);
      if (otherUserProfile) {
        setOtherUser(otherUserProfile);
      }

      // Check connection status
      await checkConnectionStatus();

      // Load messages
      await loadMessages();
    } catch (error) {
      console.error("Error loading individual chat:", error);
      Alert.alert("Error", "Failed to load chat. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Check connection status for individual chats
  const checkConnectionStatus = async () => {
    if (chatType !== "individual" || !user?.id || !djId) return;

    try {
      console.log("Checking connection status between:", user.id, "and", djId);

      const connections = await db.getUserConnections(user.id);
      console.log("All connections:", connections);

      const connection = connections.find(
        (conn) => conn.connected_user_id === djId
      );

      if (connection) {
        setConnectionStatus(connection.connection_status);
        setIsConnected(connection.connection_status === "accepted");
        console.log("Connection found:", connection.connection_status);
      } else {
        setConnectionStatus(null);
        setIsConnected(false);
        console.log("No connection found");
      }
    } catch (error) {
      console.error("Error checking connection status:", error);
      setConnectionStatus(null);
      setIsConnected(false);
    }
  };

  // Load group chat data
  const loadGroupChat = async () => {
    try {
      console.log("loadGroupChat started for community:", communityId);
      setLoading(true);

      // Load community data
      const { data: community, error: communityError } = await supabase
        .from("communities")
        .select("*")
        .eq("id", communityId)
        .single();

      if (communityError) {
        console.warn("Error loading community:", communityError);
      } else {
        console.log("Community loaded:", community);
        setCommunityData(community);
      }

      // Load member count
      const { count: memberCount, error: countError } = await supabase
        .from("community_members")
        .select("*", { count: "exact", head: true })
        .eq("community_id", communityId);

      if (!countError && memberCount !== null) {
        console.log("Member count loaded:", memberCount);
        setMemberCount(memberCount);
      }

      // Load messages
      console.log("Loading messages...");
      await loadMessages();
      console.log("Messages loaded successfully");
    } catch (error) {
      console.error("Error loading group chat:", error);
      Alert.alert("Error", "Failed to load group chat");
    } finally {
      console.log("Setting loading to false");
      setLoading(false);
    }
  };

  // Load messages for current chat
  const loadMessages = async () => {
    try {
      console.log("loadMessages started:", { chatType, djId, communityId });
      let messagesData = [];

      if (chatType === "individual") {
        // Get or create message thread
        const threadId = await db.findOrCreateIndividualMessageThread(
          user.id,
          djId
        );

        // Load individual messages
        messagesData = await db.getMessages(threadId);
      } else if (chatType === "group") {
        // Load group messages
        console.log(
          "Calling db.getGroupMessages with communityId:",
          communityId
        );
        messagesData = await db.getGroupMessages(communityId);
        console.log(
          "getGroupMessages returned:",
          messagesData?.length || 0,
          "messages"
        );
      }

      // Transform messages for display
      const transformedMessages = messagesData.map((msg) => ({
        id: msg.id,
        content: msg.content || msg.message || "",
        senderId: msg.sender_id || msg.author_id,
        senderName:
          msg.sender?.full_name ||
          msg.sender?.dj_name ||
          msg.author?.full_name ||
          msg.author?.dj_name ||
          "Unknown",
        senderImage:
          msg.sender?.profile_image_url || msg.author?.profile_image_url,
        timestamp: msg.created_at,
        isOwn: (msg.sender_id || msg.author_id) === user.id,
      }));

      console.log("Transformed messages:", transformedMessages?.length || 0);
      setMessages(transformedMessages);
    } catch (error) {
      console.error("Error loading messages:", error);
      console.error("Error details:", {
        chatType,
        userId: user?.id,
        djId,
        communityId,
        error: error.message,
      });
      setMessages([]);
      // Don't throw error - just show empty state
    }
  };

  // Multimedia upload functions
  const handleImageUpload = async () => {
    try {
      setUploadingMedia(true);
      const { multimediaService } = await import("../lib/multimediaService");
      const mediaData = await multimediaService.uploadImage();
      if (mediaData) {
        setSelectedMedia(mediaData);
        setShowMediaPicker(false);
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert("Upload Error", "Failed to upload image. Please try again.");
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleVideoUpload = async () => {
    try {
      setUploadingMedia(true);
      const { multimediaService } = await import("../lib/multimediaService");
      const mediaData = await multimediaService.uploadVideo();
      if (mediaData) {
        setSelectedMedia(mediaData);
        setShowMediaPicker(false);
      }
    } catch (error) {
      console.error("Error uploading video:", error);
      Alert.alert("Upload Error", "Failed to upload video. Please try again.");
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleDocumentUpload = async () => {
    try {
      setUploadingMedia(true);
      const { multimediaService } = await import("../lib/multimediaService");
      const mediaData = await multimediaService.uploadDocument();
      if (mediaData) {
        setSelectedMedia(mediaData);
        setShowMediaPicker(false);
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      Alert.alert(
        "Upload Error",
        "Failed to upload document. Please try again."
      );
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleAudioUpload = async () => {
    try {
      setUploadingMedia(true);
      const { multimediaService } = await import("../lib/multimediaService");
      const mediaData = await multimediaService.uploadAudio();
      if (mediaData) {
        setSelectedMedia(mediaData);
        setShowMediaPicker(false);
      }
    } catch (error) {
      console.error("Error uploading audio:", error);
      Alert.alert("Upload Error", "Failed to upload audio. Please try again.");
    } finally {
      setUploadingMedia(false);
    }
  };

  const clearSelectedMedia = () => {
    setSelectedMedia(null);
  };

  // Helper function to get file icon
  const getFileIcon = (extension) => {
    const iconMap = {
      pdf: "document-text",
      doc: "document-text",
      docx: "document-text",
      txt: "document-text",
      xls: "document-text",
      xlsx: "document-text",
      ppt: "document-text",
      pptx: "document-text",
      zip: "archive",
      rar: "archive",
      "7z": "archive",
      mp3: "musical-notes",
      wav: "musical-notes",
      aac: "musical-notes",
      flac: "musical-notes",
      mp4: "videocam",
      mov: "videocam",
      avi: "videocam",
      mkv: "videocam",
      jpg: "image",
      jpeg: "image",
      png: "image",
      gif: "image",
      webp: "image",
    };
    return iconMap[extension?.toLowerCase()] || "document";
  };

  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Send a new message
  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedMedia) || sending) return;

    // Check connection status for individual chats
    if (chatType === "individual" && !isConnected) {
      Alert.alert(
        "Connection Required",
        "You must be connected to this user before sending messages. Send a connection request first.",
        [
          { text: "OK", style: "default" },
          {
            text: "Send Request",
            style: "default",
            onPress: () => {
              // Navigate back to connections screen to send request
              navigation.goBack();
            },
          },
        ]
      );
      return;
    }

    const messageContent = newMessage.trim();
    const mediaData = selectedMedia;

    setNewMessage("");
    setSelectedMedia(null);
    setSending(true);

    try {
      console.log("📤 Sending message:", {
        chatType,
        userId: user?.id,
        djId,
        communityId,
        content: messageContent,
        mediaData,
      });

      if (chatType === "individual") {
        // Validate required data
        if (!user?.id || !djId) {
          throw new Error("Missing user ID or DJ ID for individual chat");
        }

        // Get or create message thread
        const threadId = await db.findOrCreateIndividualMessageThread(
          user.id,
          djId
        );

        console.log("🧵 Using thread ID:", threadId);

        // Prepare message data
        const messageInsertData = {
          thread_id: threadId,
          sender_id: user.id,
          content:
            messageContent || (mediaData ? `${mediaData.type} message` : ""),
          message_type: mediaData ? mediaData.type : "text",
        };

        // Add multimedia fields if media is present
        if (mediaData) {
          messageInsertData.media_url = mediaData.url;
          messageInsertData.media_filename = mediaData.filename;
          messageInsertData.media_size = mediaData.size;
          messageInsertData.media_mime_type = mediaData.mimeType;
          messageInsertData.thumbnail_url = mediaData.thumbnailUrl;
          messageInsertData.file_extension = mediaData.extension;
        }

        // Send individual message
        const { data: messageData, error } = await supabase
          .from("messages")
          .insert(messageInsertData)
          .select("*")
          .single();

        if (error) {
          console.error("❌ Error sending individual message:", error);
          throw error;
        }

        console.log("✅ Individual message sent:", messageData);
      } else if (chatType === "group") {
        // Validate required data
        if (!user?.id || !communityId) {
          throw new Error("Missing user ID or community ID for group chat");
        }

        // Prepare group message data
        const groupMessageInsertData = {
          community_id: communityId,
          author_id: user.id,
          content:
            messageContent || (mediaData ? `${mediaData.type} message` : ""),
          message_type: mediaData ? mediaData.type : "text",
        };

        // Add multimedia fields if media is present
        if (mediaData) {
          groupMessageInsertData.media_url = mediaData.url;
          groupMessageInsertData.media_filename = mediaData.filename;
          groupMessageInsertData.media_size = mediaData.size;
          groupMessageInsertData.media_mime_type = mediaData.mimeType;
          groupMessageInsertData.thumbnail_url = mediaData.thumbnailUrl;
          groupMessageInsertData.file_extension = mediaData.extension;
        }

        // Send group message
        const { data: messageData, error } = await supabase
          .from("community_posts")
          .insert(groupMessageInsertData)
          .select("*")
          .single();

        if (error) {
          console.error("❌ Error sending group message:", error);
          throw error;
        }

        console.log("✅ Group message sent:", messageData);
      }

      // Reload messages to show the new one
      await loadMessages();

      // Scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);

      console.log("🎉 Message sent successfully!");
    } catch (error) {
      console.error("❌ Error sending message:", error);

      // Show user-friendly error message
      let errorMessage = "Failed to send message. Please try again.";

      if (error.message.includes("row-level security")) {
        errorMessage = "Database permissions issue. Please contact support.";
      } else if (error.message.includes("Missing")) {
        errorMessage =
          "Missing required information. Please refresh and try again.";
      }

      Alert.alert("Error", errorMessage);

      // Restore message content
      setNewMessage(messageContent);
    } finally {
      setSending(false);
    }
  };

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

  // Render individual message
  const renderMessage = (message) => (
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
        {/* Render multimedia content */}
        {message.message_type &&
          message.message_type !== "text" &&
          message.media_url && (
            <View style={styles.mediaContent}>
              {message.message_type === "image" && (
                <Image
                  source={{ uri: message.media_url }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
              )}
              {message.message_type === "video" && (
                <View style={styles.messageVideo}>
                  <Image
                    source={{ uri: message.thumbnail_url || message.media_url }}
                    style={styles.messageVideoThumbnail}
                    resizeMode="cover"
                  />
                  <View style={styles.videoPlayOverlay}>
                    <Ionicons name="play" size={32} color="hsl(0, 0%, 100%)" />
                  </View>
                </View>
              )}
              {(message.message_type === "file" ||
                message.message_type === "audio") && (
                <View style={styles.messageFile}>
                   <Ionicons
                     name={getFileIcon(message.file_extension)}
                     size={24}
                     color="hsl(75, 100%, 60%)"
                   />
                   <View style={styles.fileInfo}>
                     <Text style={styles.fileName}>
                       {message.media_filename}
                     </Text>
                     <Text style={styles.fileSize}>
                       {formatFileSize(message.media_size)}
                     </Text>
                   </View>
                </View>
              )}
            </View>
          )}

        {/* Render text content */}
        {message.content && (
            <Text
              style={[
                styles.messageText,
              message.isOwn ? styles.ownMessageText : styles.otherMessageText,
              ]}
            >
              {message.content}
            </Text>
        )}

              <Text
                style={[
                  styles.messageTime,
            message.isOwn ? styles.ownMessageTime : styles.otherMessageTime,
                ]}
              >
          {formatTime(message.timestamp)}
              </Text>
            </View>
        </View>
  );

  // Render loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="hsl(75, 100%, 60%)" />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  // Render empty state
  if (messages.length === 0) {
    return (
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
                source={{ uri: otherUser.profile_image_url }}
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

        {/* Empty State */}
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

        {/* Message Input */}
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.inputContainer}
        >
          {chatType === "individual" && !isConnected ? (
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
          ) : (
            <View style={styles.inputWrapper}>
          <TextInput
                style={styles.messageInput}
                placeholder="Type a message..."
            placeholderTextColor="hsl(0, 0%, 50%)"
                value={newMessage}
                onChangeText={setNewMessage}
            multiline
                maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
                  (!newMessage.trim() || sending) && styles.sendButtonDisabled,
                ]}
                onPress={sendMessage}
                disabled={!newMessage.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="hsl(0, 0%, 0%)" />
                ) : (
                  <Ionicons name="send" size={20} color="hsl(0, 0%, 0%)" />
                )}
          </TouchableOpacity>
        </View>
          )}
        </KeyboardAvoidingView>
      </Animated.View>
    );
  }

  // Render main chat interface
  return (
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
              source={{ uri: otherUser.profile_image_url }}
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
        showsVerticalScrollIndicator={false}
      >
        {messages.map(renderMessage)}
      </ScrollView>

      {/* Selected Media Preview */}
      {selectedMedia && (
        <View style={styles.mediaPreviewContainer}>
          <View style={styles.mediaPreview}>
            {selectedMedia.type === "image" && (
              <Image
                source={{ uri: selectedMedia.url }}
                style={styles.mediaPreviewImage}
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
                   name={getFileIcon(selectedMedia.extension)}
                   size={24}
                   color="hsl(75, 100%, 60%)"
                 />
                 <Text style={styles.mediaPreviewText}>
                   {selectedMedia.filename}
                 </Text>
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

      {/* Media Picker Modal */}
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
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowMediaPicker(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
        </View>
      </View>
      )}

      {/* Message Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inputContainer}
      >
        <View style={styles.inputWrapper}>
          <TouchableOpacity
            style={styles.attachButton}
            onPress={() => setShowMediaPicker(true)}
            disabled={uploadingMedia}
          >
            <Ionicons name="add" size={24} color="hsl(75, 100%, 60%)" />
          </TouchableOpacity>
          <TextInput
            style={styles.messageInput}
            placeholder="Type a message..."
            placeholderTextColor="hsl(0, 0%, 50%)"
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={500}
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
      </KeyboardAvoidingView>
    </Animated.View>
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

  // Multimedia styles
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
    maxWidth: 200,
  },
  mediaPreviewText: {
    color: "hsl(0, 0%, 100%)",
    fontSize: 14,
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
    minWidth: 80,
  },
  mediaPickerButtonText: {
    color: "hsl(0, 0%, 100%)",
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    marginTop: 8,
    textAlign: "center",
  },
  cancelButton: {
    backgroundColor: "hsl(0, 0%, 20%)",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "hsl(0, 0%, 100%)",
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
  },

  // Message multimedia styles
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
});

export default MessagesScreen;
