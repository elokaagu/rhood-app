// lib/lockScreenControls.js
// Lock screen controls using native iOS Now Playing and Android MediaStyle notifications

import { Platform } from "react-native";
import { Audio } from "expo-av";

let Notifications = null;
try {
  Notifications = require("expo-notifications");
} catch (error) {
  console.log(
    "⚠️ Notifications module not available:",
    error?.message || error,
  );
}

const ANDROID_CHANNEL_ID = "media-playback";
const CATEGORY_ID = "MEDIA_CONTROLS";
const UPDATE_THROTTLE_MS = 1200;

class LockScreenControls {
  constructor() {
    this.currentTrack = null;
    this.isPlaying = false;
    this.positionMillis = 0;
    this.durationMillis = 0;
    this.notificationId = null;
    this.callbacks = {};
    this.initialized = false;
    this.lastLockScreenUpdate = 0;
    this.responseSubscription = null;
  }

  async ensureInitialized() {
    if (this.initialized) {
      return;
    }

    // Configure audio mode for background playback and native Now Playing on iOS
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true, // Critical for iOS Now Playing
        playsInSilentModeIOS: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
      console.log("✅ Audio mode configured for native lock screen controls");
    } catch (error) {
      console.log("⚠️ Failed to configure audio mode:", error);
    }

    // Android: Set up MediaStyle notifications
    if (Platform.OS === "android" && Notifications) {
      await Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });

      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: "Playback",
        importance: Notifications.AndroidImportance.HIGH,
        sound: null,
        vibrationPattern: [0],
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });

      await this.updateAndroidCategory();

      // Listen for notification button presses (Android only)
      this.responseSubscription =
        Notifications.addNotificationResponseReceivedListener((response) => {
          const action = response.actionIdentifier;

          if (action === "PLAY_PAUSE") {
            this.callbacks.onPlayPause?.();
          } else if (action === "NEXT") {
            this.callbacks.onNext?.();
          } else if (action === "PREVIOUS") {
            this.callbacks.onPrevious?.();
          }
        });
    }

    // iOS: expo-av automatically handles native Now Playing via MPNowPlayingInfoCenter
    // No manual notification setup needed - just ensure audio mode is configured

    this.initialized = true;
  }

  async setupMediaCategories() {
    await this.ensureInitialized();
  }

  setCallbacks(callbacks = {}) {
    this.callbacks = callbacks;
  }

  async showLockScreenNotification(track) {
    await this.ensureInitialized();
    this.currentTrack = track;
    if (track?.durationMillis) {
      this.durationMillis = track.durationMillis;
    }

    if (Platform.OS === "android" && Notifications) {
      // Android: Show MediaStyle notification
      await this.updateAndroidNotification(true);
    }
    // iOS: expo-av automatically shows native Now Playing when audio starts playing
    // No manual notification needed - it uses MPNowPlayingInfoCenter natively
  }

  async setPlaybackState(isPlaying, positionMillis, durationMillis) {
    this.isPlaying = !!isPlaying;
    if (typeof positionMillis === "number" && !Number.isNaN(positionMillis)) {
      this.positionMillis = Math.max(positionMillis, 0);
    }
    if (typeof durationMillis === "number" && durationMillis > 0) {
      this.durationMillis = durationMillis;
    }

    if (Platform.OS === "android" && Notifications) {
      // Android: Update MediaStyle notification
      await this.updateAndroidCategory();
      await this.updateAndroidNotification(false);
    }
    // iOS: expo-av automatically updates native Now Playing controls
    // The Sound object's playback status updates MPNowPlayingInfoCenter automatically
  }

  async updateAndroidCategory() {
    if (!(Platform.OS === "android" && Notifications)) {
      return;
    }

    await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
      {
        identifier: "PREVIOUS",
        buttonTitle: "Prev",
      },
      {
        identifier: "PLAY_PAUSE",
        buttonTitle: this.isPlaying ? "Pause" : "Play",
      },
      {
        identifier: "NEXT",
        buttonTitle: "Next",
      },
    ]);
  }

  async updateAndroidNotification(forceUpdate) {
    if (!(Platform.OS === "android" && Notifications)) {
      return;
    }
    if (!this.currentTrack) {
      return;
    }

    const now = Date.now();
    if (!forceUpdate && now - this.lastLockScreenUpdate < UPDATE_THROTTLE_MS) {
      return;
    }
    this.lastLockScreenUpdate = now;

    const progress =
      this.durationMillis > 0
        ? Math.min(
            100,
            Math.max(
              0,
              Math.floor((this.positionMillis / this.durationMillis) * 100),
            ),
          )
        : undefined;

    const content = {
      title: this.currentTrack.title || "R/HOOD Mix",
      body: this.currentTrack.artist || "Unknown Artist",
      categoryIdentifier: CATEGORY_ID,
      data: {
        type: "media",
        trackId: this.currentTrack.id ?? null,
        isPlaying: this.isPlaying,
      },
      android: {
        channelId: ANDROID_CHANNEL_ID,
        color: "#B7FF3C",
        sticky: true,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        usesChronometer: this.isPlaying,
        ongoing: this.isPlaying,
        progress,
      },
    };

    if (this.currentTrack.image) {
      content.android.largeIcon = this.currentTrack.image;
    }

    if (this.notificationId) {
      try {
        await Notifications.dismissNotificationAsync(this.notificationId);
      } catch (error) {
        console.log("⚠️ Failed to dismiss old notification:", error);
      }
    }

    try {
      this.notificationId = await Notifications.scheduleNotificationAsync({
        content,
        trigger: null,
      });
    } catch (error) {
      console.log("❌ Failed to schedule media notification:", error);
    }
  }

  async hideLockScreenNotification() {
    if (!Notifications || !this.notificationId) {
      return;
    }

    try {
      await Notifications.dismissNotificationAsync(this.notificationId);
    } catch (error) {
      console.log("⚠️ Failed to dismiss media notification:", error);
    }
    this.notificationId = null;
  }

  async teardown() {
    if (this.responseSubscription) {
      this.responseSubscription.remove();
      this.responseSubscription = null;
    }
    this.initialized = false;
    this.lastLockScreenUpdate = 0;
    await this.hideLockScreenNotification();
  }
}

const lockScreenControls = new LockScreenControls();

export default lockScreenControls;
