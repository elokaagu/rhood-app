import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ProgressiveImage from "./ProgressiveImage";
import AnimatedListItem from "./AnimatedListItem";
import { supabase, db } from "../lib/supabase";

// Helper function to format relative time
const formatRelativeTime = (timestamp) => {
  const now = new Date();
  const notificationTime = new Date(timestamp);
  const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));

  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60)
    return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24)
    return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7)
    return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;

  const diffInWeeks = Math.floor(diffInDays / 7);
  return `${diffInWeeks} week${diffInWeeks === 1 ? "" : "s"} ago`;
};

export default function NotificationsScreen({
  user: propUser,
  onNavigate,
  onNotificationRead,
}) {
  const [notifications, setNotifications] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(propUser); // Use prop user as initial state
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptedUser, setAcceptedUser] = useState(null);

  // Load current user and notifications on component mount
  useEffect(() => {
    loadUserAndNotifications();
  }, []);

  // Set up real-time subscription for notifications
  useEffect(() => {
    if (!currentUser) return;

    console.log(
      "🔔 Setting up real-time subscription for notifications screen"
    );

    const channel = supabase
      .channel(`notifications-screen-${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          console.log("🔔 New notification received in screen:", payload.new);
          // Refresh notifications when new one arrives
          handleRefresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload) => {
          console.log("🔔 Notification updated in screen:", payload.new);
          // Refresh notifications when one is updated
          handleRefresh();
        }
      )
      .subscribe();

    return () => {
      console.log("🔔 Cleaning up notifications screen subscription");
      supabase.removeChannel(channel);
    };
  }, [currentUser]);

  // Set up periodic refresh as fallback (every 30 seconds)
  useEffect(() => {
    if (!currentUser) return;

    const interval = setInterval(() => {
      console.log("🔄 Periodic notification refresh");
      handleRefresh();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [currentUser]);

  const loadUserAndNotifications = async () => {
    try {
      setLoading(true);

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
        console.log("No authenticated user found");
        setNotifications([]);
        setLoading(false);
        return;
      }

      console.log("✅ User found:", user.id);
      setCurrentUser(user);

      // Load notifications from database
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform database notifications to match UI format
      const transformedNotifications = data.map((notification) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        description: notification.message,
        timestamp: formatRelativeTime(notification.created_at),
        isRead: notification.is_read,
        priority: getPriorityFromType(notification.type),
        actionRequired:
          !notification.is_read && shouldRequireAction(notification.type),
        relatedId: notification.related_id,
      }));

      setNotifications(transformedNotifications);
    } catch (error) {
      console.error("Error loading notifications:", error);
      Alert.alert("Error", "Failed to load notifications");
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityFromType = (type) => {
    switch (type) {
      case "opportunity":
      case "application":
        return "high";
      case "message":
        return "medium";
      case "system":
      default:
        return "low";
    }
  };

  const shouldRequireAction = (type) => {
    return ["opportunity", "application", "message"].includes(type);
  };

  const handleNotificationPress = async (notification) => {
    // Mark as read in database if not already read
    if (!notification.isRead) {
      await markNotificationAsRead(notification.id);
    }

    // Handle navigation based on notification type
    switch (notification.type) {
      case "opportunity":
        onNavigate("opportunities");
        break;
      case "application":
        onNavigate("opportunities");
        break;
      case "message":
        onNavigate("messages");
        break;
      case "connection":
        onNavigate("connections");
        break;
      default:
        break;
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
      );

      // Notify parent component to refresh notification count
      if (onNotificationRead) {
        onNotificationRead();
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      Alert.alert("Error", "Failed to mark notification as read");
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    await markNotificationAsRead(notificationId);
  };

  const handleDismiss = async (notificationId) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", notificationId);

      if (error) throw error;

      // Update local state
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (error) {
      console.error("Error dismissing notification:", error);
      Alert.alert("Error", "Failed to dismiss notification");
    }
  };

  const handleAcceptConnection = async (notification) => {
    try {
      // Extract connection ID from notification data
      const connectionId = notification.data?.connection_id;

      if (!connectionId) {
        Alert.alert("Error", "Connection ID not found");
        return;
      }

      // Accept the connection
      await db.acceptConnection(connectionId);

      // Mark notification as read
      await markNotificationAsRead(notification.id);

      // Update local state to remove the notification
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));

      // Extract user info from notification for the modal
      const userInfo = {
        name: notification.title.replace(" wants to connect with you", ""),
        id: notification.data?.sender_id || notification.relatedId,
      };

      setAcceptedUser(userInfo);
      setShowAcceptModal(true);

      // Call the notification read callback to update badge counts
      if (onNotificationRead) {
        onNotificationRead();
      }
    } catch (error) {
      console.error("Error accepting connection:", error);
      Alert.alert("Error", "Failed to accept connection request");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUserAndNotifications();
    setRefreshing(false);
  };

  // Sort notifications by priority and timestamp
  const sortedNotifications = useMemo(() => {
    return notifications.sort((a, b) => {
      // Unread first
      if (a.isRead !== b.isRead) {
        return a.isRead ? 1 : -1;
      }
      // Then by priority
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      // Then by timestamp (most recent first)
      return new Date(b.timestamp) - new Date(a.timestamp);
    });
  }, [notifications]);

  const getNotificationIcon = (type) => {
    switch (type) {
      case "opportunity":
        return "briefcase-outline";
      case "application":
        return "checkmark-circle-outline";
      case "message":
        return "chatbubble-outline";
      case "connection":
        return "person-add-outline";
      case "system":
        return "settings-outline";
      default:
        return "notifications-outline";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "hsl(0, 100%, 60%)";
      case "medium":
        return "hsl(45, 100%, 60%)";
      case "low":
        return "hsl(0, 0%, 60%)";
      default:
        return "hsl(0, 0%, 60%)";
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.tsBlockBoldHeading}>NOTIFICATIONS</Text>
          <Text style={styles.headerSubtitle}>
            {unreadCount > 0
              ? `${unreadCount} unread notifications`
              : "All caught up!"}
          </Text>
        </View>

        {/* Notifications List */}
        <View style={styles.notificationsList}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="hsl(75, 100%, 60%)" />
              <Text style={styles.loadingText}>Loading notifications...</Text>
            </View>
          ) : sortedNotifications.length === 0 ? (
            <View style={styles.noResultsContainer}>
              <Ionicons
                name="notifications-off"
                size={48}
                color="hsl(0, 0%, 30%)"
              />
              <Text style={styles.noResultsTitle}>No notifications</Text>
              <Text style={styles.noResultsSubtitle}>
                You're all caught up!
              </Text>
            </View>
          ) : (
            sortedNotifications.map((notification, index) => (
              <AnimatedListItem key={notification.id} index={index} delay={60}>
                <TouchableOpacity
                  style={[
                    styles.notificationCard,
                    !notification.isRead && styles.unreadCard,
                  ]}
                  onPress={() => handleNotificationPress(notification)}
                  activeOpacity={0.7}
                >
                  <View style={styles.notificationContent}>
                    {/* Left Side - Icon and Status */}
                    <View style={styles.notificationLeft}>
                      <View style={styles.iconContainer}>
                        <Ionicons
                          name={getNotificationIcon(notification.type)}
                          size={24}
                          color={
                            notification.isRead
                              ? "hsl(0, 0%, 50%)"
                              : "hsl(75, 100%, 60%)"
                          }
                        />
                        {!notification.isRead && (
                          <View style={styles.unreadDot} />
                        )}
                      </View>
                      {notification.senderImage && (
                        <ProgressiveImage
                          source={{ uri: notification.senderImage }}
                          style={styles.senderImage}
                        />
                      )}
                    </View>

                    {/* Center - Content */}
                    <View style={styles.notificationCenter}>
                      <View style={styles.notificationHeader}>
                        <Text
                          style={[
                            styles.notificationTitle,
                            !notification.isRead && styles.unreadTitle,
                          ]}
                          numberOfLines={1}
                        >
                          {notification.title}
                        </Text>
                        <View style={styles.notificationActions}>
                          {notification.type === "connection" &&
                            !notification.isRead && (
                              <TouchableOpacity
                                onPress={(e) => {
                                  e.stopPropagation();
                                  handleAcceptConnection(notification);
                                }}
                                style={[
                                  styles.actionButton,
                                  styles.acceptButton,
                                ]}
                              >
                                <Ionicons
                                  name="checkmark"
                                  size={16}
                                  color="hsl(0, 0%, 0%)"
                                />
                              </TouchableOpacity>
                            )}
                          {!notification.isRead && (
                            <TouchableOpacity
                              onPress={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification.id);
                              }}
                              style={styles.actionButton}
                            >
                              <Ionicons
                                name="checkmark"
                                size={16}
                                color="hsl(0, 0%, 50%)"
                              />
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation();
                              handleDismiss(notification.id);
                            }}
                            style={styles.actionButton}
                          >
                            <Ionicons
                              name="close"
                              size={16}
                              color="hsl(0, 0%, 50%)"
                            />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <Text
                        style={styles.notificationDescription}
                        numberOfLines={2}
                      >
                        {notification.description}
                      </Text>

                      <View style={styles.notificationFooter}>
                        <Text style={styles.notificationTimestamp}>
                          {notification.timestamp}
                        </Text>
                        <View
                          style={[
                            styles.priorityIndicator,
                            {
                              backgroundColor: getPriorityColor(
                                notification.priority
                              ),
                            },
                          ]}
                        />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </AnimatedListItem>
            ))
          )}
        </View>
      </ScrollView>

      {/* Bottom gradient fade overlay */}
      <LinearGradient
        colors={["transparent", "rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0.8)"]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      {/* Connection Accepted Modal */}
      <Modal
        visible={showAcceptModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowAcceptModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.successIconContainer}>
                <Ionicons
                  name="checkmark-circle"
                  size={48}
                  color="hsl(75, 100%, 60%)"
                />
              </View>
              <Text style={styles.modalTitle}>Connection Accepted!</Text>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalMessage}>
                You've successfully connected with{" "}
                <Text style={styles.userName}>{acceptedUser?.name}</Text>.
                They've been notified and you can now start chatting!
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.chatButton]}
                onPress={() => {
                  setShowAcceptModal(false);
                  if (onNavigate && acceptedUser?.id) {
                    onNavigate("messages", {
                      isGroupChat: false,
                      djId: acceptedUser.id,
                    });
                  }
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble" size={20} color="hsl(0, 0%, 0%)" />
                <Text style={styles.chatButtonText}>Start Chatting</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.closeButton]}
                onPress={() => setShowAcceptModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  scrollView: {
    flex: 1,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  tsBlockBoldHeading: {
    fontFamily: "TS-Block-Bold",
    fontSize: 22,
    color: "#FFFFFF", // Brand white
    textAlign: "left", // Left aligned as per guidelines
    textTransform: "uppercase", // Always uppercase
    lineHeight: 26, // Tight line height for stacked effect
    letterSpacing: 1, // Slight spacing for impact
    marginBottom: 16,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
    marginBottom: 16,
  },
  noResultsContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  noResultsTitle: {
    fontSize: 16,
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  noResultsSubtitle: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    lineHeight: 20,
  },
  notificationsList: {
    padding: 20,
  },
  notificationCard: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    overflow: "hidden",
  },
  unreadCard: {
    borderColor: "hsl(75, 100%, 60%)",
    borderWidth: 1.5,
  },
  notificationContent: {
    flexDirection: "row",
    padding: 16,
  },
  notificationLeft: {
    marginRight: 12,
    alignItems: "center",
  },
  iconContainer: {
    position: "relative",
    marginBottom: 8,
  },
  unreadDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "hsl(75, 100%, 60%)",
  },
  senderImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  notificationCenter: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  notificationTitle: {
    fontSize: 14,
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)",
    flex: 1,
    marginRight: 8,
  },
  unreadTitle: {
    color: "hsl(75, 100%, 60%)",
  },
  notificationActions: {
    flexDirection: "row",
    gap: 4,
  },
  actionButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: "hsl(0, 0%, 15%)",
  },
  acceptButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  notificationDescription: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Helvetica Neue",
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  notificationTimestamp: {
    fontSize: 12,
    color: "hsl(0, 0%, 50%)",
    fontFamily: "Helvetica Neue",
  },
  priorityIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    fontSize: 16,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Helvetica Neue",
    marginTop: 16,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  successIconContainer: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)",
    fontFamily: "Helvetica Neue",
    textAlign: "center",
  },
  modalContent: {
    marginBottom: 24,
  },
  modalMessage: {
    fontSize: 16,
    color: "hsl(0, 0%, 80%)",
    fontFamily: "Helvetica Neue",
    lineHeight: 24,
    textAlign: "center",
  },
  userName: {
    color: "hsl(75, 100%, 60%)",
    fontWeight: "bold",
  },
  modalActions: {
    gap: 12,
  },
  modalButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  chatButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
  },
  chatButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "hsl(0, 0%, 0%)",
    fontFamily: "Helvetica Neue",
  },
  closeButton: {
    backgroundColor: "hsl(0, 0%, 15%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 25%)",
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "hsl(0, 0%, 80%)",
    fontFamily: "Helvetica Neue",
  },
});
