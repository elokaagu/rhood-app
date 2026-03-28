import React, {
  useState,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from "react";
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
import { COLORS, SPACING, sharedStyles } from "../lib/sharedStyles";
import { db } from "../lib/supabase";
import {
  registerForPushNotifications,
  unregisterPushNotifications,
} from "../lib/pushNotifications";
import { HapticPatterns } from "../lib/haptics";
import AppScreenTutorialModal from "./AppScreenTutorialModal";
import { useAppTutorialModal } from "../hooks/useAppTutorialModal";
import { APP_TUTORIAL_SCREEN_IDS } from "../lib/appTutorialContent";
import ProductFeedbackPanel from "./ProductFeedbackPanel";

export default function SettingsScreen({
  user,
  onNavigate,
  onSignOut,
  onNotificationPreferencesChange,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const { tutorialModalProps } = useAppTutorialModal(APP_TUTORIAL_SCREEN_IDS.SETTINGS);

  const [settings, setSettings] = useState({
    showEmail: true,
    showPhone: false,
    pushNotifications: true,
    messageNotifications: false,
  });
  const [savingKeys, setSavingKeys] = useState({});
  const savingKeysRef = useRef({});

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      if (!user?.id) return;

      try {
        const [userProfile, userSettings] = await Promise.all([
          db.getUserProfile(user.id),
          db.getUserSettings(user.id),
        ]);

        if (!isMounted) return;

        setSettings((prev) => ({
          ...prev,
          showEmail: userProfile?.show_email ?? true,
          showPhone: userProfile?.show_phone ?? false,
          pushNotifications: userSettings?.push_notifications ?? true,
          messageNotifications: userSettings?.message_notifications ?? false,
        }));
      } catch (error) {
        console.error("❌ Error loading settings:", error);
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  const handleToggle = useCallback(
    async (key, value) => {
      if (savingKeysRef.current[key]) return;
      savingKeysRef.current[key] = true;
      setSavingKeys((prev) => ({ ...prev, [key]: true }));
      try {
        HapticPatterns.toggle();
      } catch (_) {}

      setSettings((prev) => ({ ...prev, [key]: value }));

      const revert = () => {
        setSettings((prev) => ({ ...prev, [key]: !value }));
      };

      try {
        if (!user?.id) {
          return;
        }

        if (key === "showEmail" || key === "showPhone") {
          const updateData = {
            [key === "showEmail" ? "show_email" : "show_phone"]: value,
          };
          await db.updateUserProfile(user.id, updateData);
          return;
        }

        if (key === "pushNotifications" || key === "messageNotifications") {
          if (key === "pushNotifications") {
            if (value) {
              const token = await registerForPushNotifications();
              if (!token) {
                throw new Error(
                  "Push notifications require permissions. Check your device settings."
                );
              }
            } else {
              await unregisterPushNotifications();
            }
          }

          const columnName =
            key === "pushNotifications"
              ? "push_notifications"
              : "message_notifications";

          await db.upsertUserSettings(user.id, { [columnName]: value });
          onNotificationPreferencesChange?.();
          return;
        }
      } catch (error) {
        console.error(`❌ Failed to save ${key}:`, error);
        revert();
        Alert.alert(
          "Update Failed",
          "We couldn't save your preference. Please try again."
        );
      } finally {
        savingKeysRef.current[key] = false;
        setSavingKeys((prev) => ({ ...prev, [key]: false }));
      }
    },
    [user?.id, onNotificationPreferencesChange]
  );

  const handleSignOut = useCallback(() => {
    setShowSignOutModal(true);
  }, []);

  const confirmSignOut = useCallback(() => {
    setShowSignOutModal(false);
    onSignOut?.();
  }, [onSignOut]);

  const handleOpenLink = useCallback((url) => {
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "Could not open link");
    });
  }, []);

  const settingsSections = useMemo(
    () => [
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
            action: () => onNavigate?.("edit-profile"),
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
            subtitle: "Get notifications for new messages (opt-in)",
            icon: "chatbubble",
            type: "toggle",
            value: settings.messageNotifications,
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
            action: () => onNavigate?.("help"),
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
            id: "tutorialMode",
            title: "Tutorial mode",
            subtitle: "Learn how to use the app",
            icon: "school-outline",
            type: "navigate",
            action: () => onNavigate?.("tutorial-mode"),
          },
          {
            id: "productFeedbackEmbed",
            type: "embed",
            title: "Product feedback",
            subtitle: "Send ideas and bug reports to our team",
          },
          {
            id: "privacyPolicy",
            title: "Privacy Policy",
            subtitle: "Read our privacy policy",
            icon: "document-text",
            type: "navigate",
            action: () => onNavigate?.("privacy"),
          },
          {
            id: "termsOfService",
            title: "Terms of Service",
            subtitle: "Read our terms of service",
            icon: "document",
            type: "navigate",
            action: () => onNavigate?.("terms"),
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
          },
        ],
      },
    ],
    [
      settings.showEmail,
      settings.showPhone,
      settings.pushNotifications,
      settings.messageNotifications,
      onNavigate,
      handleSignOut,
    ]
  );

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
  }, [searchQuery, settingsSections]);

  const renderSettingItem = useCallback(
    (item, isLast) => {
      const handlePress = () => {
        HapticPatterns.buttonPress();
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

      const SettingContainer = item.type === "toggle" ? View : TouchableOpacity;
      const containerProps =
        item.type === "toggle"
          ? {
              style: [styles.settingItem, isLast && styles.settingItemLast],
            }
          : {
              style: [styles.settingItem, isLast && styles.settingItemLast],
              onPress: handlePress,
              activeOpacity: 0.7,
            };

      return (
        <SettingContainer key={item.id} {...containerProps}>
          <View style={styles.settingLeft}>
            <View style={styles.settingIcon}>
              <Ionicons
                name={item.icon}
                size={20}
                color="hsl(75, 100%, 60%)"
              />
            </View>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>{item.title}</Text>
              <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
            </View>
          </View>

          <View style={styles.settingRight}>
            {item.type === "toggle" && (
              <Switch
                value={settings[item.id] || false}
                onValueChange={(newValue) => handleToggle(item.id, newValue)}
                disabled={!!savingKeys[item.id]}
                trackColor={{
                  false: "hsl(0, 0%, 20%)",
                  true: "hsl(75, 100%, 60%)",
                }}
                thumbColor={
                  settings[item.id] ? "hsl(0, 0%, 100%)" : "hsl(0, 0%, 70%)"
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
                <Ionicons
                  name="chevron-down"
                  size={16}
                  color="hsl(0, 0%, 50%)"
                />
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
        </SettingContainer>
      );
    },
    [settings, handleToggle, handleOpenLink]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        <View style={styles.header}>
          <Text style={styles.tsBlockBoldHeading}>SETTINGS</Text>
        </View>

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
                {section.items.map((item, index, items) => {
                  if (item.type === "embed") {
                    const isLast = index === items.length - 1;
                    return (
                      <View
                        key={item.id}
                        style={[
                          styles.embedPanel,
                          isLast && styles.settingItemLast,
                        ]}
                      >
                        <ProductFeedbackPanel user={user} />
                      </View>
                    );
                  }
                  return renderSettingItem(
                    item,
                    index === items.length - 1
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>R/HOOD</Text>
          <Text style={styles.versionSubtext}>Made with ❤️ for DJs</Text>
        </View>
      </ScrollView>

      <LinearGradient
        colors={["transparent", "rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0.8)"]}
        style={styles.bottomGradient}
        pointerEvents="none"
      />

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
      {tutorialModalProps ? (
        <AppScreenTutorialModal {...tutorialModalProps} />
      ) : null}
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
    height: 160,
    pointerEvents: "none",
  },
  header: {
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tsBlockBoldHeading: {
    fontFamily: "TS Block Bold",
    fontSize: 22,
    color: "#FFFFFF",
    textAlign: "left",
    textTransform: "uppercase",
    lineHeight: 26,
    letterSpacing: 1,
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
    fontFamily: "TS Block Bold",
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
  embedPanel: {
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
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
  settingItemLast: {
    borderBottomWidth: 0,
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
  settingSubtitle: {
    fontSize: 14,
    color: "hsl(0, 0%, 70%)",
    fontFamily: "Helvetica Neue",
  },
  destructiveSubtitle: {
    color: "hsla(0, 100%, 70%, 0.85)",
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
