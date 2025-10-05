import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "../contexts/NavigationContext";
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  sharedStyles,
} from "../lib/sharedStyles";

const MainNavigation = () => {
  const { currentScreen, navigateToScreen } = useNavigation();

  const navigationItems = [
    { id: "opportunities", icon: "briefcase-outline", label: "Opportunities" },
    { id: "listen", icon: "musical-notes-outline", label: "Listen" },
    { id: "connections", icon: "people-outline", label: "Connections" },
    { id: "messages", icon: "mail-outline", label: "Messages" },
    { id: "profile", icon: "person-outline", label: "Profile" },
  ];

  return (
    <View style={styles.navigationContainer}>
      {navigationItems.map((item) => {
        const isActive = currentScreen === item.id;

        return (
          <TouchableOpacity
            key={item.id}
            style={styles.navItem}
            onPress={() => navigateToScreen(item.id)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.navIconContainer,
                isActive && styles.activeNavIconContainer,
              ]}
            >
              <Ionicons
                name={item.icon}
                size={20}
                color={isActive ? COLORS.background : COLORS.textSecondary}
              />
            </View>
            <Text style={[styles.navLabel, isActive && styles.activeNavLabel]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  navigationContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.base,
    justifyContent: "space-around",
    alignItems: "center",
  },
  navItem: {
    alignItems: "center",
    flex: 1,
    paddingVertical: SPACING.xs,
  },
  navIconContainer: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.base,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  activeNavIconContainer: {
    backgroundColor: COLORS.primary,
  },
  navLabel: {
    fontSize: TYPOGRAPHY.xs,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  activeNavLabel: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.semibold,
  },
});

export default MainNavigation;
