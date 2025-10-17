// Push notifications module - gracefully handles Expo Go limitations
import { Platform } from "react-native";
import { supabase } from "./supabase";
import { registerExpoToken, unregisterExpoToken } from "./notificationService";

// Conditionally import Notifications - fail gracefully in Expo Go
let Notifications, Device;

try {
  // Only try to import if we're not in Expo Go
  if (typeof __DEV__ !== "undefined" && __DEV__) {
    // Check if we're in Expo Go by looking for expo global
    const isExpoGo =
      typeof expo !== "undefined" && expo.Constants?.appOwnership === "expo";

    if (!isExpoGo) {
      Notifications = require("expo-notifications");
      Device = require("expo-device");
    } else {
      console.log("Running in Expo Go - push notifications disabled");
    }
  } else {
    // Production build - try to load modules
    Notifications = require("expo-notifications");
    Device = require("expo-device");
  }
} catch (e) {
  console.log("Push notifications not available:", e.message);
}

// Configure notification behavior
if (Notifications) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (e) {
    console.log("Could not configure notification handler:", e.message);
  }
}

/**
 * Register for push notifications and store token in Supabase
 */
export async function registerForPushNotifications() {
  try {
    // Return null if Notifications not available
    if (!Notifications || !Device) {
      console.log("Notifications not available - skipping registration");
      return null;
    }

    // Check if device supports push notifications
    if (!Device.isDevice) {
      console.log("Must use physical device for push notifications");
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not granted
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Failed to get push token for push notification!");
      return null;
    }

    // Get the push token
    let token;
    try {
      token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log("Expo push token:", token);
    } catch (error) {
      console.log(
        "Failed to get Expo push token (likely running in Expo Go):",
        error.message
      );
      return null;
    }

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log("No authenticated user found");
      return token;
    }

    // Register token in Supabase
    const deviceId = Device.osInternalBuildId || Device.modelId || "unknown";
    const platform =
      Platform.OS === "ios"
        ? "ios"
        : Platform.OS === "android"
        ? "android"
        : "web";

    const result = await registerExpoToken(user.id, token, deviceId, platform);

    if (result.success) {
      console.log("Push notification token registered successfully");
    } else {
      console.error(
        "Failed to register push notification token:",
        result.error
      );
    }

    return token;
  } catch (error) {
    console.error("Error registering for push notifications:", error);
    return null;
  }
}

/**
 * Unregister push notifications for current user
 */
export async function unregisterPushNotifications() {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.log("No authenticated user found");
      return;
    }

    const result = await unregisterExpoToken(user.id);

    if (result.success) {
      console.log("Push notification token unregistered successfully");
    } else {
      console.error(
        "Failed to unregister push notification token:",
        result.error
      );
    }
  } catch (error) {
    console.error("Error unregistering push notifications:", error);
  }
}

/**
 * Setup notification listeners
 */
export function setupNotificationListeners() {
  // Return empty function if Notifications not available
  if (!Notifications) {
    console.log("Notifications not available - skipping listener setup");
    return () => {};
  }

  try {
    // Listen for notifications received while app is running
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        console.log("Notification received:", notification);
        // You can handle the notification here, e.g., update UI, show toast, etc.
      }
    );

    // Listen for notification taps
    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("Notification tapped:", response);

        const data = response.notification.request.content.data;

        // Handle different notification types
        if (data?.type === "application_approved") {
          // Navigate to opportunities or show success message
          console.log("Application approved notification tapped");
        } else if (data?.type === "application_rejected") {
          // Navigate to opportunities or show message
          console.log("Application rejected notification tapped");
        }

        // You can add navigation logic here based on notification data
      });

    return () => {
      try {
        Notifications.removeNotificationSubscription(notificationListener);
        Notifications.removeNotificationSubscription(responseListener);
      } catch (e) {
        console.log("Error removing notification listeners:", e.message);
      }
    };
  } catch (error) {
    console.log("Error setting up notification listeners:", error.message);
    return () => {};
  }
}

/**
 * Get notification permissions status
 */
export async function getNotificationPermissions() {
  try {
    if (!Notifications) {
      return "unavailable";
    }
    const { status } = await Notifications.getPermissionsAsync();
    return status;
  } catch (error) {
    console.error("Error getting notification permissions:", error);
    return "undetermined";
  }
}

/**
 * Request notification permissions
 */
export async function requestNotificationPermissions() {
  try {
    if (!Notifications) {
      return "unavailable";
    }
    const { status } = await Notifications.requestPermissionsAsync();
    return status;
  } catch (error) {
    console.error("Error requesting notification permissions:", error);
    return "denied";
  }
}
