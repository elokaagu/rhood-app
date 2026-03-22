import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  StyleSheet,
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

const MessagesScreen = ({ user, navigation, route }) => {
  const { params } = route || {};
  const { djId, communityId, chatType = "individual" } = params || {};

  const insets = useSafeAreaInsets();

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

  // Refs
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const conversationKey = useMemo(
    () => `${djId ?? ""}|${communityId ?? ""}|${chatType}`,
    [djId, communityId, chatType]
  );
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
        Alert.alert("Cannot Open Link", sanitizedUrl);
      }
    } catch (error) {
      console.error("Error opening link:", error);
      Alert.alert("Link Error", "Unable to open this link right now.");
    }
  }, []);

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
    [handleUrlPress]
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
    [handleUrlPress, messageLinkPreviews]
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

  const handleDeleteForYou = useCallback(async (message) => {
    try {
      // Mark message as deleted for this user only
      // This would require a deleted_for_users column or similar
      Alert.alert(
        "Delete for you",
        "This message will be hidden from you but remain visible to others.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              // TODO: Implement delete for you in database
              setMessages((prev) => prev.filter((m) => m.id !== message.id));
              setShowMessageOptionsModal(false);
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error deleting message for you:", error);
      Alert.alert("Error", "Failed to delete message");
    }
  }, []);

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
    if (!user?.id) return;

    try {
      console.log("📥 Loading messages...", { chatType, djId, communityId });

      if (chatType === "individual" && djId) {
        const result = await loadIndividualThreadState({
          userId: user.id,
          djId,
          supabase,
          db,
        });

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
        setThreadId(p.threadId);
        console.log("🧵 Thread ID:", p.threadId);
        console.log("📨 Loaded messages:", p.messages.length);
        setMessages(p.messages);
        if (p.otherUser) {
          setOtherUser(p.otherUser);
        }
        setIsConnected(p.isConnected);
        setConnectionStatus(p.connectionStatus);
        setMemberCount(p.memberCount);
      } else if (chatType === "group" && communityId) {
        const result = await loadGroupThreadState({
          userId: user.id,
          communityId,
          supabase,
          db,
        });

        if (!result.ok) {
          return;
        }

        const p = result.payload;
        setMessages(p.messages);
        if (p.community) {
          setCommunityData(p.community);
        }
        setMemberCount(p.memberCount);
        setConnectionStatus(p.connectionStatus);
      }
    } catch (error) {
      console.error("❌ Error in loadMessages:", error);
      Alert.alert("Error", "Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, [user?.id, chatType, djId, communityId]);

  useMessagesRealtimeSubscription({
    userId: user?.id,
    chatType,
    threadId,
    communityId,
    loading,
    setMessages,
    scrollViewRef,
  });

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
      Alert.alert(
        "Image Upload Error",
        error.message || "Failed to pick images. Please try again."
      );
    } finally {
      setUploadingMedia(false);
    }
  }, []);

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
                Alert.alert(
                  "Audio Upload Error",
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
        Alert.alert(
          "Error",
          `Failed to handle file: ${error.message || "Unknown error"}`
        );
      }
    },
    [downloadFile]
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
      Alert.alert("Error", "You must be logged in to send messages");
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
            Alert.alert(
              "Error",
              `Failed to send message: ${err.message || "Unknown error"}`
            );
          }
          setNewMessage(result.rollback.messageContent);
          setSelectedMedia(result.rollback.mediaArray);
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
          Alert.alert(
            "Error",
            `Failed to send message: ${err?.message || "Unknown error"}`
          );
          setNewMessage(result.rollback.messageContent);
          setSelectedMedia(result.rollback.mediaArray);
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
      Alert.alert(
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

  const getMessageItemLayout = useCallback(
    (data, index) => ({
      length: LIST_PERFORMANCE.ESTIMATED_ROW_HEIGHT_MESSAGES,
      offset: LIST_PERFORMANCE.ESTIMATED_ROW_HEIGHT_MESSAGES * index,
      index,
    }),
    []
  );

  if (loading) {
    return (
      <View style={styles.container}>
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
                <Text style={styles.headerLocation}>
                  {otherUser.location ||
                    otherUser.city ||
                    otherUser.country ||
                    "Unknown Location"}
                </Text>
              </View>
            </TouchableOpacity>
          )}

          {chatType === "group" && communityData && (
            <TouchableOpacity
              style={styles.headerInfo}
              onPress={() => {
                HapticPatterns.buttonPress();
                if (navigation && communityData.id) {
                  navigation.navigate("community-members", {
                    communityId: communityData.id,
                    communityName: communityData.name,
                    returnToMessages: true,
                  });
                }
              }}
              activeOpacity={0.7}
            >
              <ProgressiveImage
                source={
                  communityData.image_url
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
                <Text style={styles.headerName}>{communityData.name}</Text>
                <Text style={styles.headerLocation}>
                  {memberCount} member{memberCount !== 1 ? "s" : ""}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Messages */}
        <FlatList
          ref={scrollViewRef}
          data={messages}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
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
          }
          renderItem={renderMessageItem}
          getItemLayout={getMessageItemLayout}
          contentContainerStyle={[
            styles.messagesContent,
            { paddingBottom: scrollBottomPadding },
          ]}
          style={styles.messagesContainer}
          onContentSizeChange={() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }}
          showsVerticalScrollIndicator={false}
          initialNumToRender={LIST_PERFORMANCE.INITIAL_NUM_TO_RENDER}
          maxToRenderPerBatch={LIST_PERFORMANCE.MAX_TO_RENDER_PER_BATCH}
          windowSize={LIST_PERFORMANCE.WINDOW_SIZE}
          removeClippedSubviews={LIST_PERFORMANCE.REMOVE_CLIPPED_SUBVIEWS}
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
          connectionStatus={connectionStatus}
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
  mediaBubble: {
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  mediaCaptionWrap: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
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
  messageLink: {
    textDecorationLine: "underline",
  },
  ownMessageLink: {
    color: "hsl(0, 0%, 0%)",
  },
  otherMessageLink: {
    color: "hsl(75, 100%, 60%)",
  },
  linkPreviewCard: {
    marginTop: 12,
    borderRadius: 16,
    overflow: "hidden",
    flexDirection: "row",
    alignItems: "stretch",
    minHeight: 96,
    borderWidth: 1,
  },
  ownLinkPreviewCard: {
    backgroundColor: "rgba(0, 0, 0, 0.08)",
    borderColor: "rgba(0, 0, 0, 0.15)",
  },
  otherLinkPreviewCard: {
    backgroundColor: "hsl(0, 0%, 18%)",
    borderColor: "hsl(75, 100%, 30%)",
  },
  linkPreviewImage: {
    width: 88,
    height: "100%",
    backgroundColor: "hsl(0, 0%, 12%)",
  },
  linkPreviewPlaceholder: {
    width: 88,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 12%)",
  },
  linkPreviewContent: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  linkPreviewSite: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    marginBottom: 2,
  },
  ownLinkPreviewSite: {
    color: "hsl(0, 0%, 25%)",
  },
  otherLinkPreviewSite: {
    color: "hsl(75, 85%, 70%)",
  },
  linkPreviewTitle: {
    fontSize: 14,
    fontFamily: "TS Block Bold",
    letterSpacing: 0.3,
  },
  ownLinkPreviewTitle: {
    color: "hsl(0, 0%, 5%)",
  },
  otherLinkPreviewTitle: {
    color: "hsl(0, 0%, 100%)",
  },
  linkPreviewDescription: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    marginTop: 4,
    lineHeight: 18,
  },
  ownLinkPreviewDescription: {
    color: "hsl(0, 0%, 25%)",
  },
  otherLinkPreviewDescription: {
    color: "hsl(0, 0%, 80%)",
  },
  linkPreviewUrl: {
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    marginTop: 8,
  },
  ownLinkPreviewUrl: {
    color: "hsl(0, 0%, 35%)",
  },
  otherLinkPreviewUrl: {
    color: "hsl(75, 85%, 70%)",
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
  replyIndicator: {
    backgroundColor: "hsl(0, 0%, 12%)",
    borderTopWidth: 1,
    borderTopColor: "hsl(0, 0%, 20%)",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  replyIndicatorContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  replyIndicatorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  replyIndicatorText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
    fontWeight: "500",
  },
  replyIndicatorClose: {
    padding: 4,
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
  selectedMediaContainer: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderTopWidth: 1,
    borderTopColor: "hsl(0, 0%, 20%)",
    paddingVertical: 12,
    maxHeight: 120,
  },
  selectedMediaContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  mediaPreviewContainer: {
    position: "relative",
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "hsl(0, 0%, 12%)",
  },
  mediaPreview: {
    width: "100%",
    height: "100%",
  },
  mediaPreviewImage: {
    width: "100%",
    height: "100%",
  },
  mediaPreviewVideo: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 15%)",
  },
  mediaPreviewFile: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 15%)",
    padding: 8,
  },
  mediaPreviewText: {
    textAlign: "center",
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
    position: "absolute",
    top: -6,
    right: -6,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "hsl(0, 0%, 30%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
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
    backgroundColor: "hsl(0, 0%, 0%)",
    borderRadius: 12,
    overflow: "hidden",
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: "hsl(0, 0%, 0%)",
    overflow: "hidden",
  },
  messageVideo: {
    position: "relative",
    width: 200,
    height: 150,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 4,
    backgroundColor: "hsl(0, 0%, 15%)",
  },
  messageVideoThumbnail: {
    width: "100%",
    height: "100%",
  },
  messageVideoFile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 15%)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 4,
    minWidth: 200,
    maxWidth: 280,
  },
  ownMessageVideoFile: {
    backgroundColor: "hsl(75, 100%, 60%)",
  },
  videoFileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "hsl(0, 0%, 20%)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  ownVideoFileIconContainer: {
    backgroundColor: "hsl(0, 0%, 100%)",
  },
  videoFileInfo: {
    flex: 1,
    marginRight: 8,
  },
  videoFileName: {
    color: "hsl(0, 0%, 100%)",
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
    marginBottom: 4,
  },
  ownVideoFileName: {
    color: "hsl(0, 0%, 0%)",
  },
  videoFileMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  videoFileMetaText: {
    color: "hsl(75, 85%, 70%)",
    fontSize: 12,
    fontFamily: "Helvetica Neue",
  },
  ownVideoFileMetaText: {
    color: "hsl(0, 0%, 40%)",
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
  videoPlayButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  messageAudio: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 15%)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    marginBottom: 4,
    minWidth: 200,
    maxWidth: 280,
  },
  ownMessageAudio: {
    backgroundColor: "hsl(75, 100%, 60%)",
  },
  audioPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "hsl(75, 100%, 60%)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  ownAudioPlayButton: {
    backgroundColor: "hsl(0, 0%, 100%)",
  },
  audioContent: {
    flex: 1,
  },
  audioProgressBar: {
    height: 3,
    backgroundColor: "hsl(0, 0%, 25%)",
    borderRadius: 2,
    marginBottom: 6,
    overflow: "hidden",
  },
  ownAudioProgressBar: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  audioProgressFill: {
    height: "100%",
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 2,
  },
  ownAudioProgressFill: {
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  audioInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  audioLabelContainer: {
    flex: 1,
    marginRight: 8,
  },
  audioLabel: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
    marginBottom: 2,
  },
  ownAudioLabel: {
    color: "hsl(0, 0%, 0%)",
  },
  otherAudioLabel: {
    color: "hsl(75, 100%, 60%)",
  },
  audioDuration: {
    fontSize: 11,
    fontFamily: "Helvetica Neue",
    fontWeight: "400",
  },
  ownAudioDuration: {
    color: "hsl(0, 0%, 40%)",
  },
  otherAudioDuration: {
    color: "hsl(0, 0%, 70%)",
  },
  messageFile: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 15%)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 4,
    maxWidth: 280,
    minWidth: 200,
  },
  ownMessageFile: {
    backgroundColor: "hsl(75, 100%, 60%)",
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: "hsl(0, 0%, 20%)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  ownFileIconContainer: {
    backgroundColor: "hsl(0, 0%, 100%)",
  },
  fileInfo: {
    flex: 1,
    marginRight: 8,
  },
  fileName: {
    color: "hsl(0, 0%, 100%)",
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
    marginBottom: 2,
  },
  ownFileName: {
    color: "hsl(0, 0%, 0%)",
  },
  fileSize: {
    color: "hsl(0, 0%, 60%)",
    fontSize: 12,
    fontFamily: "Helvetica Neue",
  },
  ownFileSize: {
    color: "hsl(0, 0%, 40%)",
  },
  downloadIcon: {
    marginLeft: 4,
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
  fullscreenVideoContainer: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullscreenVideo: {
    width: "100%",
    height: "100%",
  },
  fullscreenVideoCloseButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 20,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  // Message Options Modal Styles
  messageOptionsOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  messageOptionsContainer: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    maxHeight: "80%",
  },
  messageOptionsContent: {
    paddingVertical: 8,
  },
  messageOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 16,
  },
  messageOptionDestructive: {
    // Destructive options styling handled by text color
  },
  messageOptionText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "500",
  },
  messageOptionTextDestructive: {
    color: "hsl(0, 100%, 60%)",
  },
  messageOptionDivider: {
    height: 1,
    backgroundColor: "hsl(0, 0%, 20%)",
    marginVertical: 4,
    marginHorizontal: 20,
  },
  messageOptionsCancel: {
    marginTop: 8,
    marginHorizontal: 20,
    paddingVertical: 16,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "hsl(0, 0%, 20%)",
  },
  messageOptionsCancelText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
    fontWeight: "600",
  },
});

export default MessagesScreen;
