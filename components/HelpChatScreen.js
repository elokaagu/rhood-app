import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Markdown from "react-native-markdown-display";
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  sharedStyles,
} from "../lib/sharedStyles";
import { supabase } from "../lib/supabase";
import * as Haptics from "expo-haptics";
import { getAssistantReply } from "../lib/aiChat";

export default function HelpChatScreen({ user, onBack }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef(null);
  const insets = useSafeAreaInsets();

  // Reduced padding to sit just above bottom tab bar
  const TAB_BAR_OVERLAY_OFFSET = 70; // Reduced from 96 for tighter spacing
  const bottomInputPadding = useMemo(() => {
    const BASE_PADDING = 8; // Reduced from 12
    return BASE_PADDING + Math.max(insets.bottom, 10) + TAB_BAR_OVERLAY_OFFSET;
  }, [insets.bottom]);

  const scrollBottomPadding = useMemo(
    () => bottomInputPadding + 24,
    [bottomInputPadding]
  );

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage = {
      id: "welcome",
      text: "Hi! I'm here to help. What can I assist you with today?",
      sender: "bot",
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Bot response logic
  const getBotResponse = (userMessage) => {
    const lowerMessage = userMessage.toLowerCase().trim();

    // Upload issues
    if (
      lowerMessage.includes("upload") ||
      lowerMessage.includes("mix") ||
      lowerMessage.includes("file") ||
      lowerMessage.includes("can't upload") ||
      lowerMessage.includes("upload failed")
    ) {
      return {
        text: "I can help with upload issues! Here are common solutions:\n\n" +
          "• File size limit: Maximum 500MB per file\n" +
          "• Supported formats: MP3, WAV, M4A, AAC\n" +
          "• Check your internet connection\n" +
          "• Try closing and reopening the app\n" +
          "• Make sure you're logged in\n\n" +
          "If the problem persists, I can connect you with our support team.",
        quickActions: [
          { text: "File too large", action: "file-size" },
          { text: "Upload keeps failing", action: "upload-failing" },
          { text: "Contact support", action: "escalate" },
        ],
      };
    }

    // Location issues
    if (
      lowerMessage.includes("location") ||
      lowerMessage.includes("city") ||
      lowerMessage.includes("where") ||
      lowerMessage.includes("can't change location") ||
      lowerMessage.includes("location not working")
    ) {
      return {
        text: "I can help with location issues! Here's what you can do:\n\n" +
          "• Go to Settings > Edit Profile\n" +
          "• Update your city/location manually\n" +
          "• Make sure location services are enabled in your device settings\n" +
          "• Try restarting the app\n\n" +
          "If you still can't update your location, I can connect you with support.",
        quickActions: [
          { text: "Can't find my city", action: "city-not-found" },
          { text: "Location won't save", action: "location-save" },
          { text: "Contact support", action: "escalate" },
        ],
      };
    }

    // General help/FAQ
    if (
      lowerMessage.includes("help") ||
      lowerMessage.includes("how") ||
      lowerMessage.includes("what") ||
      lowerMessage.includes("faq") ||
      lowerMessage.includes("question")
    ) {
      return {
        text: "I can help with:\n\n" +
          "• Uploading mixes\n" +
          "• Location settings\n" +
          "• Account issues\n" +
          "• App features\n" +
          "• Troubleshooting\n\n" +
          "What specific issue are you facing?",
        quickActions: [
          { text: "Upload help", action: "upload" },
          { text: "Location help", action: "location" },
          { text: "Other questions", action: "general" },
        ],
      };
    }

    // Account issues
    if (
      lowerMessage.includes("account") ||
      lowerMessage.includes("login") ||
      lowerMessage.includes("password") ||
      lowerMessage.includes("sign in")
    ) {
      return {
        text: "For account issues:\n\n" +
          "• Reset password: Use 'Forgot Password' on the login screen\n" +
          "• Login problems: Check your email and password\n" +
          "• Account settings: Go to Settings > Account\n\n" +
          "Need more help? I can connect you with support.",
        quickActions: [
          { text: "Can't log in", action: "login-issue" },
          { text: "Forgot password", action: "password-reset" },
          { text: "Contact support", action: "escalate" },
        ],
      };
    }

    // Default response
    return {
      text: "I understand you're looking for help. Could you tell me more about the issue?\n\n" +
        "I can help with:\n" +
        "• Upload problems\n" +
        "• Location settings\n" +
        "• Account questions\n" +
        "• General app help\n\n" +
        "Or I can connect you directly with our support team.",
      quickActions: [
        { text: "Upload issues", action: "upload" },
        { text: "Location issues", action: "location" },
        { text: "Contact support", action: "escalate" },
      ],
    };
  };

  // Handle quick action
  const handleQuickAction = (action) => {
    let message = "";
    switch (action) {
      case "upload":
        message = "I'm having trouble uploading a mix";
        break;
      case "location":
        message = "I'm having trouble with my location";
        break;
      case "file-size":
        message = "My file is too large to upload";
        break;
      case "upload-failing":
        message = "My upload keeps failing";
        break;
      case "city-not-found":
        message = "I can't find my city in the location list";
        break;
      case "location-save":
        message = "My location won't save";
        break;
      case "login-issue":
        message = "I can't log into my account";
        break;
      case "password-reset":
        message = "I need to reset my password";
        break;
      case "general":
        message = "I have a general question";
        break;
      case "escalate":
        handleEscalate();
        return;
      default:
        message = action;
    }
    handleSendMessage(message);
  };

  // Send message
  const handleSendMessage = async (text = null) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      text: messageText,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    try {
      // Prefer AI reply if configured; fallback to rules if not
      const history = messages.slice(-10); // keep context short for latency
      const ai = await getAssistantReply(messageText, { history });
      const textReply = ai?.text;
      const reply =
        textReply && typeof textReply === "string"
          ? { text: textReply, quickActions: [] }
          : getBotResponse(messageText);

      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: reply.text,
        sender: "bot",
        timestamp: new Date(),
        quickActions:
          reply.quickActions && reply.quickActions.length
            ? reply.quickActions
            : [
                // Offer ticket creation when answer seems generic
                { text: "Raise a support ticket", action: "escalate" },
              ],
      };
      setIsTyping(false);
      setMessages((prev) => [...prev, botMessage]);
    } catch (e) {
      const fallback = getBotResponse(messageText);
      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: fallback.text,
        sender: "bot",
        timestamp: new Date(),
        quickActions: fallback.quickActions,
      };
      setIsTyping(false);
      setMessages((prev) => [...prev, botMessage]);
    }
  };

  // Escalate to email support
  const handleEscalate = async () => {
    // Collect conversation history
    const conversationHistory = messages
      .map((msg) => `${msg.sender === "user" ? "You" : "Support Bot"}: ${msg.text}`)
      .join("\n\n");

    const userEmail = user?.email || "user@example.com";
    const userName = user?.user_metadata?.dj_name || user?.user_metadata?.first_name || "User";

    try {
      // Try to send via Supabase Edge Function (if available)
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: {
          to: "hello@rhood.io",
          subject: `Support Request from ${userName}`,
          html: `
            <h2>Support Request</h2>
            <p><strong>User:</strong> ${userName} (${userEmail})</p>
            <p><strong>User ID:</strong> ${user?.id || "Unknown"}</p>
            <hr>
            <h3>Conversation History:</h3>
            <pre style="white-space: pre-wrap; background: #f5f5f5; padding: 15px; border-radius: 5px;">${conversationHistory}</pre>
            <hr>
            <p><em>This message was sent from the in-app help chat.</em></p>
          `,
          text: `Support Request from ${userName}\n\nUser: ${userName} (${userEmail})\nUser ID: ${user?.id || "Unknown"}\n\nConversation History:\n\n${conversationHistory}`,
        },
      });

      if (error) {
        // Fallback to mailto link
        throw new Error("Edge function not available");
      }

      // Success - show confirmation
      const successMessage = {
        id: Date.now().toString(),
        text: "Great! I've sent your message to our support team. They'll get back to you at " + userEmail + " within 24 hours.",
        sender: "bot",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMessage]);
    } catch (error) {
      // Fallback: Use mailto link
      const mailtoLink = `mailto:hello@rhood.io?subject=Support Request from ${userName}&body=${encodeURIComponent(
        `Hi R/HOOD Support,\n\nI need help with the following issue:\n\n${conversationHistory}\n\nUser: ${userName}\nEmail: ${userEmail}\nUser ID: ${user?.id || "Unknown"}\n\nThank you!`
      )}`;

      Alert.alert(
        "Contact Support",
        "I'll open your email app so you can send us a message directly.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Email",
            onPress: async () => {
              const canOpen = await Linking.canOpenURL(mailtoLink);
              if (canOpen) {
                await Linking.openURL(mailtoLink);
                const successMessage = {
                  id: Date.now().toString(),
                  text: "I've opened your email app. Please send the message and our team will respond within 24 hours.",
                  sender: "bot",
                  timestamp: new Date(),
                };
                setMessages((prev) => [...prev, successMessage]);
              } else {
                Alert.alert("Error", "Could not open email app. Please email hello@rhood.io directly.");
              }
            },
          },
        ]
      );
    }
  };

  const renderMessage = (message) => {
    const isUser = message.sender === "user";
    return (
      <View
        key={message.id}
        style={[
          styles.messageContainer,
          isUser ? styles.userMessageContainer : styles.botMessageContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userMessageBubble : styles.botMessageBubble,
          ]}
        >
          {isUser ? (
            <Text
              style={[styles.messageText, styles.userMessageText]}
            >
              {message.text}
            </Text>
          ) : (
            <Markdown
              style={markdownStyles}
            >
              {message.text}
            </Markdown>
          )}
        </View>
        {message.quickActions && message.quickActions.length > 0 && (
          <View style={styles.quickActionsContainer}>
            {message.quickActions.map((action, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickActionButton}
                onPress={() => handleQuickAction(action.action)}
              >
                <Text style={styles.quickActionText}>{action.text}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Help Center</Text>
          <Text style={styles.headerSubtitle}>We're here to help</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={[styles.messagesContent, { paddingBottom: scrollBottomPadding }]}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(renderMessage)}
          {isTyping && (
            <View style={styles.typingIndicator}>
              <Text style={styles.typingText}>Thinking...</Text>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={[styles.inputContainer, { paddingBottom: bottomInputPadding }]}>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.messageInput}
              placeholder="Type a message..."
              placeholderTextColor="hsl(0, 0%, 50%)"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxHeight={100}
              maxLength={500}
              onSubmitEditing={() => handleSendMessage()}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!inputText.trim() || isTyping) && styles.sendButtonDisabled,
              ]}
              onPress={() => handleSendMessage()}
              disabled={!inputText.trim() || isTyping}
            >
              {isTyping ? (
                <ActivityIndicator size="small" color="hsl(0, 0%, 0%)" />
              ) : (
                <Ionicons name="send" size={20} color="hsl(0, 0%, 0%)" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.sm,
    marginLeft: -SPACING.sm,
  },
  headerContent: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  headerTitle: {
    ...sharedStyles.tsBlockBoldHeading,
    fontSize: 20,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },
  keyboardView: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingTop: 16,
    paddingBottom: 20,
  },
  messageContainer: {
    marginBottom: SPACING.md,
    maxWidth: "85%",
  },
  userMessageContainer: {
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  botMessageContainer: {
    alignSelf: "flex-start",
    alignItems: "flex-start",
  },
  messageBubble: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  userMessageBubble: {
    backgroundColor: COLORS.primary,
  },
  botMessageBubble: {
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  messageText: {
    fontSize: TYPOGRAPHY.base,
    fontFamily: TYPOGRAPHY.primary,
    lineHeight: 20,
  },
  userMessageText: {
    color: COLORS.background,
  },
  botMessageText: {
    color: COLORS.textPrimary,
  },
  quickActionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  quickActionButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.xs,
    marginTop: SPACING.xs,
  },
  quickActionText: {
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.primary,
  },
  typingIndicator: {
    padding: SPACING.md,
    alignSelf: "flex-start",
  },
  typingText: {
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textTertiary,
    fontStyle: "italic",
  },
  inputContainer: {
    backgroundColor: "hsl(0, 0%, 0%)", // Match main background, no grey padding
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
});

const markdownStyles = {
  body: {
    color: COLORS.textPrimary,
    fontFamily: TYPOGRAPHY.primary,
    fontSize: TYPOGRAPHY.base,
    lineHeight: 20,
  },
  heading3: {
    ...sharedStyles.tsBlockBoldHeading,
    fontSize: 16,
    marginTop: 6,
    marginBottom: 6,
  },
  strong: {
    fontWeight: "700",
  },
  bullet_list: {
    marginVertical: 4,
  },
  ordered_list: {
    marginVertical: 4,
  },
  list_item: {
    flexDirection: "row",
  },
  paragraph: {
    marginTop: 4,
    marginBottom: 8,
  },
  code_inline: {
    backgroundColor: COLORS.backgroundTertiary,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
};

