// Push notifications — device + token lifecycle (sending lives in notificationService.js).
import { Platform } from "react-native";
import { getOrCreatePushInstallId } from "./pushInstallId";
import { isExpoGo } from "./platformCapabilities";
import { registerExpoToken, unregisterExpoToken } from "./notificationService";
import { supabase } from "./supabase";

let Notifications;
let Device;

try {
  if (isExpoGo()) {
    if (__DEV__) {
      console.log("Running in Expo Go — push notifications disabled");
    }
  } else {
    Notifications = require("expo-notifications");
    Device = require("expo-device");
  }
} catch (e) {
  if (__DEV__) {
    console.warn("Push notifications not available:", e?.message);
  }
}

/** Session cache avoids duplicate getExpoPushTokenAsync calls (register + unregister). */
let cachedExpoPushToken = null;

async function resolveExpoPushToken() {
  if (!Notifications) return null;
  if (cachedExpoPushToken) return cachedExpoPushToken;
  try {
    const { data } = await Notifications.getExpoPushTokenAsync();
    cachedExpoPushToken = data ?? null;
    return cachedExpoPushToken;
  } catch (e) {
    if (__DEV__) {
      console.warn("getExpoPushTokenAsync failed:", e?.message);
    }
    return null;
  }
}

export function clearSessionExpoPushTokenCache() {
  cachedExpoPushToken = null;
}

/** Optional: App wires navigation / analytics when user opens a push. */
let pushNotificationTapHandler = null;

/**
 * @param {((payload: { type?: string, data?: object, actionIdentifier: string | null, response: object }) => void) | null} handler
 */
export function setPushNotificationTapHandler(handler) {
  pushNotificationTapHandler =
    typeof handler === "function" ? handler : null;
}

function dispatchNotificationTap(payload) {
  try {
    pushNotificationTapHandler?.(payload);
  } catch (e) {
    if (__DEV__) {
      console.warn("Push notification tap handler error:", e?.message);
    }
  }
}

let foregroundHandlerConfigured = false;

/**
 * Registers the in-app notification presentation handler. Idempotent; call from registration/listener setup.
 */
export function configurePushNotificationForegroundBehavior() {
  if (!Notifications || foregroundHandlerConfigured) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        // Intentionally false: app badge is driven by in-app unread counts, not APNs badge (avoids mismatch).
        shouldSetBadge: false,
      }),
    });
    foregroundHandlerConfigured = true;
  } catch (e) {
    if (__DEV__) {
      console.warn("Could not configure notification handler:", e?.message);
    }
  }
}

/**
 * Register for push notifications and store token in Supabase
 */
export async function registerForPushNotifications() {
  try {
    configurePushNotificationForegroundBehavior();

    if (!Notifications || !Device) {
      if (__DEV__) {
        console.log("Notifications not available — skipping registration");
      }
      return null;
    }

    if (!Device.isDevice) {
      if (__DEV__) {
        console.log("Must use physical device for push notifications");
      }
      return null;
    }

    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      if (__DEV__) {
        console.warn("Push permission not granted");
      }
      return null;
    }

    const token = await resolveExpoPushToken();
    if (!token) {
      if (__DEV__) {
        console.warn("No Expo push token (simulator, Expo Go, or native error)");
      }
      return null;
    }

    if (__DEV__) {
      console.log("Expo push token obtained");
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      if (__DEV__) {
        console.log("No authenticated user — token not stored in Supabase");
      }
      return token;
    }

    /** Stable per install; stored in `device_id` column (upsert). Not hardware identity. */
    const installId = await getOrCreatePushInstallId();
    const platform = ["ios", "android", "web"].includes(Platform.OS)
      ? Platform.OS
      : "web";

    const result = await registerExpoToken(user.id, token, installId, platform);

    if (result.success) {
      if (__DEV__) {
        console.log("Push notification token registered successfully");
      }
    } else {
      console.warn(
        "Push token registration failed (server):",
        result.error ?? "unknown"
      );
    }

    return token;
  } catch (error) {
    console.warn("Error registering for push notifications:", error?.message);
    return null;
  }
}

/**
 * Unregister push notifications for current user (this device’s token only).
 */
export async function unregisterPushNotifications() {
  try {
    if (!Notifications) {
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      if (__DEV__) {
        console.log("No authenticated user — skip unregister");
      }
      return;
    }

    const token = await resolveExpoPushToken();
    if (!token) {
      if (__DEV__) {
        console.warn("No Expo push token available for unregister");
      }
      return;
    }

    const result = await unregisterExpoToken(user.id, token);

    if (result.success) {
      if (__DEV__) {
        console.log("Push notification token unregistered successfully");
      }
    } else {
      console.warn(
        "Push token unregister failed (server):",
        result.error ?? "unknown"
      );
    }
  } catch (error) {
    console.warn("Error unregistering push notifications:", error?.message);
  }
}

/**
 * Setup notification listeners
 */
export function setupNotificationListeners() {
  configurePushNotificationForegroundBehavior();

  if (!Notifications) {
    if (__DEV__) {
      console.log("Notifications not available — skipping listener setup");
    }
    return () => {};
  }

  try {
    const notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (__DEV__) {
          console.log("Notification received:", notification?.request?.content?.title);
        }
      }
    );

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data =
          response?.notification?.request?.content?.data ?? {};
        const actionIdentifier = response?.actionIdentifier ?? null;

        dispatchNotificationTap({
          type: data?.type,
          data,
          actionIdentifier,
          response,
        });
      });

    return () => {
      try {
        Notifications.removeNotificationSubscription(notificationListener);
        Notifications.removeNotificationSubscription(responseListener);
      } catch (e) {
        if (__DEV__) {
          console.warn("Error removing notification listeners:", e?.message);
        }
      }
    };
  } catch (error) {
    if (__DEV__) {
      console.warn("Error setting up notification listeners:", error?.message);
    }
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
    console.warn("Error getting notification permissions:", error?.message);
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
    console.warn("Error requesting notification permissions:", error?.message);
    return "denied";
  }
}
