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
import RhoodModal from "./RhoodModal";
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
  const [actionProcessing, setActionProcessing] = useState({});
  const [showConnectionPrompt, setShowConnectionPrompt] = useState(false);
  const [activeConnectionNotification, setActiveConnectionNotification] =
    useState(null);
  const [notificationPreferences, setNotificationPreferences] = useState({
    pushNotifications: true,
    messageNotifications: true,
  });

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

  useEffect(() => {
    if (showAcceptModal && acceptedUser?.id) {
      const timer = setTimeout(() => {
        setShowAcceptModal(false);
        if (onNavigate) {
          onNavigate("messages", {
            isGroupChat: false,
            djId: acceptedUser.id,
          });
        }
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [showAcceptModal, acceptedUser, onNavigate]);

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

      const userSettings = await db.getUserSettings(user.id);
      const pushEnabled = userSettings?.push_notifications ?? true;
      const messageEnabled = userSettings?.message_notifications ?? true;

      setNotificationPreferences({
        pushNotifications: pushEnabled,
        messageNotifications: messageEnabled,
      });

      // Load notifications from database
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const allowMessageNotifications = messageEnabled;

      // Transform database notifications to match UI format
      const transformedNotifications = (data || [])
        .filter((notification) => {
          if (!allowMessageNotifications) {
            const typeValue = (notification.type || "")
              .toString()
              .toLowerCase();
            if (typeValue.includes("message")) {
              return false;
            }
          }
          return true;
        })
        .map((notification) => {
        const rawTitle = notification.title || "";
        const displayTitle =
          notification.type === "connection"
            ? rawTitle.replace(/^\s*New\s+/i, "").trim() || "Connection Request"
            : rawTitle;

        return {
        id: notification.id,
        type: notification.type,
          title: displayTitle,
        description: notification.message,
        timestamp: formatRelativeTime(notification.created_at),
        isRead: notification.is_read,
        priority: getPriorityFromType(notification.type),
        actionRequired:
          !notification.is_read && shouldRequireAction(notification.type),
        relatedId: notification.related_id,
          connectionId:
            notification.related_id ||
            notification.data?.connection_id ||
            notification.metadata?.connection_id ||
            null,
          senderImage:
            notification.sender_image ||
            notification.data?.sender_image ||
            notification.metadata?.sender_image ||
            null,
          rawData: notification.data || notification.metadata || {},
        };
        });

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
    if (notification.type === "connection") {
      setActiveConnectionNotification(notification);
      setShowConnectionPrompt(true);
      return;
    }

    if (!notification.isRead) {
      await markNotificationAsRead(notification.id);
    }

    switch (notification.type) {
      case "opportunity":
      case "application":
        onNavigate("opportunities");
        break;
      case "message":
        onNavigate("messages");
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

  const setNotificationActionProcessing = (notificationId, action) => {
    setActionProcessing((prev) => ({ ...prev, [notificationId]: action }));
  };

  const clearNotificationActionProcessing = (notificationId) => {
    setActionProcessing((prev) => {
      const { [notificationId]: removed, ...rest } = prev;
      return rest;
    });
  };

  const getNotificationActionState = (notificationId) =>
    actionProcessing[notificationId];

  const handleAcceptConnection = async (notification) => {
    try {
      console.log("🔗 Accepting connection for notification:", notification);

      // Extract connection ID from notification data
      const connectionId =
        notification.connectionId ||
        notification.rawData?.connection_id ||
        notification.relatedId;

      if (!connectionId) {
        console.error(
          "❌ Connection ID not found in notification:",
          notification
        );
        Alert.alert("Error", "Connection ID not found");
        return;
      }

      console.log("🔗 Accepting connection with ID:", connectionId);

      setNotificationActionProcessing(notification.id, "accept");

      // Accept the connection
      const result = await db.acceptConnection(connectionId);
      console.log("✅ Connection acceptance result:", result);

      // Mark notification as read
      await markNotificationAsRead(notification.id);

      // Update local state to remove the notification
      setNotifications((prev) => prev.filter((n) => n.id !== notification.id));

      // Extract user info from notification for the modal
      const userInfo = {
        name:
          notification.description?.replace(
            " wants to connect with you",
            ""
          )?.trim() || "This DJ",
        id: notification.rawData?.sender_id || notification.relatedId,
      };

      console.log(
        "🎉 Connection accepted! Showing success modal for user:",
        userInfo
      );
      setAcceptedUser(userInfo);
      setShowAcceptModal(true);

      // Call the notification read callback to update badge counts
      if (onNotificationRead) {
        onNotificationRead();
      }
    } catch (error) {
      console.error("❌ Error accepting connection:", error);
      Alert.alert(
        "Error",
        `Failed to accept connection request: ${error.message}`
      );
    } finally {
      clearNotificationActionProcessing(notification.id);
    }
  };

  const handleDeclineConnection = async (notification) => {
    try {
      console.log("🚫 Declining connection for notification:", notification);

      const connectionId =
        notification.connectionId ||
        notification.rawData?.connection_id ||
        notification.relatedId;

      if (!connectionId) {
        console.error(
          "❌ Connection ID not found in notification for decline:",
          notification
        );
        Alert.alert("Error", "Connection ID not found");
        return;
      }

      setNotificationActionProcessing(notification.id, "decline");

      await db.declineConnection(connectionId);
      await markNotificationAsRead(notification.id);
      await handleDismiss(notification.id);

      if (onNotificationRead) {
        onNotificationRead();
      }

      Alert.alert(
        "Connection Declined",
        "The connection request has been declined."
      );
    } catch (error) {
      console.error("❌ Error declining connection:", error);
      Alert.alert(
        "Error",
        `Failed to decline connection request: ${error.message}`
      );
    } finally {
      clearNotificationActionProcessing(notification.id);
    }
  };

  const closeConnectionPrompt = () => {
    setShowConnectionPrompt(false);
    setActiveConnectionNotification(null);
  };

  const handleConnectionPromptAccept = async () => {
    if (!activeConnectionNotification) return;
    const processingState = getNotificationActionState(
      activeConnectionNotification.id
    );
    if (processingState) return;

    await handleAcceptConnection(activeConnectionNotification);
    setShowConnectionPrompt(false);
    setActiveConnectionNotification(null);
  };

  const handleConnectionPromptDecline = async () => {
    if (!activeConnectionNotification) return;
    const processingState = getNotificationActionState(
      activeConnectionNotification.id
    );
    if (processingState) return;

    await handleDeclineConnection(activeConnectionNotification);
    setShowConnectionPrompt(false);
    setActiveConnectionNotification(null);
  };

  const markAllAsRead = async () => {
    try {
      if (!currentUser) return;

      setLoading(true);

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", currentUser.id);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((notification) => ({ ...notification, isRead: true }))
      );

      if (onNotificationRead) {
        onNotificationRead();
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      Alert.alert("Error", "Failed to mark all notifications as read");
    } finally {
      setLoading(false);
    }
  };

  const clearAllNotifications = async () => {
    try {
      if (!currentUser) return;

      setLoading(true);

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", currentUser.id);

      if (error) throw error;

      setNotifications([]);

      if (onNotificationRead) {
        onNotificationRead();
      }
    } catch (error) {
      console.error("Error clearing notifications:", error);
      Alert.alert("Error", "Failed to clear notifications");
    } finally {
      setLoading(false);
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
  const currentConnectionActionState = activeConnectionNotification
    ? getNotificationActionState(activeConnectionNotification.id)
    : null;

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

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={markAllAsRead}
              disabled={loading || notifications.length === 0}
            >
              <Ionicons
                name="checkmark-done"
                size={16}
                color="hsl(75, 100%, 60%)"
              />
              <Text style={styles.headerActionText}>Mark All Read</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={clearAllNotifications}
              disabled={loading || notifications.length === 0}
            >
              <Ionicons
                name="trash-outline"
                size={16}
                color="hsl(0, 0%, 70%)"
              />
              <Text style={styles.headerActionText}>Clear All</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications List */}
        <View style={styles.notificationsList}>
          {!notificationPreferences.messageNotifications && (
            <View style={styles.preferenceBanner}>
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color="hsl(75, 100%, 60%)"
              />
              <View style={styles.preferenceBannerContent}>
                <Text style={styles.preferenceBannerTitle}>
                  Message notifications are off
                </Text>
                <Text style={styles.preferenceBannerSubtitle}>
                  Re-enable them in Settings if you want alerts for new messages.
                </Text>
              </View>
            </View>
          )}
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

      <RhoodModal
        visible={showConnectionPrompt && !!activeConnectionNotification}
        onClose={closeConnectionPrompt}
        title={
          activeConnectionNotification?.title || "Connection Request"
        }
        message={
          activeConnectionNotification?.description ||
          "This DJ wants to connect with you."
        }
        primaryButtonText={
          currentConnectionActionState === "accept" ? "Accepting..." : "Accept"
        }
        secondaryButtonText={
          currentConnectionActionState === "decline" ? "Rejecting..." : "Reject"
        }
        onPrimaryPress={handleConnectionPromptAccept}
        onSecondaryPress={handleConnectionPromptDecline}
        type="info"
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
                You're now connected with{" "}
                <Text style={styles.userName}>{acceptedUser?.name}</Text>.
                Opening chat...
              </Text>
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
  headerActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  headerActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "hsl(0, 0%, 15%)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 25%)",
  },
  headerActionText: {
    fontSize: 12,
    fontFamily: "Arial",
    fontWeight: "600",
    color: "hsl(0, 0%, 85%)",
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
  preferenceBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(75, 255, 150, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(75, 255, 150, 0.2)",
    padding: 16,
    marginBottom: 16,
  },
  preferenceBannerContent: {
    flex: 1,
    gap: 4,
  },
  preferenceBannerTitle: {
    fontSize: 14,
    fontFamily: "TS-Block-Bold",
    color: "hsl(75, 100%, 60%)",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  preferenceBannerSubtitle: {
    fontSize: 13,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 70%)",
    lineHeight: 18,
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
    fontSize: 12.5,
    lineHeight: 14,
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)",
    flex: 1,
    flexShrink: 1,
    marginRight: 8,
  },
  unreadTitle: {
    color: "hsl(75, 100%, 60%)",
  },
  notificationActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 4,
    borderRadius: 4,
    backgroundColor: "hsl(0, 0%, 15%)",
  },
  connectionActions: {
    flexDirection: "row",
    gap: 8,
  },
  connectionButton: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 88,
  },
  connectionButtonAccept: {
    backgroundColor: "hsl(75, 100%, 60%)",
  },
  connectionButtonDecline: {
    backgroundColor: "hsl(0, 0%, 20%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 40%)",
  },
  connectionButtonDisabled: {
    opacity: 0.6,
  },
  connectionButtonText: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
  },
  connectionButtonTextDecline: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 100%)",
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
