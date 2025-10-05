import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "../contexts/NavigationContext";
import { useAuth } from "../contexts/AuthContext";
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
} from "../lib/sharedStyles";

const SideMenu = () => {
  const { showMenu, closeMenu, navigateToScreen, currentScreen } = useNavigation();
  const { handleSignOut } = useAuth();

  const menuItems = [
    {
      id: "opportunities",
      icon: "briefcase-outline",
      label: "Opportunities",
      description: "Find your next gig",
    },
    {
      id: "connections",
      icon: "people-outline",
      label: "Connections",
      description: "Network with DJs",
    },
    {
      id: "listen",
      icon: "musical-notes-outline",
      label: "Listen",
      description: "Discover new mixes",
    },
    {
      id: "messages",
      icon: "chatbubbles-outline",
      label: "Messages",
      description: "View all conversations",
    },
    {
      id: "notifications",
      icon: "notifications-outline",
      label: "Notifications",
      description: "Stay updated on activity",
    },
    {
      id: "community",
      icon: "people-outline",
      label: "Community",
      description: "Connect with other DJs",
    },
    {
      id: "profile",
      icon: "person-outline",
      label: "Profile",
      description: "Manage your profile",
    },
    {
      id: "settings",
      icon: "settings-outline",
      label: "Settings",
      description: "App preferences",
    },
  ];

  const handleMenuItemPress = (screenId) => {
    navigateToScreen(screenId);
    closeMenu();
  };

  const handleSignOutPress = async () => {
    closeMenu();
    await handleSignOut();
  };

  return (
    <Modal
      visible={showMenu}
      transparent={true}
      animationType="fade"
      onRequestClose={closeMenu}
    >
      <View style={styles.menuOverlay}>
        <TouchableOpacity
          style={styles.menuOverlayTouchable}
          activeOpacity={1}
          onPress={closeMenu}
        />
        <Animated.View style={styles.menuContainer}>
          <View style={styles.menuHeader}>
            <Text style={styles.menuTitle}>Menu</Text>
            <TouchableOpacity onPress={closeMenu} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.menuItems}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.menuItem,
                  currentScreen === item.id && styles.menuItemActive,
                ]}
                onPress={() => handleMenuItemPress(item.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={COLORS.primary}
                />
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemText}>{item.label}</Text>
                  <Text style={styles.menuItemDescription}>
                    {item.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Sign Out Button */}
            <TouchableOpacity
              style={[styles.menuItem, styles.signOutItem]}
              onPress={handleSignOutPress}
              activeOpacity={0.7}
            >
              <Ionicons
                name="log-out-outline"
                size={20}
                color={COLORS.error}
              />
              <View style={styles.menuItemContent}>
                <Text style={[styles.menuItemText, styles.signOutText]}>
                  Sign Out
                </Text>
                <Text style={styles.menuItemDescription}>
                  Log out of your account
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  menuOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: "flex-end",
  },
  menuOverlayTouchable: {
    flex: 1,
  },
  menuContainer: {
    backgroundColor: COLORS.backgroundCard,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingBottom: SPACING["3xl"],
    maxHeight: "80%",
  },
  menuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuTitle: {
    fontSize: TYPOGRAPHY["2xl"],
    fontFamily: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.bold,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.base,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  menuItems: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.base,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.base,
    marginVertical: SPACING.xs,
  },
  menuItemActive: {
    backgroundColor: COLORS.backgroundSecondary,
  },
  menuItemContent: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  menuItemText: {
    fontSize: TYPOGRAPHY.base,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.semibold,
    marginBottom: 2,
  },
  menuItemDescription: {
    fontSize: TYPOGRAPHY.xs,
    fontFamily: TYPOGRAPHY.primary,
    color: COLORS.textSecondary,
  },
  signOutItem: {
    marginTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.lg,
  },
  signOutText: {
    color: COLORS.error,
  },
});

export default SideMenu;

