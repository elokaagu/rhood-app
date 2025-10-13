import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Switch,
  Alert,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import RhoodModal from "./RhoodModal";
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  sharedStyles,
} from "../lib/sharedStyles";
import { db } from "../lib/supabase";

export default function SettingsScreen({ user, onNavigate, onSignOut }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const [settings, setSettings] = useState({
    // Account Settings
    profileVisibility: "public",
    showEmail: true,
    showPhone: false,
    allowMessages: true,

    // Notification Settings
    pushNotifications: true,
    emailNotifications: true,
    gigReminders: true,
    messageNotifications: true,
    communityUpdates: false,

    // App Settings
    language: "en",
    autoPlay: false,
    dataUsage: "wifi",
    cacheSize: "500MB",

    // Privacy Settings
    locationSharing: true,
    analyticsTracking: true,
    crashReporting: true,
    personalizedAds: false,
  });

  // Load privacy settings from database
  useEffect(() => {
    const loadPrivacySettings = async () => {
      if (!user?.id) return;

      try {
        const userProfile = await db.getUserProfile(user.id);
        if (userProfile) {
          setSettings((prev) => ({
            ...prev,
            showEmail: userProfile.show_email ?? true,
            showPhone: userProfile.show_phone ?? false,
          }));
        }
      } catch (error) {
        console.error("❌ Error loading privacy settings:", error);
      }
    };

    loadPrivacySettings();
  }, [user?.id]);

  const handleSettingChange = async (key, value) => {
    console.log("🔄 Setting change:", key, "from", settings[key], "to", value);
    
    // Update state immediately for responsive UI
    setSettings((prev) => ({ ...prev, [key]: value }));

    // Save privacy settings to database
    if (key === "showEmail" || key === "showPhone") {
      try {
        await db.updateUserProfile(user.id, {
          [key === "showEmail" ? "show_email" : "show_phone"]: value,
        });
        console.log("✅ Privacy setting saved to database:", key, value);
      } catch (error) {
        console.error("❌ Error saving privacy setting:", error);
        // Revert the setting if database save fails
        setSettings((prev) => ({ ...prev, [key]: !value }));
        Alert.alert(
          "Error",
          "Failed to save setting. Please try again.",
          [{ text: "OK" }]
        );
      }
    } else {
      // For other settings, just log success
      console.log("✅ Setting updated locally:", key, value);
    }
  };

  const handleSignOut = () => {
    setShowSignOutModal(true);
  };

  const confirmSignOut = () => {
    setShowSignOutModal(false);
    onSignOut && onSignOut();
  };

  const handleOpenLink = (url) => {
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open link");
    });
  };

  const handleClearCache = () => {
    Alert.alert("Clear Cache", "This will clear all cached data. Continue?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          setSettings((prev) => ({ ...prev, cacheSize: "0MB" }));
          Alert.alert("Success", "Cache cleared successfully");
        },
      },
    ]);
  };

  const settingsSections = [
    {
      id: "account",
      title: "Account",
      icon: "person",
      items: [
        {
          id: "editProfile",
          title: "Edit Profile",
          subtitle: "Update your personal information",
          icon: "create",
          type: "navigate",
          action: () => onNavigate && onNavigate("edit-profile"),
        },
        {
          id: "showEmail",
          title: "Show Email",
          subtitle: "Display email on profile",
          icon: "mail",
          type: "toggle",
          value: settings.showEmail,
        },
        {
          id: "showPhone",
          title: "Show Phone",
          subtitle: "Display phone number on profile",
          icon: "call",
          type: "toggle",
          value: settings.showPhone,
        },
      ],
    },
    {
      id: "notifications",
      title: "Notifications",
      icon: "notifications",
      items: [
        {
          id: "pushNotifications",
          title: "Push Notifications",
          subtitle: "Receive push notifications",
          icon: "phone-portrait",
          type: "toggle",
          value: settings.pushNotifications,
        },
        {
          id: "messageNotifications",
          title: "Message Notifications",
          subtitle: "Notifications for new messages",
          icon: "chatbubble",
          type: "toggle",
          value: settings.messageNotifications,
        },
        {
          id: "communityUpdates",
          title: "Community Updates",
          subtitle: "Updates from communities",
          icon: "people",
          type: "toggle",
          value: settings.communityUpdates,
        },
      ],
    },
    {
      id: "support",
      title: "Support & Info",
      icon: "help-circle",
      items: [
        {
          id: "help",
          title: "Help Center",
          subtitle: "Get help and support",
          icon: "help",
          type: "navigate",
          action: () => onNavigate && onNavigate("help"),
        },
        {
          id: "contact",
          title: "Contact Us",
          subtitle: "Send feedback or report issues",
          icon: "mail",
          type: "link",
          url: "mailto:hello@rhood.io",
        },
        {
          id: "privacyPolicy",
          title: "Privacy Policy",
          subtitle: "Read our privacy policy",
          icon: "document-text",
          type: "navigate",
          action: () => onNavigate && onNavigate("privacy"),
        },
        {
          id: "termsOfService",
          title: "Terms of Service",
          subtitle: "Read our terms of service",
          icon: "document",
          type: "navigate",
          action: () => onNavigate && onNavigate("terms"),
        },
      ],
    },
    {
      id: "accountActions",
      title: "Account",
      icon: "person-circle",
      items: [
        {
          id: "signOut",
          title: "Sign Out",
          subtitle: "Sign out of your account",
          icon: "log-out",
          type: "action",
          action: handleSignOut,
          destructive: false,
        },
      ],
    },
  ];

  // Filter settings based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) {
      return settingsSections;
    }

    const query = searchQuery.toLowerCase();
    return settingsSections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.title.toLowerCase().includes(query) ||
            item.subtitle.toLowerCase().includes(query)
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [searchQuery]);

  const renderSettingItem = (item) => {
    const handlePress = () => {
      // Don't handle press for toggle items - let the Switch handle it
      if (item.type === "toggle") {
        return;
      }
      
      if (item.type === "navigate" && item.action) {
        item.action();
      } else if (item.type === "link" && item.url) {
        handleOpenLink(item.url);
      } else if (item.type === "action" && item.action) {
        item.action();
      } else if (item.onPress) {
        item.onPress();
      }
    };

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.settingItem}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.settingLeft}>
          <View style={styles.settingIcon}>
            <Ionicons name={item.icon} size={20} color="hsl(75, 100%, 60%)" />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingTitle}>{item.title}</Text>
            <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
          </View>
        </View>

        <View style={styles.settingRight}>
          {item.type === "toggle" && (
            <Switch
              value={item.value}
              onValueChange={(newValue) => {
                console.log(
                  "🔘 Switch toggled:",
                  item.id,
                  "from",
                  item.value,
                  "to",
                  newValue
                );
                // Extract the setting key from the item
                const settingKey = item.id;
                handleSettingChange(settingKey, newValue);
              }}
              trackColor={{
                false: "hsl(0, 0%, 20%)",
                true: "hsl(75, 100%, 60%)",
              }}
              thumbColor={
                item.value ? "hsl(0, 0%, 100%)" : "hsl(0, 0%, 70%)"
              }
            />
          )}
          {item.type === "select" && (
            <View style={styles.selectContainer}>
              <Text style={styles.selectText}>
                {
                  item.options.find((opt) => opt.value === item.currentValue)
                    ?.label
                }
              </Text>
              <Ionicons name="chevron-down" size={16} color="hsl(0, 0%, 50%)" />
            </View>
          )}
          {(item.type === "navigate" ||
            item.type === "link" ||
            item.type === "action") && (
            <Ionicons
              name="chevron-forward"
              size={16}
              color="hsl(0, 0%, 50%)"
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.tsBlockBoldHeading}>SETTINGS</Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="hsl(0, 0%, 50%)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search settings..."
            placeholderTextColor="hsl(0, 0%, 50%)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="hsl(0, 0%, 50%)" />
            </TouchableOpacity>
          )}
        </View>

        {/* Settings Sections */}
        <View style={styles.settingsContainer}>
          {filteredSections.map((section) => (
            <View key={section.id} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons
                  name={section.icon}
                  size={20}
                  color="hsl(75, 100%, 60%)"
                />
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <View style={styles.sectionContent}>
                {section.items.map(renderSettingItem)}
              </View>
            </View>
          ))}
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>R/HOOD v1.0.0</Text>
          <Text style={styles.versionSubtext}>Made with ❤️ for DJs</Text>
        </View>
      </ScrollView>

      {/* Bottom gradient fade overlay */}
      <LinearGradient
        colors={["transparent", "rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0.8)"]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

      {/* Sign Out Modal */}
      <RhoodModal
        visible={showSignOutModal}
        onClose={() => setShowSignOutModal(false)}
        type="warning"
        title="Sign Out"
        message="Are you sure you want to sign out?"
        primaryButtonText="Sign Out"
        secondaryButtonText="Cancel"
        onPrimaryPress={confirmSignOut}
        onSecondaryPress={() => setShowSignOutModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...sharedStyles.container,
    width: "100%",
  },
  scrollView: {
    flex: 1,
    width: "100%",
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  header: {
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "hsl(0, 0%, 100%)",
    fontFamily: "Helvetica Neue",
  },
  clearButton: {
    padding: 4,
  },
  settingsContainer: {
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "TS-Block-Bold",
    color: "hsl(75, 100%, 60%)",
    marginLeft: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionContent: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
    overflow: "hidden",
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
    minHeight: 60,
  },
  destructiveItem: {
    borderBottomWidth: 0,
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  destructiveIcon: {
    backgroundColor: "hsl(0, 100%, 60%)",
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    color: "hsl(0, 0%, 100%)",
    fontFamily: "Helvetica Neue",
    fontWeight: "500",
    marginBottom: 2,
  },
  destructiveText: {
    color: "hsl(0, 100%, 60%)",
    fontSize: 14,
  },
  destructiveSubtitle: {
    fontSize: 12,
  },
  settingSubtitle: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Helvetica Neue",
  },
  settingRight: {
    alignItems: "center",
    minWidth: 60,
    marginLeft: 12,
  },
  selectContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 15%)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  selectText: {
    fontSize: 12,
    color: "hsl(0, 0%, 100%)",
    fontFamily: "Helvetica Neue",
    marginRight: 4,
  },
  versionContainer: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  versionText: {
    fontSize: 14,
    color: "hsl(0, 0%, 50%)",
    fontFamily: "Helvetica Neue",
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 12,
    color: "hsl(0, 0%, 40%)",
    fontFamily: "Helvetica Neue",
  },
});
