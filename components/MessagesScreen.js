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
  Keyboard,
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
  const [isConnected, setIsConnected] = useState(false);
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
          senderName:
            msg.sender?.dj_name ||
            msg.sender?.full_name ||
            "Unknown",
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
      } else if (chatType === "group" && communityId) {
        // Load group chat messages
        const groupMessages = await db.getGroupMessages(communityId);
        const transformedMessages = (groupMessages || []).map((msg) => ({
          id: msg.id,
          content: msg.content || "",
          senderId: msg.author_id,
          senderName:
            msg.author?.dj_name ||
            msg.author?.full_name ||
            "Unknown",
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
                senderProfile?.dj_name ||
                senderProfile?.full_name ||
                "Unknown",
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
                senderProfile?.dj_name ||
                senderProfile?.full_name ||
                "Unknown",
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
      console.log("⚠️ Cannot send:", { hasMessage: !!newMessage.trim(), sending });
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
      threadId 
    });

    setNewMessage("");
    setSending(true);

    try {
      if (chatType === "individual" && djId) {
        // Get thread ID (should already be set, but ensure it exists)
        let currentThreadId = threadId;
        
        if (!currentThreadId) {
          console.log("🔍 Thread ID not set, fetching...");
          currentThreadId = await db.findOrCreateIndividualMessageThread(user.id, djId);
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
    if (diff < 3600000)
      return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000)
      return `${Math.floor(diff / 3600000)}h ago`;
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
                source={{ uri: otherUser.profile_image_url }}
                style={styles.headerAvatar}
                placeholderStyle={styles.headerAvatarPlaceholder}
              />
              <View style={styles.headerText}>
                <Text style={styles.headerName}>
                  {otherUser.dj_name || otherUser.full_name || "Unknown"}
                </Text>
                <Text style={styles.headerLocation}>
                  {otherUser.city || otherUser.location || "Location not set"}
                </Text>
              </View>
            </View>
          )}

          {chatType === "group" && communityData && (
            <View style={styles.headerInfo}>
              <View style={styles.headerText}>
                <Text style={styles.headerName}>{communityData.name}</Text>
                <Text style={styles.headerLocation}>Group Chat</Text>
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
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="chatbubbles-outline"
                size={64}
                color="hsl(0, 0%, 30%)"
              />
              <Text style={styles.emptyStateText}>NO MESSAGES YET</Text>
              <Text style={styles.emptyStateSubtext}>
                Start the conversation by sending a message!
              </Text>
            </View>
          ) : (
            messages.map((message) => (
              <View
                key={message.id}
                style={[
                  styles.messageContainer,
                  message.isOwn && styles.messageContainerOwn,
                ]}
              >
                {!message.isOwn && (
                  <ProgressiveImage
                    source={{ uri: message.senderImage }}
                    style={styles.messageAvatar}
                    placeholderStyle={styles.messageAvatarPlaceholder}
                  />
                )}
                <View
                  style={[
                    styles.messageBubble,
                    message.isOwn && styles.messageBubbleOwn,
                  ]}
                >
                  {!message.isOwn && (
                    <Text style={styles.messageSenderName}>
                      {message.senderName}
                    </Text>
                  )}
                  <Text
                    style={[
                      styles.messageText,
                      message.isOwn && styles.messageTextOwn,
                    ]}
                  >
                    {message.content}
                  </Text>
                  <Text
                    style={[
                      styles.messageTime,
                      message.isOwn && styles.messageTimeOwn,
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
                Connect to start messaging
              </Text>
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
    backgroundColor: "hsl(0, 0%, 8%)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "hsl(0, 0%, 12%)",
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 20%)",
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  headerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "hsl(0, 0%, 20%)",
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "hsl(75, 100%, 60%)",
  },
  headerLocation: {
    fontSize: 12,
    color: "hsl(0, 0%, 60%)",
    marginTop: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "hsl(0, 0%, 60%)",
    marginTop: 16,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: "600",
    color: "hsl(75, 100%, 60%)",
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "hsl(0, 0%, 50%)",
    marginTop: 8,
    textAlign: "center",
  },
  messageContainer: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-end",
  },
  messageContainerOwn: {
    flexDirection: "row-reverse",
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginHorizontal: 8,
  },
  messageAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "hsl(0, 0%, 20%)",
  },
  messageBubble: {
    maxWidth: "70%",
    backgroundColor: "hsl(0, 0%, 15%)",
    borderRadius: 16,
    padding: 12,
  },
  messageBubbleOwn: {
    backgroundColor: "hsl(75, 100%, 60%)",
  },
  messageSenderName: {
    fontSize: 12,
    fontWeight: "600",
    color: "hsl(75, 100%, 60%)",
    marginBottom: 4,
  },
  messageText: {
    fontSize: 15,
    color: "hsl(0, 0%, 90%)",
    lineHeight: 20,
  },
  messageTextOwn: {
    color: "hsl(0, 0%, 0%)",
  },
  messageTime: {
    fontSize: 10,
    color: "hsl(0, 0%, 50%)",
    marginTop: 4,
  },
  messageTimeOwn: {
    color: "hsl(0, 0%, 20%)",
  },
  inputContainer: {
    backgroundColor: "hsl(0, 0%, 12%)",
    borderTopWidth: 1,
    borderTopColor: "hsl(0, 0%, 20%)",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  connectionRequiredContainer: {
    padding: 16,
    alignItems: "center",
  },
  connectionRequiredText: {
    color: "hsl(0, 0%, 60%)",
    fontSize: 14,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  messageInput: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 15%)",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "hsl(0, 0%, 90%)",
    fontSize: 15,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "hsl(75, 100%, 60%)",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});

export default MessagesScreen;

