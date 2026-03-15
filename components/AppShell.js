import React from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Layout shell: header (logo + menu with notification badge) and bottom tab bar.
 * Hides tab bar when currentScreen === "messages".
 */
export default function AppShell({
  children,
  currentScreen,
  onOpenMenu,
  onTabPress,
  unreadNotificationCount,
  styles,
}) {
  const NotificationBadge = ({ count, style }) => {
    if (count === 0) return null;
    const displayValue = count > 99 ? "99+" : `${count}`;
    return (
      <View
        style={[
          styles.notificationBadge,
          displayValue.length === 1 && styles.notificationBadgeSingleDigit,
          style,
        ]}
      >
        <Text style={styles.notificationBadgeText}>{displayValue}</Text>
      </View>
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <Image
                source={require("../assets/rhood_logo.png")}
                style={styles.logoIcon}
                resizeMode="contain"
              />
              <Image
                source={require("../assets/RHOOD_Lettering_White.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.menuButton} onPress={onOpenMenu}>
              <Ionicons name="menu" size={24} color="hsl(0, 0%, 100%)" />
              <NotificationBadge
                count={unreadNotificationCount}
                style={styles.menuNotificationBadge}
              />
            </TouchableOpacity>
          </View>
        </View>

        {children}

        {currentScreen !== "messages" && (
          <LinearGradient
            colors={["#000000", "#1a1a1a", "#000000"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tabBar}
          >
            <TouchableOpacity
              style={[
                styles.tab,
                currentScreen === "opportunities" && styles.activeTab,
              ]}
              onPress={() => onTabPress("opportunities")}
            >
              <Ionicons
                name="briefcase-outline"
                size={20}
                color={
                  currentScreen === "opportunities"
                    ? "hsl(75, 100%, 60%)"
                    : "hsl(0, 0%, 70%)"
                }
              />
              <Text
                style={[
                  styles.tabText,
                  currentScreen === "opportunities" && styles.activeTabText,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
              >
                Opportunities
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tab,
                currentScreen === "connections" && styles.activeTab,
              ]}
              onPress={() => onTabPress("connections")}
            >
              <Ionicons
                name="people-outline"
                size={20}
                color={
                  currentScreen === "connections"
                    ? "hsl(75, 100%, 60%)"
                    : "hsl(0, 0%, 70%)"
                }
              />
              <Text
                style={[
                  styles.tabText,
                  currentScreen === "connections" && styles.activeTabText,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
              >
                Connections
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, currentScreen === "listen" && styles.activeTab]}
              onPress={() => onTabPress("listen")}
            >
              <Ionicons
                name="musical-notes-outline"
                size={20}
                color={
                  currentScreen === "listen"
                    ? "hsl(75, 100%, 60%)"
                    : "hsl(0, 0%, 70%)"
                }
              />
              <Text
                style={[
                  styles.tabText,
                  currentScreen === "listen" && styles.activeTabText,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit={true}
              >
                Listen
              </Text>
            </TouchableOpacity>
          </LinearGradient>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
