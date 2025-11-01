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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase, db } from "../lib/supabase";
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
          messageType: msg.message_type || "text",
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
          messageType: msg.message_type || "text",
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
              messageType: payload.new.message_type || "text",
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
              messageType: payload.new.message_type || "text",
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

  // Send message
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || sending) {
      console.log("⚠️ Cannot send:", {
        hasMessage: !!newMessage.trim(),
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
    console.log("📤 Sending message:", {
      content: messageContent,
      chatType,
      djId,
      communityId,
      userId: user.id,
      isConnected,
      threadId,
    });

    setNewMessage("");
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
        const { data, error } = await supabase
          .from("messages")
          .insert({
            thread_id: currentThreadId,
            sender_id: user.id,
            content: messageContent,
            message_type: "text",
          })
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
          setSending(false);
          return;
        }

        console.log("✅ Message sent successfully:", data.id);

        // Reload messages to ensure UI updates
        setTimeout(() => {
          loadMessages();
        }, 300);
      } else if (chatType === "group" && communityId) {
        const { data, error } = await supabase
          .from("community_posts")
          .insert({
            community_id: communityId,
            author_id: user.id,
            content: messageContent,
            message_type: "text",
          })
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
});

export default MessagesScreen;
