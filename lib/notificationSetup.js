// lib/notificationSetup.js
// iOS notification categories + response listener for media-style actions (Expo Notifications).

import { Platform } from "react-native";
import { audioPlaybackBridge } from "./audioPlaybackBridge";
import { isExpoGo } from "./platformCapabilities";

/** Category identifiers — extend this map as you add more notification families. */
export const IOS_NOTIFICATION_CATEGORIES = {
  AUDIO_PLAYBACK: "AUDIO_PLAYBACK",
};

/** Action identifiers registered on AUDIO_PLAYBACK (must match setNotificationCategoryAsync). */
export const IOS_AUDIO_NOTIFICATION_ACTIONS = {
  PLAY_PAUSE: "PLAY_PAUSE",
  NEXT_TRACK: "NEXT_TRACK",
  PREVIOUS_TRACK: "PREVIOUS_TRACK",
};

let Notifications;

try {
  if (isExpoGo()) {
    if (__DEV__) {
      console.log("Expo Go: skipping expo-notifications (audio categories / listener)");
    }
  } else {
    Notifications = require("expo-notifications");
  }
} catch (e) {
  if (__DEV__) {
    console.log("Notification setup not available:", e?.message);
  }
}

/**
 * Run play/pause / next / previous using the same bridge as native Now Playing (iOS).
 * Safe no-op if audio hook has not mounted yet.
 */
export function dispatchAudioPlaybackNotificationAction(actionIdentifier) {
  const actions = audioPlaybackBridge.actionsRef?.current;
  const state = audioPlaybackBridge.stateRef?.current;
  if (!actions) {
    if (__DEV__) {
      console.log(
        "Audio notification action ignored (playback not mounted):",
        actionIdentifier
      );
    }
    return;
  }

  switch (actionIdentifier) {
    case IOS_AUDIO_NOTIFICATION_ACTIONS.PLAY_PAUSE:
      if (state?.isPlaying) {
        actions.pauseGlobalAudio?.();
      } else {
        actions.resumeGlobalAudio?.();
      }
      break;
    case IOS_AUDIO_NOTIFICATION_ACTIONS.NEXT_TRACK:
      actions.playNextTrack?.();
      break;
    case IOS_AUDIO_NOTIFICATION_ACTIONS.PREVIOUS_TRACK:
      actions.playPreviousTrack?.();
      break;
    default:
      break;
  }
}

export const setupAudioNotificationCategories = async () => {
  if (!Notifications) {
    if (__DEV__) {
      console.log(
        "Notifications not available - skipping audio notification categories"
      );
    }
    return;
  }

  if (Platform.OS !== "ios") {
    return;
  }

  try {
    const id = IOS_NOTIFICATION_CATEGORIES.AUDIO_PLAYBACK;
    const audioPlaybackCategory = {
      identifier: id,
      actions: [
        {
          identifier: IOS_AUDIO_NOTIFICATION_ACTIONS.PLAY_PAUSE,
          buttonTitle: "Play/Pause",
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: IOS_AUDIO_NOTIFICATION_ACTIONS.NEXT_TRACK,
          buttonTitle: "Next",
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: IOS_AUDIO_NOTIFICATION_ACTIONS.PREVIOUS_TRACK,
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

    await Notifications.setNotificationCategoryAsync(
      audioPlaybackCategory.identifier,
      audioPlaybackCategory.actions,
      audioPlaybackCategory.options
    );

    if (__DEV__) {
      console.log("✅ iOS notification categories configured for media controls");
    }
  } catch (error) {
    console.error("❌ Error setting up notification categories:", error);
  }
};

export const requestNotificationPermissions = async () => {
  if (!Notifications) {
    if (__DEV__) {
      console.log("Notifications not available - skipping permission request");
    }
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
      if (__DEV__) {
        console.log("✅ Notification permissions granted");
      }
      return true;
    }
    if (__DEV__) {
      console.log("❌ Notification permissions denied");
    }
    return false;
  } catch (error) {
    console.error("❌ Error requesting notification permissions:", error);
    return false;
  }
};

export const setupNotificationListeners = () => {
  if (!Notifications) {
    if (__DEV__) {
      console.log("Notifications not available - skipping listener setup");
    }
    return { remove: () => {} };
  }

  try {
    // Applies to all notifications; keep audio_playback fast-path discrete. For many types,
    // consider splitting behaviors or moving media to a dedicated channel on the native side.
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const { data } = notification.request.content;

        if (data?.type === "audio_playback") {
          return {
            shouldShowAlert: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
          };
        }

        return {
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        };
      },
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { actionIdentifier, notification } = response;
        const { data } = notification.request.content;

        if (data?.type === "audio_playback") {
          dispatchAudioPlaybackNotificationAction(actionIdentifier);
        }
      }
    );

    return subscription;
  } catch (error) {
    if (__DEV__) {
      console.log("Error setting up notification listeners:", error.message);
    }
    return { remove: () => {} };
  }
};
