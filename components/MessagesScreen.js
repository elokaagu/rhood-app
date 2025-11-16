import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  Linking,
  Share,
  ActionSheetIOS,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { supabase, db } from "../lib/supabase";
import { multimediaService } from "../lib/multimediaService";
import ProgressiveImage from "./ProgressiveImage";
import { Audio, Video } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";
import * as WebBrowser from "expo-web-browser";

const URL_REGEX = /(https?:\/\/[^\s<>"']+)/gi;

const stripTrailingPunctuation = (url = "") =>
  url.replace(/[),.;!?]+$/g, "");

const extractUrls = (text = "") => {
  if (!text) return [];
  const matches = text.match(URL_REGEX);
  if (!matches) return [];
  return matches
    .map((match) => stripTrailingPunctuation(match.trim()))
    .filter(Boolean);
};

const resolveRelativeUrl = (maybeRelative = "", baseUrl = "") => {
  try {
    if (!maybeRelative) return "";
    const trimmed = maybeRelative.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("//")) {
      return `https:${trimmed}`;
    }
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }
    if (baseUrl) {
      const base = new URL(baseUrl);
      return new URL(trimmed, base).toString();
    }
    return trimmed;
  } catch (error) {
    console.warn("resolveRelativeUrl error", { maybeRelative, baseUrl, error });
    return trimmed || "";
  }
};

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
  const tabBarOverlayOffset = 96; // approximate height incl. shadow/rounding

  const bottomInputPadding = useMemo(() => {
    const BASE_PADDING = 12;
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
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [fullscreenVideo, setFullscreenVideo] = useState(null);
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [audioProgress, setAudioProgress] = useState({});
  const [audioDurations, setAudioDurations] = useState({});
  const [messageLinkPreviews, setMessageLinkPreviews] = useState({});

  // Refs
  const scrollViewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const channelRef = useRef(null);
  const audioSoundsRef = useRef({});
  const linkPreviewCacheRef = useRef({});

  const fetchLinkPreview = useCallback(async (rawUrl) => {
    if (!rawUrl) return null;

    let targetUrl = rawUrl.trim();
    if (!targetUrl) return null;
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = `https://${targetUrl}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(targetUrl, {
        method: "GET",
        headers: {
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "User-Agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn("Link preview request failed", {
          url: targetUrl,
          status: response.status,
        });
        return null;
      }

      const contentType = response.headers.get("content-type") || "";
      let hostname = targetUrl;
      try {
        hostname = new URL(targetUrl).hostname.replace(/^www\./i, "");
      } catch (error) {
        console.warn("Unable to parse URL hostname", { targetUrl, error });
      }

      if (contentType.startsWith("image/")) {
        return {
          url: targetUrl,
          title: hostname || targetUrl,
          description: "",
          image: targetUrl,
          siteName: hostname || targetUrl,
        };
      }

      const html = await response.text();
      const truncatedHtml = html.slice(0, 120000);

      const getMetaContent = (property) => {
        if (!property) return "";
        const propertyRegex = new RegExp(
          `<meta[^>]+property=["']${property}["'][^>]*content=["']([^"']+)["'][^>]*>`,
          "i"
        );
        const nameRegex = new RegExp(
          `<meta[^>]+name=["']${property}["'][^>]*content=["']([^"']+)["'][^>]*>`,
          "i"
        );
        const propertyMatch = truncatedHtml.match(propertyRegex);
        if (propertyMatch && propertyMatch[1]) return propertyMatch[1];
        const nameMatch = truncatedHtml.match(nameRegex);
        if (nameMatch && nameMatch[1]) return nameMatch[1];
        return "";
      };

      const getTitleTag = () => {
        const titleMatch = truncatedHtml.match(
          /<title[^>]*>([^<]*)<\/title>/i
        );
        if (titleMatch && titleMatch[1]) return titleMatch[1];
        return "";
      };

      const title =
        getMetaContent("og:title") ||
        getMetaContent("twitter:title") ||
        getTitleTag() ||
        hostname ||
        targetUrl;

      const description =
        getMetaContent("og:description") ||
        getMetaContent("twitter:description") ||
        getMetaContent("description") ||
        "";

      const siteName =
        getMetaContent("og:site_name") ||
        getMetaContent("twitter:site") ||
        hostname ||
        "";

      let imageUrl =
        getMetaContent("og:image:secure_url") ||
        getMetaContent("og:image:url") ||
        getMetaContent("og:image") ||
        getMetaContent("twitter:image") ||
        getMetaContent("twitter:image:src") ||
        "";

      imageUrl = resolveRelativeUrl(imageUrl, targetUrl);

      return {
        url: targetUrl,
        title: title.trim(),
        description: description.trim(),
        image: imageUrl,
        siteName: siteName.trim() || hostname || targetUrl,
      };
    } catch (error) {
      console.warn("Link preview fetch error", { url: rawUrl, error });
      return null;
    }
  }, []);

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
                  message.isOwn ? styles.ownMessageLink : styles.otherMessageLink,
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
                  isOwn
                    ? styles.ownLinkPreviewUrl
                    : styles.otherLinkPreviewUrl,
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
        setMessageLinkPreviews((prev) => {
          if (!prev[message.id]) return prev;
          const updated = { ...prev };
          delete updated[message.id];
          return updated;
        });
      } catch (error) {
        console.error("Error deleting message:", error);
        Alert.alert("Error", "Failed to delete this message. Please try again.");
      }
    },
    [supabase]
  );

  const handleMessageLongPress = useCallback(
    (message) => {
      if (!message) return;

      const promptDelete = () => {
        Alert.alert(
          "Delete message?",
          "This will remove the message for everyone.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: () => handleDeleteMessage(message),
            },
          ]
        );
      };

      if (Platform.OS === "ios") {
        const options = message.isOwn
          ? ["Cancel", "Forward", "Delete"]
          : ["Cancel", "Forward"];
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex: 0,
            destructiveButtonIndex: message.isOwn ? 2 : undefined,
          },
          (buttonIndex) => {
            if (buttonIndex === 0) return;
            if (buttonIndex === 1) {
              handleForwardMessage(message);
              return;
            }
            if (buttonIndex === 2 && message.isOwn) {
              promptDelete();
            }
          }
        );
      } else {
        const buttons = [
          {
            text: "Forward",
            onPress: () => handleForwardMessage(message),
          },
        ];

        if (message.isOwn) {
          buttons.push({
            text: "Delete",
            style: "destructive",
            onPress: promptDelete,
          });
        }

        buttons.push({ text: "Cancel", style: "cancel" });

        Alert.alert("Message options", undefined, buttons, {
          cancelable: true,
        });
      }
    },
    [handleForwardMessage, handleDeleteMessage]
  );

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
          urls: extractUrls(msg.content || ""),
          recordType: "direct",
          threadId: msg.thread_id,
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
          urls: extractUrls(msg.content || ""),
          recordType: "group",
          communityId: communityId,
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
              urls: extractUrls(payload.new.content || ""),
              recordType: "direct",
              threadId: payload.new.thread_id,
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
              urls: extractUrls(payload.new.content || ""),
              recordType: "group",
              communityId: payload.new.community_id,
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

  useEffect(() => {
    setMessageLinkPreviews({});
    linkPreviewCacheRef.current = {};
  }, [djId, communityId, chatType]);

  // Fade in animation
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (!messages.length) return;

    messages.forEach((message) => {
      if (!message?.urls?.length) return;

      message.urls.forEach((rawUrl) => {
        const normalizedUrl = stripTrailingPunctuation(rawUrl);
        if (!normalizedUrl) return;

        const cacheKey = `${message.id}|${normalizedUrl}`;
        if (linkPreviewCacheRef.current[cacheKey]) {
          return;
        }

        linkPreviewCacheRef.current[cacheKey] = "pending";

        fetchLinkPreview(normalizedUrl)
          .then((preview) => {
            if (!preview) {
              linkPreviewCacheRef.current[cacheKey] = null;
              return;
            }

            const previewData = {
              url: normalizedUrl,
              title: preview.title || normalizedUrl,
              description: preview.description || "",
              image: preview.image || "",
              siteName: preview.siteName || "",
            };

            linkPreviewCacheRef.current[cacheKey] = previewData;

            setMessageLinkPreviews((prev) => {
              const current = prev[message.id] || [];
              if (current.some((item) => item.url === previewData.url)) {
                return prev;
              }
              return {
                ...prev,
                [message.id]: [...current, previewData],
              };
            });
          })
          .catch((error) => {
            console.warn("Link preview lookup failed", {
              url: normalizedUrl,
              error,
            });
            linkPreviewCacheRef.current[cacheKey] = null;
          });
      });
    });
  }, [messages, fetchLinkPreview]);

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
    setSelectedMedia(null);
  }, []);

  // Format time helper for audio duration
  const formatDuration = useCallback((millis) => {
    if (!millis || isNaN(millis)) return "0:00";
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, []);

  // Handle audio message playback
  const toggleAudioPlayback = useCallback(
    async (messageId, audioUrl) => {
      try {
        console.log("🎵 Toggling audio playback:", { messageId, audioUrl });

        if (!audioUrl) {
          Alert.alert("Error", "Audio URL is missing");
          return;
        }

        if (playingAudioId === messageId) {
          // Pause current audio
          const sound = audioSoundsRef.current[messageId];
          if (sound) {
            await sound.pauseAsync();
            setPlayingAudioId(null);
            console.log("⏸️ Audio paused");
          }
        } else {
          // Stop any currently playing audio
          if (playingAudioId) {
            const currentSound = audioSoundsRef.current[playingAudioId];
            if (currentSound) {
              await currentSound.stopAsync();
              await currentSound.unloadAsync();
              delete audioSoundsRef.current[playingAudioId];
            }
          }

          // Configure audio mode for playback
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            staysActiveInBackground: true,
            playsInSilentModeIOS: true,
          });

          // Load and play new audio
          console.log("🔄 Loading audio from:", audioUrl);
          const { sound } = await Audio.Sound.createAsync(
            { uri: audioUrl },
            { shouldPlay: true }
          );

          audioSoundsRef.current[messageId] = sound;
          setPlayingAudioId(messageId);
          console.log("▶️ Audio started playing");

          // Get duration
          const status = await sound.getStatusAsync();
          if (status.isLoaded && status.durationMillis) {
            console.log("📊 Audio duration:", status.durationMillis);
            setAudioDurations((prev) => ({
              ...prev,
              [messageId]: status.durationMillis,
            }));
          }

          // Track progress
          sound.setOnPlaybackStatusUpdate((status) => {
            if (status.isLoaded) {
              setAudioProgress((prev) => ({
                ...prev,
                [messageId]: status.positionMillis || 0,
              }));

              if (status.didJustFinish) {
                console.log("✅ Audio finished");
                setPlayingAudioId((prev) => (prev === messageId ? null : prev));
                sound.unloadAsync();
                delete audioSoundsRef.current[messageId];
                setAudioProgress((prev) => ({
                  ...prev,
                  [messageId]: 0,
                }));
              }
            }
          });
        }
      } catch (error) {
        console.error("❌ Error playing audio:", error);
        console.error("❌ Error details:", {
          message: error.message,
          code: error.code,
          audioUrl: audioUrl,
        });
        Alert.alert(
          "Error",
          `Failed to play audio: ${error.message || "Unknown error"}`
        );
      }
    },
    [playingAudioId]
  );

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

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      Object.values(audioSoundsRef.current).forEach(async (sound) => {
        try {
          await sound.unloadAsync();
        } catch (error) {
          console.error("Error cleaning up audio:", error);
        }
      });
    };
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
      keyboardVerticalOffset={keyboardVerticalOffset}
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
          contentContainerStyle={[
            styles.messagesContent,
            { paddingBottom: scrollBottomPadding },
          ]}
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
                <Pressable
                  style={[
                    styles.messageBubble,
                    message.isOwn ? styles.ownBubble : styles.otherBubble,
                  ]}
                  onLongPress={() => handleMessageLongPress(message)}
                  delayLongPress={250}
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
                        <TouchableOpacity
                          onPress={() => handleVideoPlay(message.mediaUrl)}
                          activeOpacity={0.9}
                        >
                          <View style={styles.messageVideo}>
                            {message.thumbnailUrl ? (
                              <Image
                                source={{ uri: message.thumbnailUrl }}
                                style={styles.messageVideoThumbnail}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.videoPlaceholder}>
                                <Ionicons
                                  name="play-circle"
                                  size={64}
                                  color="hsl(75, 100%, 60%)"
                                />
                                {message.mediaFilename && (
                                  <Text style={styles.videoPlaceholderText}>
                                    {message.mediaFilename}
                                  </Text>
                                )}
                              </View>
                            )}
                            <View style={styles.videoPlayOverlay}>
                              <View style={styles.videoPlayButton}>
                                <Ionicons
                                  name="play"
                                  size={32}
                                  color="hsl(0, 0%, 100%)"
                                />
                              </View>
                            </View>
                          </View>
                        </TouchableOpacity>
                      )}
                      {message.messageType === "audio" && (
                        <View
                          style={[
                            styles.messageAudio,
                            message.isOwn && styles.ownMessageAudio,
                          ]}
                        >
                          <TouchableOpacity
                            style={[
                              styles.audioPlayButton,
                              message.isOwn && styles.ownAudioPlayButton,
                            ]}
                            onPress={() =>
                              toggleAudioPlayback(message.id, message.mediaUrl)
                            }
                          >
                            <Ionicons
                              name={
                                playingAudioId === message.id ? "pause" : "play"
                              }
                              size={20}
                              color={
                                message.isOwn
                                  ? "hsl(0, 0%, 0%)"
                                  : "hsl(0, 0%, 0%)"
                              }
                            />
                          </TouchableOpacity>
                          <View style={styles.audioContent}>
                            <View
                              style={[
                                styles.audioProgressBar,
                                message.isOwn && styles.ownAudioProgressBar,
                              ]}
                            >
                              <View
                                style={[
                                  styles.audioProgressFill,
                                  message.isOwn && styles.ownAudioProgressFill,
                                  {
                                    width: `${
                                      audioDurations[message.id] &&
                                      audioProgress[message.id]
                                        ? Math.min(
                                            100,
                                            (audioProgress[message.id] /
                                              audioDurations[message.id]) *
                                              100
                                          )
                                        : 0
                                    }%`,
                                  },
                                ]}
                              />
                            </View>
                            <View style={styles.audioInfoRow}>
                              <View style={styles.audioLabelContainer}>
                                {message.mediaFilename && (
                                  <Text
                                    style={[
                                      styles.audioLabel,
                                      message.isOwn
                                        ? styles.ownAudioLabel
                                        : styles.otherAudioLabel,
                                    ]}
                                    numberOfLines={1}
                                  >
                                    {message.mediaFilename.replace(
                                      /\.[^/.]+$/,
                                      ""
                                    )}
                                  </Text>
                                )}
                                <Text
                                  style={[
                                    styles.audioDuration,
                                    message.isOwn
                                      ? styles.ownAudioDuration
                                      : styles.otherAudioDuration,
                                  ]}
                                >
                                  {playingAudioId === message.id
                                    ? formatDuration(
                                        audioProgress[message.id] || 0
                                      )
                                    : "0:00"}{" "}
                                  /{" "}
                                  {formatDuration(
                                    audioDurations[message.id] || 0
                                  )}
                                </Text>
                              </View>
                            </View>
                          </View>
                        </View>
                      )}
                      {message.messageType !== "image" &&
                        message.messageType !== "video" &&
                        message.messageType !== "audio" &&
                        message.mediaUrl && (
                          <TouchableOpacity
                            style={[
                              styles.messageFile,
                              message.isOwn && styles.ownMessageFile,
                            ]}
                            onPress={() =>
                              handleFileOpen(
                                message.mediaUrl,
                                message.mediaFilename,
                                message.mediaMimeType
                              )
                            }
                            activeOpacity={0.7}
                          >
                            <View
                              style={[
                                styles.fileIconContainer,
                                message.isOwn && styles.ownFileIconContainer,
                              ]}
                            >
                              <Ionicons
                                name={multimediaService.getFileIcon(
                                  message.fileExtension
                                )}
                                size={28}
                                color={
                                  message.isOwn
                                    ? "hsl(0, 0%, 0%)"
                                    : "hsl(75, 100%, 60%)"
                                }
                              />
                            </View>
                            <View style={styles.fileInfo}>
                              <Text
                                style={[
                                  styles.fileName,
                                  message.isOwn && styles.ownFileName,
                                ]}
                              >
                                {message.mediaFilename || "Attachment"}
                              </Text>
                              <Text
                                style={[
                                  styles.fileSize,
                                  message.isOwn && styles.ownFileSize,
                                ]}
                              >
                                {message.mediaSize
                                  ? multimediaService.formatFileSize(
                                      message.mediaSize
                                    )
                                  : message.mediaMimeType || ""}
                              </Text>
                            </View>
                            <Ionicons
                              name="download-outline"
                              size={20}
                              color={
                                message.isOwn
                                  ? "hsl(0, 0%, 0%)"
                                  : "hsl(75, 100%, 60%)"
                              }
                              style={styles.downloadIcon}
                            />
                          </TouchableOpacity>
                        )}
                    </View>
                  ) : null}
                  {renderMessageText(message)}
                  {renderLinkPreviews(message)}
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
                </Pressable>
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

        {/* Fullscreen Video Player Modal */}
        <Modal
          visible={!!fullscreenVideo}
          transparent={false}
          animationType="fade"
          onRequestClose={() => setFullscreenVideo(null)}
        >
          <View style={styles.fullscreenVideoContainer}>
            <TouchableOpacity
              style={styles.fullscreenVideoCloseButton}
              onPress={() => setFullscreenVideo(null)}
            >
              <Ionicons name="close" size={32} color="hsl(0, 0%, 100%)" />
            </TouchableOpacity>
            {fullscreenVideo && (
              <Video
                source={{ uri: fullscreenVideo }}
                style={styles.fullscreenVideo}
                useNativeControls={true}
                resizeMode={Video.RESIZE_MODE_CONTAIN}
                shouldPlay={true}
                isLooping={false}
                onError={(error) => {
                  console.error("Video playback error:", error);
                  Alert.alert("Error", "Failed to play video");
                  setFullscreenVideo(null);
                }}
              />
            )}
          </View>
        </Modal>

        {/* Input */}
        {chatType === "individual" && !isConnected ? (
          <View
            style={[styles.inputContainer, { paddingBottom: bottomInputPadding }]}
          >
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
          <View
            style={[styles.inputContainer, { paddingBottom: bottomInputPadding }]}
          >
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
    fontFamily: "TS-Block-Bold",
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
    fontFamily: "TS-Block-Bold",
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
    fontFamily: "TS-Block-Bold",
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
    backgroundColor: "hsl(0, 0%, 15%)",
  },
  messageVideoThumbnail: {
    width: "100%",
    height: "100%",
  },
  videoPlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 15%)",
    borderRadius: 12,
  },
  videoPlaceholderText: {
    color: "hsl(75, 100%, 60%)",
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    marginTop: 8,
    paddingHorizontal: 8,
    textAlign: "center",
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
});

export default MessagesScreen;
