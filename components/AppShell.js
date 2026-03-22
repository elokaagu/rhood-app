import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { SCREENS, TAB_BAR_HIDDEN_SCREENS } from "../navigation/routes";

const MAIN_TABS = [
  {
    key: SCREENS.OPPORTUNITIES,
    label: "Opportunities",
    icon: "briefcase-outline",
  },
  {
    key: SCREENS.CONNECTIONS,
    label: "Connections",
    icon: "people-outline",
  },
  {
    key: SCREENS.LISTEN,
    label: "Listen",
    icon: "musical-notes-outline",
  },
];

const ACTIVE_COLOR = "hsl(75, 100%, 60%)";
const INACTIVE_COLOR = "hsl(0, 0%, 70%)";

function ShellNotificationBadge({ count, styles, style }) {
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
}

/**
 * Layout shell: header (logo + menu with notification badge) and bottom tab bar.
 * Expects a single {@link SafeAreaProvider} at the app root (see App.js).
 */
export default function AppShell({
  children,
  currentScreen,
  onOpenMenu,
  onTabPress,
  unreadNotificationCount,
  styles,
}) {
  const insets = useSafeAreaInsets();
  const tabBarLayoutStyle = useMemo(
    () => ({
      left: 16 + insets.left,
      right: 16 + insets.right,
    }),
    [insets.left, insets.right]
  );

  const showTabBar = !TAB_BAR_HIDDEN_SCREENS.has(currentScreen);

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
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
            <ShellNotificationBadge
              count={unreadNotificationCount}
              styles={styles}
              style={styles.menuNotificationBadge}
            />
          </TouchableOpacity>
        </View>
      </View>

      {children}

      {showTabBar && (
        <LinearGradient
          colors={["#000000", "#1a1a1a", "#000000"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.tabBar, tabBarLayoutStyle]}
        >
          {MAIN_TABS.map(({ key, label, icon }) => {
            const active = currentScreen === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.tab, active && styles.activeTab]}
                onPress={() => onTabPress(key)}
              >
                <Ionicons
                  name={icon}
                  size={20}
                  color={active ? ACTIVE_COLOR : INACTIVE_COLOR}
                />
                <Text
                  style={[styles.tabText, active && styles.activeTabText]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </LinearGradient>
      )}
    </SafeAreaView>
  );
}
