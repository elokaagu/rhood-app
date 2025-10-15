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

  // Refs
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Load initial data
  useEffect(() => {
    console.log("MessagesScreen useEffect triggered:", { chatType, djId, communityId, userId: user?.id });
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
        console.log("Calling db.getGroupMessages with communityId:", communityId);
        messagesData = await db.getGroupMessages(communityId);
        console.log("getGroupMessages returned:", messagesData?.length || 0, "messages");
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

  // Send a new message
  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

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
    setNewMessage("");
    setSending(true);

    try {
      console.log("📤 Sending message:", {
        chatType,
        userId: user?.id,
        djId,
        communityId,
        content: messageContent,
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

        // Send individual message
        const { data: messageData, error } = await supabase
          .from("messages")
          .insert({
            thread_id: threadId,
            sender_id: user.id,
            content: messageContent,
          })
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

        // Send group message
        const { data: messageData, error } = await supabase
          .from("community_posts")
          .insert({
            community_id: communityId,
            author_id: user.id,
            content: messageContent,
          })
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
        <Text
          style={[
            styles.messageText,
            message.isOwn ? styles.ownMessageText : styles.otherMessageText,
          ]}
        >
          {message.content}
        </Text>
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

      {/* Message Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.inputContainer}
      >
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
});

export default MessagesScreen;
