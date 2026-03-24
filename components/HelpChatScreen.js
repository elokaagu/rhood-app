import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
  memo,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
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
import { supabase, db } from "../lib/supabase";
import * as Haptics from "expo-haptics";
import { HapticPatterns } from "../lib/haptics";
import { getAssistantReply } from "../lib/aiChat";
import { track, AnalyticsEvents } from "../lib/analytics";
import {
  getHelpChatRuleBasedReply,
  QUICK_ACTION_USER_MESSAGES,
} from "../lib/helpChatFallback";
import { runHelpChatEscalation } from "../lib/helpChatEscalation";

const MessageBubble = memo(function MessageBubble({ message, onQuickAction }) {
  const isUser = message.sender === "user";
  return (
    <View
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
          <Text style={[styles.messageText, styles.userMessageText]}>
            {message.text}
          </Text>
        ) : (
          <Markdown style={markdownStyles}>{message.text}</Markdown>
        )}
      </View>
      {message.quickActions && message.quickActions.length > 0 && (
        <View style={styles.quickActionsContainer}>
          {message.quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.quickActionButton}
              onPress={() => onQuickAction(action.action)}
            >
              <Text style={styles.quickActionText}>{action.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
});

const TypingFooter = memo(function TypingFooter() {
  return (
    <View style={styles.typingIndicator}>
      <Text style={styles.typingText}>Thinking...</Text>
    </View>
  );
});

export default function HelpChatScreen({ user, onBack }) {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const listRef = useRef(null);
  const insets = useSafeAreaInsets();

  /** Help chat hides the tab bar — pad for home indicator + comfortable input only. */
  const bottomInputPadding = useMemo(
    () => Math.max(insets.bottom, 12) + SPACING.lg,
    [insets.bottom]
  );

  const headerPaddingTop = useMemo(
    () => Math.max(SPACING.lg, insets.top),
    [insets.top]
  );

  const scrollBottomPadding = useMemo(
    () => bottomInputPadding + 24,
    [bottomInputPadding]
  );

  // Load conversation history from database on mount
  useEffect(() => {
    const loadConversationHistory = async () => {
      if (!user?.id) {
        // Show welcome message for anonymous users
        const welcomeMessage = {
          id: "welcome",
          text: "Hi! I'm here to help. What can I assist you with today?",
          sender: "bot",
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
        return;
      }

      try {
        const savedMessages = await db.getHelpChatMessages(user.id);

        if (savedMessages && savedMessages.length > 0) {
          // Convert database messages to app format
          const formattedMessages = savedMessages.map((msg) => ({
            id: msg.id,
            text: msg.text,
            sender: msg.sender,
            timestamp: new Date(msg.created_at),
            quickActions: msg.metadata?.quickActions || null,
            error: msg.metadata?.error || null,
          }));
          setMessages(formattedMessages);
        } else {
          // Only show welcome message if no history exists
          const welcomeMessage = {
            id: "welcome",
            text: "Hey! I'm here to help you with anything R/HOOD related. What's up?",
            sender: "bot",
            timestamp: new Date(),
          };
          setMessages([welcomeMessage]);
        }
      } catch (error) {
        console.error("Error loading conversation history:", error);
        // Fallback to welcome message on error
        const welcomeMessage = {
          id: "welcome",
          text: "Hi! I'm here to help. What can I assist you with today?",
          sender: "bot",
          timestamp: new Date(),
        };
        setMessages([welcomeMessage]);
      }
    };

    loadConversationHistory();
  }, [user?.id]);

  useEffect(() => {
    const t = requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated: true });
    });
    return () => cancelAnimationFrame(t);
  }, [messages.length, isTyping]);

  const handleEscalate = useCallback(async () => {
    await runHelpChatEscalation({
      supabase,
      user,
      messages,
      Linking,
      Alert,
      appendBotMessage: (msg) => setMessages((prev) => [...prev, msg]),
      persistBotMessage: async (msg) => {
        if (!user?.id) return;
        try {
          await db.saveHelpChatMessage(user.id, msg);
        } catch (error) {
          console.error("Error saving bot message:", error);
        }
      },
    });
  }, [user, messages]);

  // Send message
  const handleSendMessage = useCallback(async (text = null) => {
    const messageText = text || inputText.trim();
    if (!messageText) return;

    if (!user?.id) {
      Alert.alert(
        "Please sign in",
        "You need to be signed in to use the help chat."
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Add user message to UI immediately
    const userMessage = {
      id: Date.now().toString(),
      text: messageText,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    // Save user message to database
    try {
      await db.saveHelpChatMessage(user.id, userMessage);

      // Track help chat message
      track(AnalyticsEvents.HELP_CHAT_MESSAGE, {
        message_length: messageText.length,
      });
    } catch (error) {
      console.error("Error saving user message:", error);
      // Continue even if save fails
    }

    try {
      const historyForAi = [...messages, userMessage].slice(-10);
      const ai = await getAssistantReply(messageText, {
        history: historyForAi,
      });
      const textReply = ai?.text;

      // Check if AI returned an error message
      const isErrorResponse =
        textReply &&
        (textReply.includes("I couldn't reach our assistant") ||
          textReply.includes("AI is not enabled") ||
          textReply.includes("having trouble"));

      const reply =
        textReply && typeof textReply === "string" && !isErrorResponse
          ? { text: textReply, quickActions: [] }
          : getHelpChatRuleBasedReply(messageText);

      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: reply.text,
        sender: "bot",
        timestamp: new Date(),
        category: reply.category || "general",
        shouldEscalate: !!reply.shouldEscalate,
        priority: reply.priority || "normal",
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

      // Save bot message to database
      try {
        await db.saveHelpChatMessage(user.id, botMessage);
      } catch (error) {
        console.error("Error saving bot message:", error);
        // Continue even if save fails
      }
    } catch (e) {
      const fallback = getHelpChatRuleBasedReply(messageText);
      const botMessage = {
        id: (Date.now() + 1).toString(),
        text: fallback.text,
        sender: "bot",
        timestamp: new Date(),
        category: fallback.category || "general",
        shouldEscalate: !!fallback.shouldEscalate,
        priority: fallback.priority || "normal",
        quickActions: fallback.quickActions,
      };
      setIsTyping(false);
      setMessages((prev) => [...prev, botMessage]);

      // Save fallback bot message to database
      try {
        await db.saveHelpChatMessage(user.id, botMessage);
      } catch (error) {
        console.error("Error saving bot message:", error);
        // Continue even if save fails
      }
    }
  }, [messages, inputText, user?.id]);

  const handleQuickAction = useCallback(
    (action) => {
      if (action === "escalate") {
        handleEscalate();
        return;
      }
      const preset = QUICK_ACTION_USER_MESSAGES[action];
      const message = preset ?? action;
      handleSendMessage(message);
    },
    [handleEscalate, handleSendMessage]
  );

  const renderMessageItem = useCallback(
    ({ item }) => (
      <MessageBubble message={item} onQuickAction={handleQuickAction} />
    ),
    [handleQuickAction]
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: headerPaddingTop }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            HapticPatterns.backButton();
            onBack();
          }}
        >
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
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMessageItem}
          style={styles.messagesContainer}
          contentContainerStyle={[
            styles.messagesContent,
            { paddingBottom: scrollBottomPadding },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          ListFooterComponent={isTyping ? TypingFooter : null}
        />

        {/* Input */}
        <View
          style={[styles.inputContainer, { paddingBottom: bottomInputPadding }]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.messageInput}
              placeholder="Type a message..."
              placeholderTextColor="hsl(0, 0%, 50%)"
              value={inputText}
              onChangeText={setInputText}
              multiline
              blurOnSubmit={false}
              maxHeight={100}
              maxLength={500}
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
    fontSize: 20,
    fontFamily: "TS Block Bold",
    fontWeight: "700",
    color: COLORS.textPrimary,
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
