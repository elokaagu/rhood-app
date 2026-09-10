import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  FlatList,
  Image,
  Linking,
  Share,
  ActionSheetIOS,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase, db } from "../lib/supabase";
import { multimediaService } from "../lib/multimediaService";
import { HapticPatterns } from "../lib/haptics";
import * as Haptics from "expo-haptics";
import ProgressiveImage from "./ProgressiveImage";
import OpportunityMessageCard from "./OpportunityMessageCard";
import MessageRow from "./MessageRow";
import RhoodModal from "./RhoodModal";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import * as WebBrowser from "expo-web-browser";
import { LIST_PERFORMANCE } from "../lib/performanceConstants";
import { URL_REGEX, stripTrailingPunctuation } from "../lib/messageUrlUtils";
import { useMessageLinkPreviews } from "../hooks/useMessageLinkPreviews";
import { useMessagesScreenAudio } from "../hooks/useMessagesScreenAudio";
import { useMessagesRealtimeSubscription } from "../hooks/useMessagesRealtime";
import {
  loadIndividualThreadState,
  loadGroupThreadState,
} from "../lib/messagesScreen/loadMessagesOperations";
import {
  sendIndividualChatMessages,
  sendGroupChatMessages,
} from "../lib/messagesScreen/sendMessagesOperations";
import MessagesSelectedMediaTray from "./messages/MessagesSelectedMediaTray";
import MessagesMediaPickerModal from "./messages/MessagesMediaPickerModal";
import MessagesFullscreenImageModal from "./messages/MessagesFullscreenImageModal";
import MessagesFullscreenVideoModal from "./messages/MessagesFullscreenVideoModal";
import MessageActionsModal from "./messages/MessageActionsModal";
import MessagesInputFooter from "./messages/MessagesInputFooter";
import AppScreenTutorialModal from "./AppScreenTutorialModal";
import ApprovedPromoterStamp from "./ApprovedPromoterStamp";
import { profileIsApprovedPromoter } from "../lib/approvedPromoterUtils";
import { useAppTutorialModal } from "../hooks/useAppTutorialModal";
import { APP_TUTORIAL_SCREEN_IDS } from "../lib/appTutorialContent";
import { promptReport, isMessagingBlockedWith } from "../lib/moderation";
import styles from "./MessagesScreen.styles";
import {
  getMessageThreadSnapshot,
  setMessageThreadSnapshot,
} from "../lib/messageThreadSnapshotCache";

const MessagesScreen = ({ user, navigation, route }) => {
  const { params } = route || {};
  const {
    djId,
    communityId,
    chatType = "individual",
    communityName: communityNameParam,
  } = params || {};

  const insets = useSafeAreaInsets();
  const { tutorialModalProps } = useAppTutorialModal(APP_TUTORIAL_SCREEN_IDS.MESSAGES);

  const keyboardVerticalOffset = useMemo(() => {
    if (Platform.OS !== "ios") return 0;
    const HEADER_HEIGHT_ESTIMATE = 72;
    return insets.top + HEADER_HEIGHT_ESTIMATE;
  }, [insets.top]);

  // Extra space to account for the overlaid bottom tab bar
  const tabBarOverlayOffset = 0; // Reduced from 96 for tighter spacing

  const bottomInputPadding = useMemo(() => {
    const BASE_PADDING = 0; // Set to 0 to match HelpChatScreen
    return BASE_PADDING + Math.max(insets.bottom, 10) + tabBarOverlayOffset;
  }, [insets.bottom]);

  const scrollBottomPadding = useMemo(
    () => bottomInputPadding + 24,
    [bottomInputPadding]
  );

  // State
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  const [communityData, setCommunityData] = useState(null);
  const [memberCount, setMemberCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [canCompose, setCanCompose] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [threadId, setThreadId] = useState(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState([]);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [fullscreenVideo, setFullscreenVideo] = useState(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [selectedMessageForOptions, setSelectedMessageForOptions] = useState(null);
  const [showMessageOptionsModal, setShowMessageOptionsModal] = useState(false);
  const [replyingToMessage, setReplyingToMessage] = useState(null);
  const [errorModal, setErrorModal] = useState({
    visible: false,
    title: "",
    message: "",
  });

  // Refs
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const stickToBottomRef = useRef(true);

  const conversationKey = useMemo(
    () => `${djId ?? ""}|${communityId ?? ""}|${chatType}`,
    [djId, communityId, chatType]
  );
  const conversationKeyRef = useRef(conversationKey);
  conversationKeyRef.current = conversationKey;
  // loadMessages is called on mount, after every send (300ms delay), and
  // whenever a realtime event arrives — stillHere() below only guarded
  // against the CONVERSATION changing mid-flight, not against a newer
  // loadMessages() call for the SAME conversation superseding an older
  // still-in-flight one. If the older call's network response happened to
  // resolve after the newer one, its stale full setMessages(...) replace
  // would silently revert to older data.
  const loadRequestIdRef = useRef(0);

  const showThemedError = useCallback((title, message) => {
    setErrorModal({
      visible: true,
      title: title || "Error",
      message: message || "Something went wrong.",
    });
  }, []);

  /** WhatsApp-style: show last-known thread immediately when reopening a chat */
  useLayoutEffect(() => {
    if (!user?.id) return;
    if (chatType === "individual" && !djId) return;
    if (chatType === "group" && !communityId) return;

    const snap = getMessageThreadSnapshot(user.id, chatType, djId, communityId);
    if (snap) {
      setMessages(snap.messages ?? []);
      setThreadId(snap.threadId ?? null);
      setOtherUser(snap.otherUser ?? null);
      setCommunityData(snap.communityData ?? null);
      setMemberCount(snap.memberCount ?? 0);
      setIsConnected(!!snap.isConnected);
      setCanCompose(snap.canCompose ?? !!snap.isConnected);
      setConnectionStatus(snap.connectionStatus ?? null);
      setLoading(false);
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      });
    } else {
      setMessages([]);
      setThreadId(null);
      setOtherUser(null);
      setCommunityData(null);
      setMemberCount(0);
      setIsConnected(false);
      setCanCompose(false);
      setConnectionStatus(null);
      setLoading(true);
    }
  }, [user?.id, conversationKey, chatType, djId, communityId]);

  const { messageLinkPreviews, discardPreviewsForMessage } =
    useMessageLinkPreviews(messages, conversationKey);
  const {
    playingAudioId,
    audioProgress,
    audioDurations,
    toggleAudioPlayback,
    formatDuration,
  } = useMessagesScreenAudio(messages);

  const handleUrlPress = useCallback(async (rawUrl) => {
    if (!rawUrl) return;

    const sanitizedUrl =
      rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
        ? rawUrl
        : `https://${rawUrl}`;

    try {
      const supported = await Linking.canOpenURL(sanitizedUrl);
      if (supported) {
        await Linking.openURL(sanitizedUrl);
      } else {
        showThemedError("Cannot Open Link", sanitizedUrl);
      }
    } catch (error) {
      console.error("Error opening link:", error);
      showThemedError("Link Error", "Unable to open this link right now.");
    }
  }, [showThemedError]);

  const handleUrlLongPress = useCallback(
    (rawUrl) => {
      if (!rawUrl) return;
      const sanitizedUrl =
        rawUrl.startsWith("http://") || rawUrl.startsWith("https://")
          ? rawUrl
          : `https://${rawUrl}`;

      const copyAction = async () => {
        try {
          await Clipboard.setStringAsync(sanitizedUrl);
        } catch (_) {}
      };

      const openAction = () => handleUrlPress(sanitizedUrl);
      const shareAction = async () => {
        try {
          await Share.share({ message: sanitizedUrl, url: sanitizedUrl });
        } catch (_) {}
      };

      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ["Cancel", "Copy Link", "Open Link", "Share Link"],
            cancelButtonIndex: 0,
          },
          (buttonIndex) => {
            if (buttonIndex === 1) copyAction();
            if (buttonIndex === 2) openAction();
            if (buttonIndex === 3) shareAction();
          }
        );
        return;
      }

      Alert.alert("Link actions", sanitizedUrl, [
        { text: "Copy Link", onPress: copyAction },
        { text: "Open Link", onPress: openAction },
        { text: "Share Link", onPress: shareAction },
        { text: "Cancel", style: "cancel" },
      ]);
    },
    [handleUrlPress]
  );

  const renderMessageText = useCallback(
    (message) => {
      if (!message?.content?.trim()) return null;

      const text = message.content;
      const segments = [];
      let lastIndex = 0;

      text.replace(URL_REGEX, (match, offset) => {
        if (offset > lastIndex) {
          segments.push({
            type: "text",
            value: text.slice(lastIndex, offset),
          });
        }

        const normalized = stripTrailingPunctuation(match);
        segments.push({
          type: "link",
          value: normalized,
        });
        if (normalized.length < match.length) {
          segments.push({
            type: "text",
            value: match.substring(normalized.length),
          });
        }

        lastIndex = offset + match.length;
        return match;
      });

      if (lastIndex < text.length) {
        segments.push({
          type: "text",
          value: text.slice(lastIndex),
        });
      }

      if (!segments.length) {
        segments.push({ type: "text", value: text });
      }

      return (
        <Text
          style={[
            styles.messageText,
            message.isOwn ? styles.ownMessageText : styles.otherMessageText,
          ]}
          selectable
        >
          {segments.map((segment, index) =>
            segment.type === "link" ? (
              <Text
                key={`${message.id}-link-${index}`}
                style={[
                  styles.messageLink,
                  message.isOwn
                    ? styles.ownMessageLink
                    : styles.otherMessageLink,
                ]}
                onPress={() => handleUrlPress(segment.value)}
                onLongPress={() => handleUrlLongPress(segment.value)}
              >
                {segment.value}
              </Text>
            ) : (
              <Text key={`${message.id}-text-${index}`}>{segment.value}</Text>
            )
          )}
        </Text>
      );
    },
    [handleUrlPress, handleUrlLongPress]
  );

  const renderLinkPreviews = useCallback(
    (message) => {
      const previews = messageLinkPreviews[message.id];
      if (!previews || !previews.length) return null;

      return previews.map((preview) => {
        const isOwn = message.isOwn;

        return (
        <TouchableOpacity
          key={`${message.id}-${preview.url}`}
          style={[
            styles.linkPreviewCard,
            message.isOwn
              ? styles.ownLinkPreviewCard
              : styles.otherLinkPreviewCard,
          ]}
          activeOpacity={0.85}
          onPress={() => handleUrlPress(preview.url)}
          onLongPress={() => handleUrlLongPress(preview.url)}
        >
          {preview.image ? (
            <Image
              source={{ uri: preview.image }}
              style={styles.linkPreviewImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.linkPreviewPlaceholder}>
              <Ionicons
                name="link-outline"
                size={24}
                color="hsl(0, 0%, 65%)"
              />
            </View>
          )}
          <View style={styles.linkPreviewContent}>
            {preview.siteName ? (
                <Text
                  style={[
                    styles.linkPreviewSite,
                    isOwn
                      ? styles.ownLinkPreviewSite
                      : styles.otherLinkPreviewSite,
                  ]}
                  numberOfLines={1}
                >
                {preview.siteName}
              </Text>
            ) : null}
              <Text
                style={[
                  styles.linkPreviewTitle,
                  isOwn
                    ? styles.ownLinkPreviewTitle
                    : styles.otherLinkPreviewTitle,
                ]}
                numberOfLines={2}
              >
              {preview.title || preview.url}
            </Text>
            {preview.description ? (
                <Text
                  style={[
                    styles.linkPreviewDescription,
                    isOwn
                      ? styles.ownLinkPreviewDescription
                      : styles.otherLinkPreviewDescription,
                  ]}
                  numberOfLines={2}
                >
                {preview.description}
              </Text>
            ) : null}
              <Text
                style={[
                  styles.linkPreviewUrl,
                  isOwn ? styles.ownLinkPreviewUrl : styles.otherLinkPreviewUrl,
                ]}
                numberOfLines={1}
              >
              {preview.url.replace(/^https?:\/\//, "")}
            </Text>
          </View>
        </TouchableOpacity>
        );
      });
    },
    [handleUrlPress, handleUrlLongPress, messageLinkPreviews]
  );

  const handleForwardMessage = useCallback(async (message) => {
    try {
      const parts = [];
      if (message?.content) {
        parts.push(message.content);
      }
      if (message?.mediaUrl) {
        parts.push(message.mediaUrl);
      }

      if (!parts.length) {
        Alert.alert(
          "Nothing to forward",
          "This message doesn't contain any shareable content yet."
        );
        return;
      }

      await Share.share({ message: parts.join("\n\n") });
    } catch (error) {
      console.error("Error forwarding message:", error);
      Alert.alert("Error", "Unable to forward this message right now.");
    }
  }, []);

  const handleDeleteMessage = useCallback(
    async (message) => {
      if (!message?.id) return;

      try {
        const targetTable =
          message.recordType === "group" ? "community_posts" : "messages";

        const { error } = await supabase
          .from(targetTable)
          .delete()
          .eq("id", message.id);

        if (error) {
          throw error;
        }

        setMessages((prev) => prev.filter((m) => m.id !== message.id));
        discardPreviewsForMessage(message.id);
      } catch (error) {
        console.error("Error deleting message:", error);
        Alert.alert(
          "Error",
          "Failed to delete this message. Please try again."
        );
      }
    },
    [discardPreviewsForMessage, supabase]
  );

  const handleCopyMessage = useCallback(async (message) => {
    try {
      const textToCopy = message.content || message.mediaUrl || "";
      if (textToCopy) {
        await Clipboard.setStringAsync(textToCopy);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("Copied", "Message copied to clipboard");
      }
    } catch (error) {
      console.error("Error copying message:", error);
      Alert.alert("Error", "Failed to copy message");
    }
  }, []);

  const handleReplyToMessage = useCallback((message) => {
    setReplyingToMessage(message);
    setShowMessageOptionsModal(false);
    // Focus on input (you may need to add a ref to TextInput)
  }, []);

  const handlePinMessage = useCallback(async (message) => {
    try {
      // TODO: Implement pin functionality in database
      Alert.alert("Pin", "Pin functionality coming soon");
      setShowMessageOptionsModal(false);
    } catch (error) {
      console.error("Error pinning message:", error);
      Alert.alert("Error", "Failed to pin message");
    }
  }, []);

  const handleDeleteForYou = useCallback(
    async (message) => {
      if (!message?.id) return;
      try {
        Alert.alert(
          "Delete for you",
          "This message will be hidden from you but remain visible to others.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                // Optimistic — same as handleDeleteMessage's pattern.
                setMessages((prev) => prev.filter((m) => m.id !== message.id));
                setShowMessageOptionsModal(false);

                const targetTable =
                  message.recordType === "group" ? "community_posts" : "messages";
                const { error } = await supabase.rpc("delete_message_for_me", {
                  p_message_id: message.id,
                  p_table: targetTable,
                });
                if (error) {
                  // Persisting failed — surface it (and the message stays
                  // hidden for this session; a reload will bring it back,
                  // same as before this fix, rather than silently claiming
                  // success server-side never actually happened).
                  console.error("Error persisting delete-for-you:", error);
                  Alert.alert(
                    "Couldn't hide message",
                    "This will reappear next time you reload. Please try again."
                  );
                }
              },
            },
          ]
        );
      } catch (error) {
        console.error("Error deleting message for you:", error);
        Alert.alert("Error", "Failed to delete message");
      }
    },
    [supabase]
  );

  const handleUnsendMessage = useCallback(async (message) => {
    if (!message.isOwn) {
      Alert.alert("Error", "You can only unsend your own messages");
      return;
    }

    Alert.alert(
      "Unsend message?",
      "This will remove the message for everyone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unsend",
          style: "destructive",
          onPress: async () => {
            await handleDeleteMessage(message);
            setShowMessageOptionsModal(false);
          },
        },
      ]
    );
  }, [handleDeleteMessage]);

  const handleMessageLongPress = useCallback(
    (message) => {
      if (!message) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedMessageForOptions(message);
      setShowMessageOptionsModal(true);
    },
    []
  );

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const loadId = conversationKey;
    const myRequestId = ++loadRequestIdRef.current;
    const stillHere = () =>
      conversationKeyRef.current === loadId &&
      loadRequestIdRef.current === myRequestId;

    try {
      console.log("📥 Loading messages...", { chatType, djId, communityId });

      if (chatType === "individual" && djId) {
        const result = await loadIndividualThreadState({
          userId: user.id,
          djId,
          supabase,
          db,
        });

        if (!stillHere()) return;

        if (!result.ok) {
          if (result.code === "no_thread") {
            console.error("❌ Failed to get or create thread ID");
            Alert.alert("Error", "Failed to initialize chat. Please try again.");
          } else if (result.code === "query_error" && result.error) {
            console.error("❌ Error loading messages:", result.error);
            console.error("❌ Error details:", {
              code: result.error.code,
              message: result.error.message,
              hint: result.error.hint,
              details: result.error.details,
            });
            Alert.alert(
              "Error",
              `Failed to load messages: ${result.error.message}`
            );
          }
          return;
        }

        const p = result.payload;
        if (!stillHere()) return;
        setThreadId(p.threadId);
        console.log("🧵 Thread ID:", p.threadId);
        console.log("📨 Loaded messages:", p.messages.length);
        setMessages(p.messages);
        if (p.otherUser) {
          setOtherUser(p.otherUser);
        }
        setIsConnected(p.isConnected);
        const blocked = djId ? await isMessagingBlockedWith(djId) : false;
        if (!stillHere()) return;
        setCanCompose(!!p.canCompose && !blocked);
        setConnectionStatus(p.connectionStatus);
        setMemberCount(p.memberCount);
      } else if (chatType === "group" && communityId) {
        const result = await loadGroupThreadState({
          userId: user.id,
          communityId,
          supabase,
          db,
        });

        if (!stillHere()) return;

        if (!result.ok) {
          return;
        }

        const p = result.payload;
        if (!stillHere()) return;
        setMessages(p.messages);
        if (p.community) {
          setCommunityData(p.community);
        }
        setMemberCount(p.memberCount);
        setConnectionStatus(p.connectionStatus);
      }
    } catch (error) {
      if (stillHere()) {
        console.error("❌ Error in loadMessages:", error);
        Alert.alert("Error", "Failed to load messages");
      }
    } finally {
      if (stillHere()) {
        setLoading(false);
      }
    }
  }, [user?.id, chatType, djId, communityId, conversationKey]);

  useMessagesRealtimeSubscription({
    userId: user?.id,
    chatType,
    threadId,
    communityId,
    loading,
    setMessages,
    scrollViewRef,
  });

  useEffect(() => {
    if (loading) return;
    if (!user?.id) return;
    if (chatType === "individual" && !djId) return;
    if (chatType === "group" && !communityId) return;
    if (chatType === "individual" && !threadId) return;

    setMessageThreadSnapshot(user.id, chatType, djId, communityId, {
      threadId,
      messages,
      otherUser,
      communityData,
      memberCount,
      isConnected,
      canCompose,
      connectionStatus,
    });
  }, [
    loading,
    user?.id,
    chatType,
    djId,
    communityId,
    threadId,
    messages,
    otherUser,
    communityData,
    memberCount,
    isConnected,
    canCompose,
    connectionStatus,
  ]);

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

      const uploadResult = await multimediaService.uploadToStorage(picked);
      const normalizedType = picked.type === "document" ? "file" : picked.type;

      // Extract duration for audio/video files immediately after upload
      let durationMillis = null;
      if ((normalizedType === "audio" || normalizedType === "video") && Audio?.Sound?.createAsync) {
        try {
          const fileUri = uploadResult.url || picked.uri || picked.fileCopyUri;
          if (fileUri) {
            const { sound } = await Audio.Sound.createAsync(
              { uri: fileUri },
              { shouldPlay: false }
            );
            const status = await sound.getStatusAsync();
            await sound.unloadAsync();
            if (status.isLoaded && status.durationMillis) {
              durationMillis = status.durationMillis;
              console.log(`✅ Extracted ${normalizedType} duration: ${durationMillis}ms`);
            }
          }
        } catch (durationError) {
          console.warn("⚠️ Unable to extract media duration immediately:", durationError);
          // Duration will be extracted when message is loaded
        }
      }

      const newMedia = {
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
        duration: durationMillis, // Store duration if extracted
      };
      
      // Add to selected media array
      setSelectedMedia((prev) => [...prev, newMedia]);

      setShowMediaPicker(false);
    } catch (error) {
      console.error(`❌ Error uploading ${label}:`, error);
      showThemedError(
        error.alertTitle || "Upload Error",
        error.message || `Failed to upload ${label}. Please try again.`
      );
    } finally {
      setUploadingMedia(false);
    }
  }, [showThemedError]);

  const handleImageUpload = useCallback(async () => {
    try {
      setUploadingMedia(true);
      const pickedImages = await multimediaService.pickMultipleImages(10);

      if (!pickedImages || pickedImages.length === 0) {
        setUploadingMedia(false);
        return;
      }

      // Upload all selected images
      const uploadPromises = pickedImages.map((picked) =>
        multimediaService.uploadToStorage(picked)
      );
      const uploadResults = await Promise.all(uploadPromises);

      // Combine picked images with upload results
      const uploadedMedia = pickedImages.map((picked, index) => {
        const uploadResult = uploadResults[index];
        return {
          type: "image",
          url: uploadResult.url,
          filename: uploadResult.filename || picked.filename,
          size: picked.size ?? uploadResult.size ?? 0,
          mimeType: (picked.mimeType ?? uploadResult.mimeType) || "image/jpeg",
          thumbnailUrl: uploadResult.thumbnailUrl || picked.thumbnail || null,
          extension: uploadResult.fileExtension || "jpg",
          width: picked.width,
          height: picked.height,
        };
      });

      // Add to existing selected media
      setSelectedMedia((prev) => [...prev, ...uploadedMedia]);
      setShowMediaPicker(false);
    } catch (error) {
      console.error("❌ Error in handleImageUpload:", error);
      showThemedError(
        error.alertTitle || "Image Upload Error",
        error.message || "Failed to pick images. Please try again."
      );
    } finally {
      setUploadingMedia(false);
    }
  }, [showThemedError]);

  const handleVideoUpload = useCallback(async () => {
    try {
      await selectAndUploadMedia(() => multimediaService.pickVideo(), "video");
    } catch (error) {
      console.error("❌ Error in handleVideoUpload:", error);
      showThemedError(
        error.alertTitle || "Video Upload Error",
        error.message || "Failed to pick video. Please try again."
      );
      setUploadingMedia(false);
      setShowMediaPicker(false);
    }
  }, [selectAndUploadMedia, showThemedError]);

  const handleAudioUpload = useCallback(async () => {
    try {
      setShowMediaPicker(false);

      // First, pick the audio file
      const pickedAudio = await multimediaService.pickAudio();
      if (!pickedAudio) {
        return;
      }

      // Prompt user for audio label/name
      Alert.prompt(
        "Audio Label",
        "Enter a name for this audio file:",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              setUploadingMedia(false);
            },
          },
          {
            text: "OK",
            onPress: async (audioLabel) => {
              try {
                setUploadingMedia(true);

                // Use user-provided label or fall back to original filename
                const filename = audioLabel?.trim() || pickedAudio.filename;
                const audioWithLabel = {
                  ...pickedAudio,
                  filename: filename.endsWith(`.${pickedAudio.extension}`)
                    ? filename
                    : `${filename}.${pickedAudio.extension || "mp3"}`,
                };

                // Upload with the labeled filename
                await selectAndUploadMedia(
                  () => Promise.resolve(audioWithLabel),
                  "audio"
                );
              } catch (error) {
                console.error("❌ Error uploading audio:", error);
                showThemedError(
                  error.alertTitle || "Audio Upload Error",
                  error.message || "Failed to upload audio. Please try again."
                );
                setUploadingMedia(false);
              }
            },
          },
        ],
        "plain-text",
        pickedAudio.filename.replace(/\.[^/.]+$/, ""), // Default to filename without extension
        "default"
      );
    } catch (error) {
      console.error("❌ Error in handleAudioUpload:", error);
      showThemedError(
        error.alertTitle || "Audio Upload Error",
        error.message || "Failed to pick audio. Please try again."
      );
      setUploadingMedia(false);
      setShowMediaPicker(false);
    }
  }, [selectAndUploadMedia, showThemedError]);

  const handleDocumentUpload = useCallback(async () => {
    try {
      await selectAndUploadMedia(
        () => multimediaService.pickDocument(),
        "file"
      );
    } catch (error) {
      console.error("❌ Error in handleDocumentUpload:", error);
      showThemedError(
        error.alertTitle || "File Upload Error",
        error.message || "Failed to pick file. Please try again."
      );
      setUploadingMedia(false);
      setShowMediaPicker(false);
    }
  }, [selectAndUploadMedia, showThemedError]);

  const clearSelectedMedia = useCallback(() => {
    setSelectedMedia([]);
  }, []);

  const handleRemoveMedia = useCallback((index) => {
    setSelectedMedia((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Handle video playback
  const handleVideoPlay = useCallback((videoUrl) => {
    setFullscreenVideo(videoUrl);
  }, []);

  // Download file to device
  const downloadFile = useCallback(async (fileUrl, filename) => {
    try {
      console.log("💾 Downloading file:", { fileUrl, filename });

      if (!FileSystem) {
        Alert.alert(
          "Error",
          "File system not available. Please use a development build for file downloads."
        );
        return;
      }

      // Create downloads directory if it doesn't exist
      const downloadsDir = `${FileSystem.documentDirectory}Downloads/`;
      try {
        const dirInfo = await FileSystem.getInfoAsync(downloadsDir);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(downloadsDir, {
            intermediates: true,
          });
          console.log("📁 Created Downloads directory");
        }
      } catch (dirError) {
        // Directory check failed, try to create it
        try {
          await FileSystem.makeDirectoryAsync(downloadsDir, {
            intermediates: true,
          });
          console.log("📁 Created Downloads directory (after check failed)");
        } catch (createError) {
          console.warn("⚠️ Could not create Downloads directory:", createError);
          // Continue anyway - download might still work
        }
      }

      // Generate file path
      const sanitizedFilename = filename
        ? filename.replace(/[^a-zA-Z0-9.-]/g, "_")
        : `file_${Date.now()}`;
      const filePath = `${downloadsDir}${sanitizedFilename}`;

      // Download the file
      console.log("⬇️ Downloading to:", filePath);
      const downloadResumable = FileSystem.createDownloadResumable(
        fileUrl,
        filePath
      );

      const result = await downloadResumable.downloadAsync();

      if (result && result.uri) {
        console.log("✅ File downloaded to:", result.uri);
        Alert.alert(
          "Download Complete",
          `File saved to Downloads folder.\n\n${sanitizedFilename}`,
          [
            {
              text: "Open",
              onPress: async () => {
                try {
                  await Linking.openURL(`file://${result.uri}`);
                } catch (openError) {
                  console.error("Error opening downloaded file:", openError);
                  Alert.alert(
                    "Download Complete",
                    "File has been downloaded. You can find it in your Downloads folder."
                  );
                }
              },
            },
            { text: "OK" },
          ]
        );
      } else {
        throw new Error("Download failed - no file URI returned");
      }
    } catch (error) {
      console.error("❌ Error downloading file:", error);
      Alert.alert(
        "Download Error",
        `Failed to download file: ${
          error.message || "Unknown error"
        }\n\nYou can try opening it in your browser instead.`,
        [
          {
            text: "Open in Browser",
            onPress: async () => {
              try {
                await WebBrowser.openBrowserAsync(fileUrl);
              } catch (browserError) {
                console.error("Error opening in browser:", browserError);
              }
            },
          },
          { text: "OK" },
        ]
      );
    }
  }, []);

  // Handle file/document opening and downloading
  const handleFileOpen = useCallback(
    async (fileUrl, filename, mimeType) => {
      try {
        console.log("📄 Opening file:", { fileUrl, filename, mimeType });

        if (!fileUrl) {
          Alert.alert("Error", "File URL is missing");
          return;
        }

        // Show options: Open or Download
        Alert.alert(
          filename || "File",
          "Choose an action",
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Open",
              onPress: async () => {
                try {
                  // Try to open with default app
                  const canOpen = await Linking.canOpenURL(fileUrl);
                  if (canOpen) {
                    await Linking.openURL(fileUrl);
                  } else {
                    // Fallback to browser
                    await WebBrowser.openBrowserAsync(fileUrl);
                  }
                } catch (openError) {
                  console.error("Error opening file:", openError);
                  Alert.alert(
                    "Error",
                    "Could not open file. Trying download instead..."
                  );
                  // Fall through to download
                  await downloadFile(fileUrl, filename);
                }
              },
            },
            {
              text: "Download",
              onPress: () => downloadFile(fileUrl, filename),
            },
          ],
          { cancelable: true }
        );
      } catch (error) {
        console.error("❌ Error handling file:", error);
        showThemedError(
          "Error",
          `Failed to handle file: ${error.message || "Unknown error"}`
        );
      }
    },
    [downloadFile, showThemedError]
  );

  // Send message
  const sendMessage = useCallback(async () => {
    if ((!newMessage.trim() && selectedMedia.length === 0) || sending) {
      console.log("⚠️ Cannot send:", {
        hasMessage: !!newMessage.trim(),
        hasMedia: selectedMedia.length > 0,
        sending,
      });
      return;
    }

    if (!user?.id) {
      console.error("❌ No user ID");
      showThemedError("Error", "You must be logged in to send messages");
      return;
    }

    const messageContent = newMessage.trim();
    const mediaArray = [...selectedMedia];
    console.log("📤 Sending message:", {
      content: messageContent,
      chatType,
      djId,
      communityId,
      userId: user.id,
      isConnected,
      threadId,
      mediaCount: mediaArray.length,
    });

    setNewMessage("");
    setSelectedMedia([]);
    setSending(true);

    try {
    if (chatType === "individual" && djId) {
      if (await isMessagingBlockedWith(djId)) {
        showThemedError("Blocked", "You can't message this person.");
        return;
      }
      if (!threadId) {
        console.log("🔍 Thread ID not set, will resolve on send...");
      }

        const result = await sendIndividualChatMessages({
          supabase,
          db,
          userId: user.id,
          djId,
          threadId,
          messageContent,
          mediaArray,
        });

        if (!result.ok) {
          const err = result.error;
          if (err) {
            console.error("❌ Error sending message:", err);
            console.error("❌ Error details:", {
              code: err.code,
              message: err.message,
              hint: err.hint,
              details: err.details,
            });
            showThemedError(
              "Error",
              result.textAlreadySent
                ? `Your message sent, but the attachment failed: ${
                    err.message || "Unknown error"
                  }. Tap send again to retry just the attachment.`
                : `Failed to send message: ${err.message || "Unknown error"}`
            );
          }
          setNewMessage(result.rollback.messageContent);
          setSelectedMedia(result.rollback.mediaArray);
          // The text half of a partial failure already committed — reload
          // so it actually shows up instead of only appearing after some
          // unrelated later refresh.
          if (result.textAlreadySent) {
            setTimeout(() => loadMessages(), 300);
          }
          return;
        }

        if (result.threadId) {
          setThreadId(result.threadId);
        }

        if (mediaArray.length > 0) {
          console.log(`✅ ${mediaArray.length} media message(s) sent successfully`);
        } else if (messageContent) {
          console.log("✅ Text message sent successfully");
        }

        setTimeout(() => {
          loadMessages();
        }, 300);
      } else if (chatType === "group" && communityId) {
        const result = await sendGroupChatMessages({
          supabase,
          userId: user.id,
          communityId,
          messageContent,
          mediaArray,
        });

        if (!result.ok) {
          const err = result.error;
          console.error("❌ Error sending group messages:", err);
          console.error("❌ Error details:", {
            code: err?.code,
            message: err?.message,
            hint: err?.hint,
            details: err?.details,
          });
          showThemedError(
            "Error",
            result.textAlreadySent
              ? `Your message sent, but the attachment failed: ${
                  err?.message || "Unknown error"
                }. Tap send again to retry just the attachment.`
              : `Failed to send message: ${err?.message || "Unknown error"}`
          );
          setNewMessage(result.rollback.messageContent);
          setSelectedMedia(result.rollback.mediaArray);
          if (result.textAlreadySent) {
            setTimeout(() => loadMessages(), 300);
          }
          return;
        }

        if (mediaArray.length > 0) {
          console.log(
            `✅ ${mediaArray.length} group media message(s) sent successfully`
          );
        } else if (messageContent) {
          console.log("✅ Group text message sent successfully");
        }

        setTimeout(() => {
          loadMessages();
        }, 300);
      }
    } catch (error) {
      console.error("❌ Error in sendMessage:", error);
      console.error("❌ Error stack:", error.stack);
      showThemedError(
        "Error",
        `Failed to send message: ${error.message || "Unknown error"}`
      );
      setNewMessage(messageContent);
      setSelectedMedia(mediaArray);
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
    showThemedError,
  ]);

  // Format timestamp
  const formatTime = useCallback((timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return "now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return date.toLocaleDateString();
  }, []);

  const formatDaySeparator = useCallback((timestamp) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "";
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfThatDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    const diffDays = Math.round(
      (startOfToday.getTime() - startOfThatDay.getTime()) / (24 * 60 * 60 * 1000)
    );
    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: now.getFullYear() === date.getFullYear() ? undefined : "numeric",
    });
  }, []);

  const chatListRows = useMemo(() => {
    const rows = [];
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const msgTime = new Date(msg.timestamp).getTime();
      const prevTime = prev ? new Date(prev.timestamp).getTime() : null;
      const nextTime = next ? new Date(next.timestamp).getTime() : null;

      const isNewDay =
        !prev ||
        new Date(prev.timestamp).toDateString() !== new Date(msg.timestamp).toDateString();
      if (isNewDay) {
        rows.push({
          id: `sep-${msg.id}`,
          rowType: "separator",
          label: formatDaySeparator(msg.timestamp),
        });
      }

      const groupedWithPrev =
        !!prev &&
        prev.senderId === msg.senderId &&
        Math.abs(msgTime - (prevTime || 0)) < 5 * 60 * 1000;
      const groupedWithNext =
        !!next &&
        next.senderId === msg.senderId &&
        Math.abs((nextTime || 0) - msgTime) < 5 * 60 * 1000;

      rows.push({
        ...msg,
        showSenderHeader: !groupedWithPrev,
        showTimestamp: !groupedWithNext,
        isGrouped: groupedWithPrev,
      });
    }
    return rows;
  }, [messages, formatDaySeparator]);

  const handleOpportunityPress = useCallback((opp) => {
    setSelectedOpportunity(opp);
    setShowOpportunityModal(true);
  }, []);

  const renderMessageItem = useCallback(
    ({ item: message }) => (
      <MessageRow
        message={message}
        onLongPress={handleMessageLongPress}
        onOpportunityPress={handleOpportunityPress}
        setFullscreenImage={setFullscreenImage}
        onVideoPlay={handleVideoPlay}
        onAudioToggle={toggleAudioPlayback}
        onFileOpen={handleFileOpen}
        playingAudioId={playingAudioId}
        audioDurations={audioDurations}
        audioProgress={audioProgress}
        renderMessageText={renderMessageText}
        renderLinkPreviews={renderLinkPreviews}
        formatTime={formatTime}
        formatDuration={formatDuration}
        styles={styles}
      />
    ),
    [
      handleMessageLongPress,
      handleOpportunityPress,
      handleVideoPlay,
      toggleAudioPlayback,
      handleFileOpen,
      playingAudioId,
      audioDurations,
      audioProgress,
      renderMessageText,
      renderLinkPreviews,
      formatTime,
      formatDuration,
      styles,
    ]
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              HapticPatterns.backButton();
              navigation.goBack();
            }}
          >
            <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
          </TouchableOpacity>

          {chatType === "individual" && otherUser && (
            <TouchableOpacity
              style={styles.headerInfo}
              onPress={() => {
                HapticPatterns.buttonPress();
                if (navigation && otherUser.id) {
                  navigation.navigate("user-profile", { userId: otherUser.id });
                }
              }}
              activeOpacity={0.7}
            >
              <ProgressiveImage
                source={
                  otherUser.profile_image_url
                    ? { uri: otherUser.profile_image_url }
                    : require("../assets/rhood_logo.webp")
                }
                style={styles.headerAvatar}
                placeholder={
                  <View style={styles.headerAvatarPlaceholder} />
                }
                contentFit="cover"
              />
              <View style={styles.headerText}>
                <Text style={styles.headerName}>
                  {otherUser.dj_name || otherUser.full_name || otherUser.username || "DJ"}
                </Text>
                <View style={styles.headerMetaRow}>
                  <Text style={styles.headerLocation}>
                    {otherUser.location ||
                      otherUser.city ||
                      otherUser.country ||
                      "Unknown Location"}
                  </Text>
                  <Text style={styles.headerStatusToken}>
                    {isConnected ? "Online" : "Last seen recently"}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color="hsl(0, 0%, 65%)"
                style={styles.headerChevron}
              />
            </TouchableOpacity>
          )}

          {chatType === "individual" && loading && !otherUser && (
            <View style={styles.headerInfo} pointerEvents="none">
              <View style={styles.headerAvatarPlaceholder} />
              <View style={styles.headerText}>
                <Text style={styles.headerName} numberOfLines={1}>
                  …
                </Text>
                <Text style={styles.headerLocation}>Loading chat…</Text>
              </View>
            </View>
          )}

          {chatType === "group" && (communityData || communityNameParam || communityId) && (
            <TouchableOpacity
              style={styles.headerInfo}
              onPress={() => {
                HapticPatterns.buttonPress();
                const navId = communityData?.id || communityId;
                if (navigation && navId) {
                  navigation.navigate("community-members", {
                    communityId: navId,
                    communityName:
                      communityData?.name || communityNameParam || "Community",
                    returnToMessages: true,
                    messagesBackScreen: route?.params?.messagesBackScreen,
                    returnToConnectionsTab: route?.params?.returnToConnectionsTab,
                  });
                }
              }}
              activeOpacity={0.7}
            >
              <ProgressiveImage
                source={
                  communityData?.image_url
                    ? { uri: communityData.image_url }
                    : require("../assets/rhood_logo.webp")
                }
                style={styles.headerAvatar}
                placeholder={
                  <View style={styles.headerAvatarPlaceholder} />
                }
                contentFit="cover"
              />
              <View style={styles.headerText}>
                <Text style={styles.headerName} numberOfLines={1}>
                  {communityData?.name || communityNameParam || "Community"}
                </Text>
                <View style={styles.headerMetaRow}>
                  <Text style={styles.headerLocation}>
                    {loading && !communityData
                      ? "…"
                      : `${memberCount} member${memberCount !== 1 ? "s" : ""}`}
                  </Text>
                  <Text style={styles.headerStatusToken}>Group chat</Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color="hsl(0, 0%, 65%)"
                style={styles.headerChevron}
              />
            </TouchableOpacity>
          )}
        </View>

        {chatType === "individual" &&
        otherUser &&
        profileIsApprovedPromoter(otherUser) ? (
          <View style={styles.promoterStampBanner}>
            <ApprovedPromoterStamp compact />
          </View>
        ) : null}

        {/* Messages */}
        <FlatList
          ref={scrollViewRef}
          data={chatListRows}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={
            loading ? (
              <View style={styles.messagesInlineLoading}>
                <ActivityIndicator size="large" color="hsl(75, 100%, 60%)" />
                <Text style={styles.loadingText}>Loading messages…</Text>
              </View>
            ) : (
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
            )
          }
          renderItem={renderMessageItem}
          contentContainerStyle={[
            styles.messagesContent,
            { paddingBottom: scrollBottomPadding },
            (loading || messages.length === 0) && styles.messagesContentFlexGrow,
          ]}
          style={styles.messagesContainer}
          onScroll={(event) => {
            const { contentOffset, contentSize, layoutMeasurement } =
              event.nativeEvent;
            const threshold = 96;
            stickToBottomRef.current =
              contentOffset.y + layoutMeasurement.height >=
              contentSize.height - threshold;
          }}
          scrollEventThrottle={16}
          onContentSizeChange={() => {
            if (!stickToBottomRef.current) return;
            scrollViewRef.current?.scrollToEnd({ animated: false });
          }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={LIST_PERFORMANCE.INITIAL_NUM_TO_RENDER}
          maxToRenderPerBatch={LIST_PERFORMANCE.MAX_TO_RENDER_PER_BATCH}
          windowSize={21}
          removeClippedSubviews={false}
        />

        <MessagesSelectedMediaTray
          selectedMedia={selectedMedia}
          styles={styles}
          onRemoveMedia={handleRemoveMedia}
        />

        <MessagesMediaPickerModal
          visible={showMediaPicker}
          uploadingMedia={uploadingMedia}
          styles={styles}
          onClose={() => setShowMediaPicker(false)}
          onPickImage={handleImageUpload}
          onPickVideo={handleVideoUpload}
          onPickAudio={handleAudioUpload}
          onPickDocument={handleDocumentUpload}
        />

        <MessagesFullscreenImageModal
          uri={fullscreenImage}
          styles={styles}
          onClose={() => setFullscreenImage(null)}
        />

        <MessagesFullscreenVideoModal
          uri={fullscreenVideo}
          styles={styles}
          onClose={() => setFullscreenVideo(null)}
        />

        <MessagesInputFooter
          chatType={chatType}
          isConnected={isConnected}
          canCompose={chatType === "group" ? true : canCompose}
          connectionStatus={connectionStatus}
          messagesLoading={loading}
          bottomInputPadding={bottomInputPadding}
          styles={styles}
          navigation={navigation}
          replyingToMessage={replyingToMessage}
          onClearReply={() => setReplyingToMessage(null)}
          newMessage={newMessage}
          onChangeMessage={setNewMessage}
          selectedMediaCount={selectedMedia.length}
          sending={sending}
          onSend={sendMessage}
          onOpenMediaPicker={() => setShowMediaPicker(true)}
          uploadingMedia={uploadingMedia}
        />
      </Animated.View>

      <MessageActionsModal
        visible={showMessageOptionsModal}
        message={selectedMessageForOptions}
        styles={styles}
        onClose={() => setShowMessageOptionsModal(false)}
        onCopy={(m) => {
          handleCopyMessage(m);
          setShowMessageOptionsModal(false);
        }}
        onReply={handleReplyToMessage}
        onForward={async (m) => {
          await handleForwardMessage(m);
          setShowMessageOptionsModal(false);
        }}
        onPin={handlePinMessage}
        onUnsend={handleUnsendMessage}
        onDeleteForYou={handleDeleteForYou}
        onReport={(m) => {
          setShowMessageOptionsModal(false);
          promptReport({
            targetType: "message",
            targetId: m?.id,
            targetUserId: otherUser?.id || m?.sender_id,
          });
        }}
      />

      {/* Opportunity Details Modal */}
      <RhoodModal
        visible={showOpportunityModal}
        onClose={() => {
          setShowOpportunityModal(false);
          setSelectedOpportunity(null);
        }}
        type="info"
        title={selectedOpportunity?.title || "DJ Opportunity"}
        message={selectedOpportunity?.description || ""}
        eventDetails={
          selectedOpportunity
            ? {
                date: selectedOpportunity.date,
                time: selectedOpportunity.time,
                compensation: selectedOpportunity.compensation,
                location: selectedOpportunity.location,
                description: selectedOpportunity.description,
              }
            : null
        }
        primaryButtonText="Close"
        showCloseButton={true}
      />
      <RhoodModal
        visible={errorModal.visible}
        onClose={() => setErrorModal({ visible: false, title: "", message: "" })}
        type="error"
        title={errorModal.title || "Error"}
        message={errorModal.message || "Something went wrong."}
        primaryButtonText="OK"
        onPrimaryPress={() =>
          setErrorModal({ visible: false, title: "", message: "" })
        }
      />
      {tutorialModalProps ? (
        <AppScreenTutorialModal {...tutorialModalProps} />
      ) : null}
    </KeyboardAvoidingView>
  );
};

export default MessagesScreen;
