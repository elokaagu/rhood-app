// lib/notificationSetup.js
// Setup notification categories for iOS media controls

import { Platform } from "react-native";

// Conditionally import Notifications - fail gracefully in Expo Go
let Notifications;

try {
  // Only try to import if we're not in Expo Go
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    // Check if we're in Expo Go by looking for expo global
    const isExpoGo =
      typeof expo !== "undefined" && expo.Constants?.appOwnership === "expo";

    if (!isExpoGo) {
      Notifications = require("expo-notifications");
    } else {
      console.log("Running in Expo Go - notification setup disabled");
    }
  } else {
    // Production build - try to load modules
    Notifications = require("expo-notifications");
  }
} catch (e) {
  console.log("Notification setup not available:", e.message);
}

export const setupAudioNotificationCategories = async () => {
  if (!Notifications) {
    console.log(
      "Notifications not available - skipping audio notification categories"
    );
    return;
  }

  if (Platform.OS !== "ios") {
    return; // Android handles media controls differently
  }

  try {
    // Define the audio playback category with media controls
    const audioPlaybackCategory = {
      identifier: "AUDIO_PLAYBACK",
      actions: [
        {
          identifier: "PLAY_PAUSE",
          buttonTitle: "Play/Pause",
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: "NEXT_TRACK",
          buttonTitle: "Next",
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: "PREVIOUS_TRACK",
          buttonTitle: "Previous",
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
      ],
      options: {
        categorySummaryFormat: "%u new notifications from %@",
        customDismissAction: true,
        allowInCarPlay: true,
        allowAnnouncement: true,
      },
    };

    // Set the notification categories
    await Notifications.setNotificationCategoryAsync(
      audioPlaybackCategory.identifier,
      audioPlaybackCategory.actions,
      audioPlaybackCategory.options
    );

    console.log("✅ iOS notification categories configured for media controls");
  } catch (error) {
    console.error("❌ Error setting up notification categories:", error);
  }
};

export const requestNotificationPermissions = async () => {
  if (!Notifications) {
    console.log("Notifications not available - skipping permission request");
    return false;
  }

  try {
    const { status } = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
        allowAnnouncements: true,
        allowCriticalAlerts: false,
        provideAppNotificationSettings: true,
        allowProvisional: false,
      },
    });

    if (status === "granted") {
      console.log("✅ Notification permissions granted");
      return true;
    } else {
      console.log("❌ Notification permissions denied");
      return false;
    }
  } catch (error) {
    console.error("❌ Error requesting notification permissions:", error);
    return false;
  }
};

export const setupNotificationListeners = () => {
  if (!Notifications) {
    console.log("Notifications not available - skipping listener setup");
    return () => {};
  }

  try {
    // Set up notification handler for media controls
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const { data } = notification.request.content;

        // Handle media control actions
        if (data?.type === "audio_playback") {
          return {
            shouldShowAlert: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
          };
        }

        // Default behavior for other notifications
        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        };
      },
    });

    // Listen for notification responses (when user taps notification actions)
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { actionIdentifier, notification } = response;
        const { data } = notification.request.content;

        if (data?.type === "audio_playback") {
          // Handle media control actions
          switch (actionIdentifier) {
            case "PLAY_PAUSE":
              // Toggle play/pause
              console.log("🎵 Play/Pause tapped from lock screen");
              break;
            case "NEXT_TRACK":
              console.log("⏭️ Next track tapped from lock screen");
              break;
            case "PREVIOUS_TRACK":
              console.log("⏮️ Previous track tapped from lock screen");
              break;
            default:
              console.log("🎵 Notification tapped:", actionIdentifier);
          }
        }
      }
    );

    return subscription;
  } catch (error) {
    console.log("Error setting up notification listeners:", error.message);
    return () => {};
  }
};
