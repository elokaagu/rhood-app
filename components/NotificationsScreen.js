import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ProgressiveImage from "./ProgressiveImage";
import AnimatedListItem from "./AnimatedListItem";

// Mock notifications data
const mockNotifications = [
  {
    id: 1,
    type: "opportunity",
    title: "New Opportunity",
    description: "Underground Warehouse Rave is looking for DJs",
    timestamp: "2 hours ago",
    isRead: false,
    priority: "high",
    actionRequired: true,
    opportunityId: 123,
    venue: "Warehouse District",
    date: "Dec 15, 2024",
  },
  {
    id: 2,
    type: "application",
    title: "Application Accepted",
    description: "Your application for Club Neon has been accepted",
    timestamp: "1 day ago",
    isRead: true,
    priority: "medium",
    actionRequired: false,
    applicationId: 456,
    venue: "Club Neon",
    date: "Dec 14, 2024",
  },
  {
    id: 3,
    type: "message",
    title: "New Message",
    description: "You have a new message from Darkside Collective",
    timestamp: "3 days ago",
    isRead: false,
    priority: "low",
    actionRequired: true,
    messageId: 789,
    sender: "Darkside Collective",
    senderImage:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop&crop=face",
  },
  {
    id: 4,
    type: "system",
    title: "Profile Update",
    description: "Your profile has been updated successfully",
    timestamp: "1 week ago",
    isRead: true,
    priority: "low",
    actionRequired: false,
  },
  {
    id: 5,
    type: "opportunity",
    title: "Reminder: Gig Tonight",
    description: "Your set at Electric Lounge starts in 2 hours",
    timestamp: "4 hours ago",
    isRead: false,
    priority: "high",
    actionRequired: true,
    venue: "Electric Lounge",
    date: "Tonight",
  },
  {
    id: 6,
    type: "connection",
    title: "New Connection",
    description: "Marcus Chen wants to connect with you",
    timestamp: "2 days ago",
    isRead: false,
    priority: "medium",
    actionRequired: true,
    connectionId: 101,
    sender: "Marcus Chen",
    senderImage:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
  },
];

export default function NotificationsScreen({ onNavigate }) {
  const [notifications, setNotifications] = useState(mockNotifications);
  const [refreshing, setRefreshing] = useState(false);

  const handleNotificationPress = (notification) => {
    // Mark as read (remove green border)
    if (!notification.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n))
      );
    }
    // No navigation - notifications are just for reading
  };

  const handleMarkAsRead = (notificationId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
    );
  };

  const handleDismiss = (notificationId) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  const handleRefresh = () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
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
          <Text style={styles.headerTitle}>NOTIFICATIONS</Text>
          <Text style={styles.headerSubtitle}>
            {unreadCount > 0
              ? `${unreadCount} unread notifications`
              : "All caught up!"}
          </Text>
        </View>

        {/* Notifications List */}
        <View style={styles.notificationsList}>
          {sortedNotifications.length === 0 ? (
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
  headerTitle: {
    fontSize: 24,
    fontFamily: "TS-Block-Bold",
    color: "hsl(0, 0%, 100%)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
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
});
