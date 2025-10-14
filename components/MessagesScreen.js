import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  PanResponder,
  Alert,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RhoodModal from "./RhoodModal";
import { connectionsService } from "../lib/connectionsService";
import { supabase } from "../lib/supabase";
import { SkeletonMessage } from "./Skeleton";

// All data comes from database

export default function MessagesScreen({ user: propUser, navigation, route }) {
  const {
    isGroupChat = false,
    djId = "cc00a0ac-9163-4c30-b123-81cc06046e8b", // Default to a valid UUID
    communityId,
    communityName,
  } = route.params || {};
  console.log("📱 MessagesScreen loaded with params:", {
    isGroupChat,
    djId,
    communityId,
    communityName,
  });

  // State for messages and posts
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [forumPosts, setForumPosts] = useState([]);

  // Community data state
  const [communityData, setCommunityData] = useState(null);
  const [memberCount, setMemberCount] = useState(0);

  // State for CRUD operations
  const [editingMessage, setEditingMessage] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [editText, setEditText] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadedMessageIds, setLoadedMessageIds] = useState(new Set());

  // Custom modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Real-time messaging state
  const [currentUser, setCurrentUser] = useState(propUser); // Use prop user as initial state
  const [otherUser, setOtherUser] = useState(null);
  const [threadId, setThreadId] = useState(null);
  const [subscription, setSubscription] = useState(null);

  // currentDJ will be loaded from database

  // Storage keys
  const MESSAGES_KEY = `messages_${djId}`;
  const FORUM_POSTS_KEY = "forum_posts";

  // Load data on component mount
  useEffect(() => {
    initializeMessaging();
  }, [djId]);

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [subscription]);

  const initializeMessaging = async () => {
    try {
      setIsLoading(true);

      // Use prop user first, then try to fetch if not available
      let user = propUser;

      if (!user) {
        console.log("No user prop provided, attempting to fetch user...");

        // Add a small delay to ensure auth state is fully initialized
        await new Promise((resolve) => setTimeout(resolve, 100));

        try {
          const {
            data: { user: currentUser },
            error: userError,
          } = await supabase.auth.getUser();
          if (userError) {
            console.log("getUser error:", userError);
          } else {
            user = currentUser;
          }
        } catch (getUserError) {
          console.log("getUser failed:", getUserError);
        }

        // If getUser didn't work, try getSession
        if (!user) {
          try {
            const {
              data: { session },
              error: sessionError,
            } = await supabase.auth.getSession();
            if (sessionError) {
              console.log("getSession error:", sessionError);
            } else if (session?.user) {
              user = session.user;
            }
          } catch (getSessionError) {
            console.log("getSession failed:", getSessionError);
          }
        }
      }

      if (!user) {
        console.log("❌ No user found - user might not be authenticated");
        Alert.alert("Error", "Please log in to send messages");
        return;
      }

      console.log("✅ User found:", user.id);
      setCurrentUser(user);

      if (isGroupChat && communityId) {
        // Initialize group chat
        await initializeGroupChat();
      } else {
        // Initialize 1-on-1 chat
        await initializeDirectChat();
      }
    } catch (error) {
      console.error("Error initializing messaging:", error);
      Alert.alert("Error", "Failed to load messages");
      // Show empty state instead of mock data
      setMessages([]);
      setForumPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCommunityData = async () => {
    try {
      if (!communityId) return;

      // Load community information
      const { data: community, error: communityError } = await supabase
        .from("communities")
        .select("*")
        .eq("id", communityId)
        .single();

      if (communityError) {
        console.warn("Error loading community:", communityError);
        // Use fallback data
        setCommunityData({
          name: communityName || "R/HOOD Community",
          description: "A community for music lovers",
          image_url: null,
        });
      } else {
        setCommunityData(community);
      }

      // Load member count
      const { count, error: countError } = await supabase
        .from("community_members")
        .select("*", { count: "exact", head: true })
        .eq("community_id", communityId);

      if (countError) {
        console.warn("Error loading member count:", countError);
        setMemberCount(0);
      } else {
        setMemberCount(count || 0);
      }
    } catch (error) {
      console.error("Error loading community data:", error);
      // Set fallback data
      setCommunityData({
        name: communityName || "R/HOOD Community",
        description: "A community for music lovers",
        image_url: null,
      });
      setMemberCount(0);
    }
  };

  const loadCommunityPosts = async () => {
    try {
      if (!communityId) return;

      // Load community forum posts
      const { data: posts, error: postsError } = await supabase
        .from("community_posts")
        .select(
          `
          *,
          author:user_profiles!community_posts_author_id_fkey(
            id,
            dj_name,
            full_name,
            profile_image_url
          )
        `
        )
        .eq("community_id", communityId)
        .order("created_at", { ascending: false });

      if (postsError) {
        console.warn("Error loading community posts:", postsError);
        setForumPosts([]);
      } else {
        // Transform posts to match expected format
        const transformedPosts = (posts || []).map((post) => ({
          id: post.id,
          author:
            post.author?.dj_name || post.author?.full_name || "Unknown User",
          username: `@${post.author?.dj_name?.toLowerCase() || "user"}`,
          avatar:
            post.author?.profile_image_url ||
            "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
          timestamp: new Date(post.created_at),
          content: post.content,
          likes: post.likes || 0,
          replies: post.replies || 0,
          isPinned: post.is_pinned || false,
          tags: post.tags || [],
          isCurrentUser: post.author_id === currentUser?.id,
          isLiked: post.is_liked || false,
          isEdited: post.is_edited || false,
        }));

        setForumPosts(transformedPosts);
      }
    } catch (error) {
      console.error("Error loading community posts:", error);
      setForumPosts([]);
    }
  };

  const initializeGroupChat = async () => {
    try {
      // Load community data first
      await loadCommunityData();

      // Check if user is a member of the community
      const isMember = await connectionsService.isCommunityMember(communityId);
      if (!isMember) {
        Alert.alert(
          "Not a Member",
          "You need to join this community to participate in the chat"
        );
        return;
      }

      // Load group messages
      const groupMessages = await connectionsService.getGroupMessages(
        communityId
      );
      setMessages(groupMessages);

      // Load community forum posts
      await loadCommunityPosts();

      // Subscribe to group messages
      const newSubscription = connectionsService.subscribeToGroupMessages(
        communityId,
        (payload) => {
          console.log("New group message received:", payload);
          if (payload.eventType === "INSERT") {
            setMessages((prev) => [...prev, payload.new]);
          }
        }
      );

      setSubscription(newSubscription);
    } catch (error) {
      console.error("Error initializing group chat:", error);
      throw error;
    }
  };

  const initializeDirectChat = async () => {
    try {
      // Get other user's profile
      const { data: otherUserProfile, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", djId)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
        // No profile found
        setOtherUser({
          id: djId,
          dj_name: "Unknown User",
          profile_image_url: null,
        });
      } else if (otherUserProfile) {
        setOtherUser(otherUserProfile);
      } else {
        // No profile found
        console.log("No user profile found");
        setOtherUser({
          id: djId,
          dj_name: "Unknown User",
          profile_image_url: null,
        });
      }

      // Get or create message thread
      const thread = await connectionsService.getOrCreateThread(djId);
      setThreadId(thread.id);

      // Load existing messages
      const existingMessages = await connectionsService.getMessages(thread.id);
      setMessages(existingMessages);

      // Mark messages as read
      await connectionsService.markMessagesAsRead(thread.id);

      // Subscribe to new messages
      const newSubscription = connectionsService.subscribeToMessages(
        thread.id,
        (payload) => {
          console.log("New message received:", payload);
          if (payload.eventType === "INSERT") {
            setMessages((prev) => [...prev, payload.new]);
          }
        }
      );

      setSubscription(newSubscription);
    } catch (error) {
      console.error("Error initializing direct chat:", error);
      throw error;
    }
  };

  // Data persistence functions
  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load messages
      const savedMessages = await AsyncStorage.getItem(MESSAGES_KEY);
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages).map((msg) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(parsedMessages);
      } else {
        setMessages([]);
      }

      // Load forum posts
      const savedPosts = await AsyncStorage.getItem(FORUM_POSTS_KEY);
      if (savedPosts) {
        const parsedPosts = JSON.parse(savedPosts).map((post) => ({
          ...post,
          timestamp: new Date(post.timestamp),
        }));
        setForumPosts(parsedPosts);
      } else {
        setForumPosts([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      // Show empty state instead of mock data
      setMessages([]);
      setForumPosts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveMessages = async (newMessages) => {
    try {
      await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(newMessages));
    } catch (error) {
      console.error("Error saving messages:", error);
    }
  };

  const saveForumPosts = async (newPosts) => {
    try {
      await AsyncStorage.setItem(FORUM_POSTS_KEY, JSON.stringify(newPosts));
    } catch (error) {
      console.error("Error saving forum posts:", error);
    }
  };

  // CRUD Operations for Messages
  const createMessage = async (text) => {
    if (!currentUser) {
      Alert.alert("Error", "Unable to send message. Please try again.");
      return;
    }

    try {
      if (isGroupChat && communityId) {
        // Send group message
        const message = await connectionsService.sendGroupMessage(
          communityId,
          text.trim()
        );

        // Add message optimistically for better UX
        const optimisticMessage = {
          id: message.id,
          community_id: communityId,
          sender_id: currentUser.id,
          content: text.trim(),
          created_at: new Date().toISOString(),
          sender: {
            id: currentUser.id,
            dj_name: currentUser.user_metadata?.dj_name || "You",
            full_name: currentUser.user_metadata?.full_name || "You",
            profile_image_url: currentUser.user_metadata?.profile_image_url,
          },
        };

        setMessages((prev) => [...prev, optimisticMessage]);
      } else {
        // Send direct message
        if (!otherUser || !threadId) {
          Alert.alert("Error", "Unable to send message. Please try again.");
          return;
        }

        const message = await connectionsService.sendMessage(
          otherUser.id,
          text.trim()
        );

        // Add message optimistically for better UX
        const optimisticMessage = {
          id: message.id,
          sender_id: currentUser.id,
          receiver_id: otherUser.id,
          content: text.trim(),
          created_at: new Date().toISOString(),
          is_read: false,
          thread_id: threadId,
          sender: {
            id: currentUser.id,
            dj_name: currentUser.user_metadata?.dj_name || "You",
            full_name: currentUser.user_metadata?.full_name || "You",
            profile_image_url: currentUser.user_metadata?.profile_image_url,
          },
        };

        setMessages((prev) => [...prev, optimisticMessage]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message");
    }
  };

  const updateMessage = (messageId, newText) => {
    const updatedMessages = messages.map((msg) =>
      msg.id === messageId
        ? { ...msg, text: newText.trim(), isEdited: true, editedAt: new Date() }
        : msg
    );
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
  };

  const deleteMessage = (messageId) => {
    setDeleteTarget({ type: "message", id: messageId });
    setShowDeleteModal(true);
  };

  const deletePost = (postId) => {
    setDeleteTarget({ type: "post", id: postId });
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      if (deleteTarget.type === "message") {
        const updatedMessages = messages.filter(
          (msg) => msg.id !== deleteTarget.id
        );
        setMessages(updatedMessages);
        saveMessages(updatedMessages);
      } else if (deleteTarget.type === "post") {
        const updatedPosts = forumPosts.filter(
          (post) => post.id !== deleteTarget.id
        );
        setForumPosts(updatedPosts);
        saveForumPosts(updatedPosts);
      }
    }
    setShowDeleteModal(false);
    setDeleteTarget(null);
  };

  // CRUD Operations for Forum Posts
  const createPost = async (content) => {
    if (!currentUser || !communityId) {
      Alert.alert("Error", "Unable to create post. Please try again.");
      return;
    }

    try {
      // Create post in database
      const { data: newPost, error: postError } = await supabase
        .from("community_posts")
        .insert({
          community_id: communityId,
          author_id: currentUser.id,
          content: content.trim(),
          likes: 0,
          replies: 0,
          is_pinned: false,
          tags: [],
        })
        .select(
          `
          *,
          author:user_profiles!community_posts_author_id_fkey(
            id,
            dj_name,
            full_name,
            profile_image_url
          )
        `
        )
        .single();

      if (postError) throw postError;

      // Transform to match expected format
      const transformedPost = {
        id: newPost.id,
        author: newPost.author?.dj_name || newPost.author?.full_name || "You",
        username: `@${newPost.author?.dj_name?.toLowerCase() || "user"}`,
        avatar:
          newPost.author?.profile_image_url ||
          "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
        timestamp: new Date(newPost.created_at),
        content: newPost.content,
        likes: newPost.likes || 0,
        replies: newPost.replies || 0,
        isPinned: newPost.is_pinned || false,
        tags: newPost.tags || [],
        isCurrentUser: true,
        isLiked: false,
        isEdited: false,
      };

      // Add to local state
      setForumPosts((prev) => [transformedPost, ...prev]);
      return transformedPost;
    } catch (error) {
      console.error("Error creating post:", error);
      Alert.alert("Error", "Failed to create post");
    }
  };

  const updatePost = (postId, newContent) => {
    const updatedPosts = forumPosts.map((post) =>
      post.id === postId
        ? {
            ...post,
            content: newContent.trim(),
            isEdited: true,
            editedAt: new Date(),
          }
        : post
    );
    setForumPosts(updatedPosts);
    saveForumPosts(updatedPosts);
  };

  const likePost = (postId) => {
    const updatedPosts = forumPosts.map((post) =>
      post.id === postId
        ? {
            ...post,
            likes: post.likes + (post.isLiked ? -1 : 1),
            isLiked: !post.isLiked,
          }
        : post
    );
    setForumPosts(updatedPosts);
    saveForumPosts(updatedPosts);
  };

  // Edit modal functions
  const openEditModal = (item, type) => {
    if (type === "message") {
      setEditingMessage(item);
      setEditText(item.text);
    } else {
      setEditingPost(item);
      setEditText(item.content);
    }
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setEditingMessage(null);
    setEditingPost(null);
    setEditText("");
  };

  const saveEdit = () => {
    if (!editText.trim()) return;

    if (editingMessage) {
      updateMessage(editingMessage.id, editText);
    } else if (editingPost) {
      updatePost(editingPost.id, editText);
    }

    closeEditModal();
  };

  // Utility Functions
  const formatTime = (date) => {
    // Format as actual time (e.g., "2:30 PM" or "14:30")
    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Event Handlers
  const handleSendMessage = () => {
    if (!newMessage.trim()) {
      return;
    }
    createMessage(newMessage);
    setNewMessage("");
    Keyboard.dismiss(); // Dismiss keyboard after sending
  };

  const handlePostToForum = async () => {
    if (!newPost.trim()) return;
    await createPost(newPost);
    setNewPost("");
    Keyboard.dismiss(); // Dismiss keyboard after posting
  };

  const handleLike = (postId) => {
    likePost(postId);
  };

  // Gesture handling for messages
  const handleMessagePress = (message) => {
    if (message.isCurrentUser) {
      // Long press to show edit/delete options
      Alert.alert(
        "Message Options",
        "What would you like to do with this message?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Edit", onPress: () => openEditModal(message, "message") },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteMessage(message.id),
          },
        ]
      );
    }
  };

  const handleMessageSwipeLeft = (message) => {
    if (message.isCurrentUser) {
      // Swipe left to delete
      Alert.alert(
        "Delete Message",
        "Are you sure you want to delete this message?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => deleteMessage(message.id),
          },
        ]
      );
    }
  };

  const handleMessageSwipeRight = (message) => {
    if (message.isCurrentUser) {
      // Swipe right to edit
      openEditModal(message, "message");
    }
  };

  // Animated Message Component
  const AnimatedMessage = ({ message, isCurrentUser }) => {
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(20)).current;

    useEffect(() => {
      if (loadedMessageIds.has(message.id)) {
        // Already loaded, show immediately
        fadeAnim.setValue(1);
        slideAnim.setValue(0);
      } else {
        // New message, animate in
        setLoadedMessageIds((prev) => new Set([...prev, message.id]));

        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [message.id]);

    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 10 || Math.abs(gestureState.dy) > 10;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > 50) {
          // Swipe right - edit
          handleMessageSwipeRight(message);
        } else if (gestureState.dx < -50) {
          // Swipe left - delete
          handleMessageSwipeLeft(message);
        }
      },
    });

    return (
      <Animated.View
        style={[
          styles.messageContainer,
          isCurrentUser ? styles.messageRight : styles.messageLeft,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isCurrentUser
              ? styles.messageBubbleRight
              : styles.messageBubbleLeft,
          ]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            onPress={() => handleMessagePress(message)}
            onLongPress={() => handleMessagePress(message)}
            activeOpacity={0.7}
            style={styles.messageTouchable}
          >
            {/* Sender name for messages from other users */}
            {!isCurrentUser && (
              <Text style={styles.senderName}>
                {message.sender?.dj_name ||
                  message.sender?.full_name ||
                  "Unknown User"}
              </Text>
            )}

            <Text
              style={[
                styles.messageText,
                isCurrentUser
                  ? styles.messageTextRight
                  : styles.messageTextLeft,
              ]}
            >
              {message.content}
            </Text>
            <View style={styles.messageFooter}>
              <Text
                style={[
                  styles.messageTime,
                  isCurrentUser
                    ? styles.messageTimeRight
                    : styles.messageTimeLeft,
                ]}
              >
                {formatTime(new Date(message.created_at))}
                {message.is_edited && " (edited)"}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  // Group Forum Interface
  const renderGroupForum = () => (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <View style={styles.groupIcon}>
              <Image
                source={
                  communityData?.image_url
                    ? { uri: communityData.image_url }
                    : require("../assets/rhood_logo.webp")
                }
                style={styles.groupLogo}
                resizeMode="contain"
                onError={(error) => {
                  console.log("Community image load error:", error);
                }}
              />
            </View>

            <View style={styles.groupDetails}>
              <Text style={styles.groupTitle}>
                {communityData?.name || communityName || "R/HOOD Community"}
              </Text>
              <Text style={styles.groupSubtitle}>
                {memberCount} {memberCount === 1 ? "member" : "members"} •{" "}
                {communityId ? "Community Chat" : "Community Forum"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Forum Posts */}
      <ScrollView
        style={styles.postsContainer}
        showsVerticalScrollIndicator={false}
      >
        {forumPosts.map((post) => (
          <View key={post.id} style={styles.postCard}>
            {/* Post Header */}
            <View style={styles.postHeader}>
              <Image
                source={{ uri: post.avatar }}
                style={styles.postAvatar}
                resizeMode="cover"
                onError={(error) => {
                  console.log("Post avatar load error:", error);
                  // Fallback to initials if image fails
                }}
              />

              <View style={styles.postAuthor}>
                <View style={styles.postAuthorRow}>
                  <Text style={styles.postAuthorName}>{post.author}</Text>
                  {post.isPinned && (
                    <Ionicons name="pin" size={12} color="hsl(75, 100%, 60%)" />
                  )}
                </View>
                <Text style={styles.postUsername}>
                  {post.username} • {formatTime(post.timestamp)}
                </Text>
              </View>
            </View>

            {/* Post Content */}
            <Text style={styles.postContent}>{post.content}</Text>
            {post.isEdited && <Text style={styles.editedText}>(edited)</Text>}

            {/* Tags */}
            {post.tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {post.tags.map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>#{tag}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Post Actions */}
            <View style={styles.postActions}>
              <TouchableOpacity
                style={[
                  styles.postAction,
                  post.isLiked && styles.postActionLiked,
                ]}
                onPress={() => handleLike(post.id)}
              >
                <Ionicons
                  name={post.isLiked ? "thumbs-up" : "thumbs-up-outline"}
                  size={16}
                  color={
                    post.isLiked ? "hsl(75, 100%, 60%)" : "hsl(0, 0%, 70%)"
                  }
                />
                <Text
                  style={[
                    styles.postActionText,
                    post.isLiked && styles.postActionTextLiked,
                  ]}
                >
                  {post.likes}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.postAction}>
                <Ionicons
                  name="chatbubble-outline"
                  size={16}
                  color="hsl(0, 0%, 70%)"
                />
                <Text style={styles.postActionText}>{post.replies}</Text>
              </TouchableOpacity>

              {post.isCurrentUser && (
                <>
                  <TouchableOpacity
                    style={styles.postAction}
                    onPress={() => openEditModal(post, "post")}
                  >
                    <Ionicons
                      name="create-outline"
                      size={16}
                      color="hsl(0, 0%, 70%)"
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.postAction}
                    onPress={() => deletePost(post.id)}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color="hsl(0, 0%, 70%)"
                    />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* New Post Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={newPost}
            onChangeText={setNewPost}
            placeholder="Share with the community..."
            placeholderTextColor="hsl(0, 0%, 50%)"
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !newPost.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handlePostToForum}
            disabled={!newPost.trim()}
          >
            <Ionicons name="send" size={20} color="hsl(0, 0%, 100%)" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Direct Message Interface
  const renderDirectMessage = () => (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <View style={styles.djImageContainer}>
              <Image
                source={{
                  uri:
                    otherUser?.profile_image_url ||
                    "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop&crop=face",
                }}
                style={styles.djImage}
                resizeMode="cover"
                onError={(error) => {
                  console.log("Avatar load error:", error);
                  // Fallback to initials if image fails
                }}
              />
              {/* For now, show all as online. In a real app, you'd track online status */}
              <View style={styles.onlineIndicator} />
            </View>

            <View style={styles.djDetails}>
              <Text style={styles.djName}>
                {otherUser?.dj_name || otherUser?.full_name || "Unknown User"}
              </Text>
              <View style={styles.djLocation}>
                <Ionicons
                  name="location-outline"
                  size={12}
                  color="hsl(0, 0%, 70%)"
                />
                <Text style={styles.djLocationText}>
                  {otherUser?.city || "Location not set"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* DJ Info Card */}
      <View style={styles.djInfoContainer}>
        <View style={styles.djInfoCard}>
          <View style={styles.djInfoHeader}>
            <View style={styles.djInfoTitle}>
              <Ionicons
                name="musical-notes"
                size={16}
                color="hsl(75, 100%, 60%)"
              />
              <Text style={styles.djInfoTitleText}>DJ Profile</Text>
            </View>
            <View style={styles.connectedBadge}>
              <Text style={styles.connectedText}>Connected</Text>
            </View>
          </View>

          <View style={styles.genresContainer}>
            {(otherUser?.genres || []).map((genre) => (
              <View key={genre} style={styles.genreTag}>
                <Text style={styles.genreText}>{genre}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {isLoading ? (
          <>
            <SkeletonMessage align="left" />
            <SkeletonMessage align="right" />
            <SkeletonMessage align="left" />
            <SkeletonMessage align="right" />
          </>
        ) : (
          messages.map((message) => {
            const isCurrentUser = message.sender_id === currentUser?.id;
            return (
              <AnimatedMessage
                key={message.id}
                message={message}
                isCurrentUser={isCurrentUser}
              />
            );
          })
        )}
      </ScrollView>

      {/* Message Input */}
      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor="hsl(0, 0%, 50%)"
            multiline
            autoFocus={false}
            returnKeyType="send"
            onSubmitEditing={(e) => {
              if (e.nativeEvent.text.trim()) {
                handleSendMessage();
              }
            }}
            onKeyPress={(e) => {
              if (e.nativeEvent.key === "Enter" && newMessage.trim()) {
                handleSendMessage();
              }
            }}
            blurOnSubmit={false}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              !newMessage.trim() && styles.sendButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim()}
          >
            <Ionicons name="send" size={20} color="hsl(0, 0%, 100%)" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );

  // Edit Modal
  const renderEditModal = () => (
    <Modal
      visible={showEditModal}
      transparent={true}
      animationType="slide"
      onRequestClose={closeEditModal}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingMessage ? "Edit Message" : "Edit Post"}
            </Text>
            <TouchableOpacity onPress={closeEditModal}>
              <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.modalInput}
            value={editText}
            onChangeText={setEditText}
            placeholder={
              editingMessage ? "Edit your message..." : "Edit your post..."
            }
            placeholderTextColor="hsl(0, 0%, 50%)"
            multiline
            autoFocus
          />

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={closeEditModal}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.saveButton]}
              onPress={saveEdit}
              disabled={!editText.trim()}
            >
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (isGroupChat) {
    return (
      <>
        {renderGroupForum()}
        {renderEditModal()}
        <RhoodModal
          visible={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Message"
          message="Are you sure you want to delete this message? This action cannot be undone."
          type="warning"
          primaryButtonText="Delete"
          secondaryButtonText="Cancel"
          onPrimaryPress={confirmDelete}
          onSecondaryPress={() => setShowDeleteModal(false)}
        />
      </>
    );
  }

  return (
    <>
      {renderDirectMessage()}
      {renderEditModal()}
      <RhoodModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Message"
        message="Are you sure you want to delete this message? This action cannot be undone."
        type="warning"
        primaryButtonText="Delete"
        secondaryButtonText="Cancel"
        onPrimaryPress={confirmDelete}
        onSecondaryPress={() => setShowDeleteModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  header: {
    backgroundColor: "hsl(0, 0%, 5%)",
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
    paddingTop: 25,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
  },
  backButton: {
    padding: 8,
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginLeft: 12,
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  groupLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  groupDetails: {
    marginLeft: 12,
    flex: 1,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
  groupSubtitle: {
    fontSize: 12,
    color: "hsl(0, 0%, 70%)",
    marginTop: 2,
  },
  djImageContainer: {
    position: "relative",
  },
  djImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  onlineIndicator: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "hsl(0, 0%, 5%)",
  },
  djDetails: {
    marginLeft: 12,
    flex: 1,
  },
  djName: {
    fontSize: 16,
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
  djLocation: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  djLocationText: {
    fontSize: 12,
    color: "hsl(0, 0%, 70%)",
    marginLeft: 4,
  },
  djRating: {
    fontSize: 12,
    color: "hsl(75, 100%, 60%)",
    marginLeft: 8,
  },
  djInfoContainer: {
    padding: 16,
  },
  djInfoCard: {
    backgroundColor: "hsl(75, 100%, 60%, 0.1)",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%, 0.2)",
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
  },
  djInfoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  djInfoTitle: {
    flexDirection: "row",
    alignItems: "center",
  },
  djInfoTitleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
    marginLeft: 8,
  },
  connectedBadge: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%, 0.5)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  connectedText: {
    fontSize: 12,
    color: "hsl(75, 100%, 60%)",
  },
  genresContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genreTag: {
    backgroundColor: "hsl(0, 0%, 15%)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  genreText: {
    fontSize: 12,
    color: "hsl(0, 0%, 70%)",
  },
  postsContainer: {
    flex: 1,
    padding: 16,
  },
  postCard: {
    backgroundColor: "hsl(0, 0%, 5%)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  postHeader: {
    flexDirection: "row",
    marginBottom: 12,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  postAuthor: {
    marginLeft: 12,
    flex: 1,
  },
  postAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  postAuthorName: {
    fontSize: 14,
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
  },
  postUsername: {
    fontSize: 12,
    color: "hsl(0, 0%, 70%)",
    marginTop: 2,
  },
  postContent: {
    fontSize: 14,
    color: "hsl(0, 0%, 100%)",
    lineHeight: 20,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  tag: {
    backgroundColor: "hsl(0, 0%, 15%)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: "hsl(0, 0%, 70%)",
  },
  postActions: {
    flexDirection: "row",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "hsl(0, 0%, 15%)",
  },
  postAction: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 24,
  },
  postActionText: {
    fontSize: 12,
    color: "hsl(0, 0%, 70%)",
    marginLeft: 4,
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    marginBottom: 16,
  },
  messageLeft: {
    alignItems: "flex-start",
  },
  messageRight: {
    alignItems: "flex-end",
  },
  messageBubble: {
    maxWidth: "75%",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messageBubbleLeft: {
    backgroundColor: "hsl(0, 0%, 15%)",
    borderBottomLeftRadius: 4,
  },
  messageBubbleRight: {
    backgroundColor: "hsl(75, 100%, 60%)",
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTextLeft: {
    color: "hsl(0, 0%, 100%)",
  },
  messageTextRight: {
    color: "hsl(0, 0%, 0%)",
  },
  senderName: {
    fontSize: 12,
    fontWeight: "600",
    color: "hsl(75, 100%, 60%)",
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 12,
    marginTop: 4,
  },
  messageTimeLeft: {
    color: "hsl(0, 0%, 70%)",
  },
  messageTimeRight: {
    color: "hsl(0, 0%, 0%, 0.7)",
  },
  inputContainer: {
    backgroundColor: "hsl(0, 0%, 5%)",
    borderTopWidth: 1,
    borderTopColor: "hsl(0, 0%, 15%)",
    padding: 16,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    maxWidth: 400,
    alignSelf: "center",
    width: "100%",
  },
  textInput: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 15%)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "hsl(0, 0%, 100%)",
    maxHeight: 100,
    marginRight: 12,
  },
  sendButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonDisabled: {
    backgroundColor: "hsl(0, 0%, 30%)",
  },

  // CRUD Message Styles
  messageFooter: {
    flexDirection: "column",
    alignItems: "flex-start",
    marginTop: 4,
  },
  messageTouchable: {
    width: "100%",
  },
  editedText: {
    fontSize: 12,
    color: "hsl(0, 0%, 50%)",
    fontStyle: "italic",
    marginTop: 4,
  },

  // CRUD Post Styles
  postActionLiked: {
    backgroundColor: "hsl(75, 100%, 60%, 0.1)",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  postActionTextLiked: {
    color: "hsl(75, 100%, 60%)",
  },

  // Edit Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "600",
  },
  modalInput: {
    backgroundColor: "hsl(0, 0%, 12%)",
    borderRadius: 8,
    padding: 12,
    color: "hsl(0, 0%, 100%)",
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    minHeight: 100,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 80,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 30%)",
  },
  cancelButtonText: {
    color: "hsl(0, 0%, 70%)",
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
  },
  saveButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
  },
  saveButtonText: {
    color: "hsl(0, 0%, 0%)",
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
  },
});
