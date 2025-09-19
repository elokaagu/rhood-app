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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ProgressiveImage from "./ProgressiveImage";
import RhoodModal from "./RhoodModal";

// Mock DJ Data
const mockDJs = [
  {
    id: 1,
    name: "Maya Rodriguez",
    username: "@mayabeats",
    location: "Berlin, Germany",
    genres: ["House", "Techno", "Progressive"],
    rating: 4.9,
    profileImage:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop",
    isOnline: true,
  },
  {
    id: 2,
    name: "Kai Johnson",
    username: "@djkai",
    location: "Amsterdam, Netherlands",
    genres: ["Drum & Bass", "Breakbeat", "Electronic"],
    rating: 4.7,
    profileImage:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    isOnline: false,
  },
];

// Mock Forum Posts Data
const mockForumPosts = [
  {
    id: 1,
    author: "Sofia Rodriguez",
    username: "@sofiavibes",
    avatar:
      "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    content:
      "Just finished an incredible set at Fabric last night! The crowd was absolutely electric ⚡ Anyone else perform this weekend?",
    likes: 24,
    replies: 8,
    isPinned: true,
    tags: ["fabric", "weekend-sets"],
  },
  {
    id: 2,
    author: "Alex Thompson",
    username: "@alexunderground",
    avatar:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
    content:
      "Looking for a producer to collaborate on a new track. Hit me up if you're interested in deep house vibes!",
    likes: 12,
    replies: 3,
    isPinned: false,
    tags: ["collaboration", "deep-house"],
  },
  {
    id: 3,
    author: "Luna Martinez",
    username: "@lunabeats",
    avatar:
      "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop",
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
    content:
      "The new venue in Shoreditch is amazing! Perfect acoustics for electronic music. Highly recommend checking it out.",
    likes: 18,
    replies: 5,
    isPinned: false,
    tags: ["venue", "shoreditch", "acoustics"],
  },
];

// Mock Messages Data
const mockMessages = [
  {
    id: 1,
    senderId: 1,
    text: "Hey! I saw your profile and love your sound. Are you available for a collaboration this weekend?",
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    isCurrentUser: false,
  },
  {
    id: 2,
    senderId: "current",
    text: "Hi! Thanks for reaching out. I'd love to collaborate! What kind of project did you have in mind?",
    timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000),
    isCurrentUser: true,
  },
  {
    id: 3,
    senderId: 1,
    text: "I'm working on a progressive house track and think your style would be perfect for the breakdown section. Want to hear what I have so far?",
    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
    isCurrentUser: false,
  },
  {
    id: 4,
    senderId: "current",
    text: "Absolutely! Send it over and I'll take a listen. I'm really excited about this collaboration!",
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    isCurrentUser: true,
  },
];

export default function MessagesScreen({ navigation, route }) {
  const { isGroupChat = false, djId = 1 } = route.params || {};

  // State for messages and posts
  const [newMessage, setNewMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [forumPosts, setForumPosts] = useState([]);

  // State for CRUD operations
  const [editingMessage, setEditingMessage] = useState(null);
  const [editingPost, setEditingPost] = useState(null);
  const [editText, setEditText] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Custom modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const currentDJ = mockDJs.find((dj) => dj.id === djId) || mockDJs[0];

  // Storage keys
  const MESSAGES_KEY = `messages_${djId}`;
  const FORUM_POSTS_KEY = "forum_posts";

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [djId]);

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
        setMessages(mockMessages);
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
        setForumPosts(mockForumPosts);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      // Fallback to mock data
      setMessages(mockMessages);
      setForumPosts(mockForumPosts);
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
  const createMessage = (text) => {
    const newMessage = {
      id: Date.now(), // Simple ID generation
      senderId: "current",
      text: text.trim(),
      timestamp: new Date(),
      isCurrentUser: true,
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    saveMessages(updatedMessages);
    return newMessage;
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
  const createPost = (content) => {
    const newPost = {
      id: Date.now(),
      author: "You",
      username: "@yourusername",
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop",
      timestamp: new Date(),
      content: content.trim(),
      likes: 0,
      replies: 0,
      isPinned: false,
      tags: [],
      isCurrentUser: true,
    };

    const updatedPosts = [newPost, ...forumPosts];
    setForumPosts(updatedPosts);
    saveForumPosts(updatedPosts);
    return newPost;
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
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    );

    if (diffInHours < 1) {
      const diffInMins = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60)
      );
      return `${diffInMins}m`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d`;
    }
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

  const handlePostToForum = () => {
    if (!newPost.trim()) return;
    createPost(newPost);
    setNewPost("");
    Keyboard.dismiss(); // Dismiss keyboard after posting
  };

  const handleLike = (postId) => {
    likePost(postId);
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
              <Ionicons name="people" size={20} color="hsl(75, 100%, 60%)" />
            </View>

            <View style={styles.groupDetails}>
              <Text style={styles.groupTitle}>Rhood Group</Text>
              <Text style={styles.groupSubtitle}>
                12 members • Community Forum
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.moreButton}>
            <Ionicons
              name="ellipsis-vertical"
              size={20}
              color="hsl(0, 0%, 70%)"
            />
          </TouchableOpacity>
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
              <ProgressiveImage
                source={{ uri: post.avatar }}
                style={styles.postAvatar}
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
                <ProgressiveImage
                  source={{ uri: currentDJ.profileImage }}
                  style={styles.djImage}
                />
                {currentDJ.isOnline && <View style={styles.onlineIndicator} />}
              </View>

              <View style={styles.djDetails}>
                <Text style={styles.djName}>{currentDJ.name}</Text>
                <View style={styles.djLocation}>
                  <Ionicons
                    name="location-outline"
                    size={12}
                    color="hsl(0, 0%, 70%)"
                  />
                  <Text style={styles.djLocationText}>
                    {currentDJ.location}
                  </Text>
                  <Ionicons name="star" size={12} color="hsl(75, 100%, 60%)" />
                  <Text style={styles.djRating}>{currentDJ.rating}</Text>
                </View>
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.headerAction}>
                <Ionicons
                  name="ellipsis-vertical"
                  size={20}
                  color="hsl(0, 0%, 70%)"
                />
              </TouchableOpacity>
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
              {currentDJ.genres.map((genre) => (
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
          {messages.map((message) => (
            <View
              key={message.id}
              style={[
                styles.messageContainer,
                message.isCurrentUser
                  ? styles.messageRight
                  : styles.messageLeft,
              ]}
            >
              <View
                style={[
                  styles.messageBubble,
                  message.isCurrentUser
                    ? styles.messageBubbleRight
                    : styles.messageBubbleLeft,
                ]}
              >
                <Text
                  style={[
                    styles.messageText,
                    message.isCurrentUser
                      ? styles.messageTextRight
                      : styles.messageTextLeft,
                  ]}
                >
                  {message.text}
                </Text>
                <View style={styles.messageFooter}>
                  <Text
                    style={[
                      styles.messageTime,
                      message.isCurrentUser
                        ? styles.messageTimeRight
                        : styles.messageTimeLeft,
                    ]}
                  >
                    {formatTime(message.timestamp)}
                    {message.isEdited && " (edited)"}
                  </Text>
                  {message.isCurrentUser && (
                    <View style={styles.messageActions}>
                      <TouchableOpacity
                        style={styles.messageAction}
                        onPress={() => openEditModal(message, "message")}
                      >
                        <Ionicons
                          name="create-outline"
                          size={14}
                          color="hsl(0, 0%, 70%)"
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.messageAction}
                        onPress={() => deleteMessage(message.id)}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={14}
                          color="hsl(0, 0%, 70%)"
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </View>
          ))}
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
    backgroundColor: "hsl(75, 100%, 60%)",
    justifyContent: "center",
    alignItems: "center",
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
  moreButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerAction: {
    padding: 8,
    marginLeft: 8,
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  messageActions: {
    flexDirection: "row",
    gap: 8,
  },
  messageAction: {
    padding: 4,
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
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "600",
  },
  modalInput: {
    backgroundColor: "hsl(0, 0%, 12%)",
    borderRadius: 8,
    padding: 12,
    color: "hsl(0, 0%, 100%)",
    fontSize: 16,
    fontFamily: "Arial",
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
    fontFamily: "Arial",
    fontWeight: "500",
  },
  saveButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
  },
  saveButtonText: {
    color: "hsl(0, 0%, 0%)",
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "600",
  },
});
