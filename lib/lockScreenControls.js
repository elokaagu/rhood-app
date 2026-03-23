// lib/lockScreenControls.js
// Lock screen controls for Android MediaStyle notifications.
// iOS: MPNowPlayingInfoCenter via native NowPlayingInfoModule + lib/nowPlayingInfo.js

import { Platform } from "react-native";
import { Audio } from "expo-av";

let Notifications = null;
try {
  Notifications = require("expo-notifications");
} catch (error) {
  console.log("⚠️ Notifications module not available:", error?.message || error);
}

const ANDROID_CHANNEL_ID = "media-playback";
const CATEGORY_ID = "MEDIA_CONTROLS";
const UPDATE_THROTTLE_MS = 1000; // Update at most once per second

class LockScreenControls {
  constructor() {
    this.currentTrack = null;
    this.isPlaying = false;
    this.positionMillis = 0;
    this.durationMillis = 0;
    this.notificationId = null;
    this.callbacks = {};
    this.initialized = false;
    this.lastUpdate = 0;
    this.responseSubscription = null;
  }

  /**
   * Initialize lock screen controls
   * Sets up audio mode and notification channel (Android only)
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    if (Platform.OS === "ios") {
      this.initialized = true;
      return;
    }

    // Android: Set up MediaStyle notifications
    if (Platform.OS === "android" && Notifications) {
      try {
        // Configure audio mode for background playback
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: false,
          playThroughEarpieceAndroid: false,
        });

        // Set notification handler
        await Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: false,
            shouldPlaySound: false,
            shouldSetBadge: false,
          }),
        });

        // Create notification channel for media playback
        // IMPORTANT: Use HIGH importance for MediaStyle notifications to show on lock screen
        await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
          name: "Media Playback",
          importance: Notifications.AndroidImportance.HIGH, // HIGH = shows on lock screen
          sound: null,
          vibrationPattern: null,
          lockscreenVisibility:
            Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true, // Allow showing even in Do Not Disturb mode
        });

        // Listen for notification button presses
        this.responseSubscription =
          Notifications.addNotificationResponseReceivedListener((response) => {
            const action = response.actionIdentifier;
            const notificationData = response.notification?.request?.content?.data;
            
            console.log("🔘 Notification response received:", {
              action,
              data: notificationData,
            });

            // Handle action button presses
            if (action === "PLAY_PAUSE" || action === "default") {
              // Check if this is a media notification
              if (notificationData?.type === "media" || action === "PLAY_PAUSE") {
                console.log("🔘 Play/Pause button pressed");
                this.callbacks.onPlayPause?.();
              }
            } else if (action === "NEXT") {
              console.log("🔘 Next button pressed");
              this.callbacks.onNext?.();
            } else if (action === "PREVIOUS") {
              console.log("🔘 Previous button pressed");
              this.callbacks.onPrevious?.();
            }
          });

        this.initialized = true;
        console.log("✅ Android lock screen controls initialized");
      } catch (error) {
        console.error("❌ Error initializing lock screen controls:", error);
      }
    }
  }

  /**
   * Set callbacks for lock screen button presses
   * @param {Object} callbacks - Object with onPlayPause, onNext, onPrevious functions
   */
  setCallbacks(callbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Show lock screen notification with media controls (Android only)
   * @param {Object} track - Track object with id, title, artist, image, durationMillis
   */
  async showNotification(track) {
    if (Platform.OS === "ios") {
      return;
    }

    // Android: Show MediaStyle notification
    if (Platform.OS === "android") {
      if (!Notifications) {
        console.error("❌ Notifications module not available on Android");
        return;
      }
      
      console.log("📱 Android: Setting up lock screen notification for:", track.title);
      await this.initialize();
      this.currentTrack = track;
      if (track?.durationMillis) {
        this.durationMillis = track.durationMillis;
      }
      await this.updateNotification(true);
    }
  }

  /**
   * Update playback state in lock screen notification (Android only)
   * @param {boolean} isPlaying - Whether audio is currently playing
   * @param {number} positionMillis - Current playback position in milliseconds
   * @param {number} durationMillis - Total duration in milliseconds
   */
  async updatePlaybackState(isPlaying, positionMillis, durationMillis) {
    if (Platform.OS === "ios") {
      return;
    }

    // Android: Update notification
    if (Platform.OS === "android" && Notifications) {
      this.isPlaying = !!isPlaying;
      if (typeof positionMillis === "number" && !Number.isNaN(positionMillis)) {
        this.positionMillis = Math.max(0, positionMillis);
      }
      if (typeof durationMillis === "number" && durationMillis > 0) {
        this.durationMillis = durationMillis;
      }
      await this.updateNotification(false);
    }
  }

  /**
   * Update the Android notification (internal method)
   * @param {boolean} forceUpdate - Force update even if throttled
   */
  async updateNotification(forceUpdate = false) {
    if (Platform.OS !== "android" || !Notifications || !this.currentTrack) {
      return;
    }

    // Throttle updates to prevent spam
    const now = Date.now();
    if (!forceUpdate && now - this.lastUpdate < UPDATE_THROTTLE_MS) {
      return;
    }
    this.lastUpdate = now;

    // Update notification category with current play/pause state
    await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
      {
        identifier: "PREVIOUS",
        buttonTitle: "Previous",
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

    // Calculate progress percentage
    const progress =
      this.durationMillis > 0
        ? Math.min(
            100,
            Math.max(0, Math.floor((this.positionMillis / this.durationMillis) * 100))
          )
        : undefined;

    // Build notification content
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
        color: "#B7FF3C", // R/HOOD brand color
        sticky: true,
        priority: Notifications.AndroidNotificationPriority.HIGH, // HIGH = shows on lock screen
        usesChronometer: this.isPlaying,
        ongoing: this.isPlaying,
        progress,
        largeIcon: this.currentTrack.image || undefined,
        // Note: Actions are handled via categoryIdentifier above
      },
    };

    // Dismiss old notification if exists
    if (this.notificationId) {
      try {
        await Notifications.dismissNotificationAsync(this.notificationId);
      } catch (error) {
        console.log("⚠️ Failed to dismiss old notification:", error);
      }
    }

    // Show new notification
    try {
      console.log("📱 Showing Android media notification:", {
        title: content.title,
        body: content.body,
        hasImage: !!this.currentTrack.image,
        isPlaying: this.isPlaying,
        progress,
        actionsCount: content.android.actions?.length || 0,
      });
      
      this.notificationId = await Notifications.scheduleNotificationAsync({
        content,
        trigger: null, // Show immediately
      });
      
      console.log("✅ Media notification shown with ID:", this.notificationId);
    } catch (error) {
      console.error("❌ Failed to show media notification:", error);
      console.error("❌ Error details:", {
        message: error.message,
        stack: error.stack,
        content: JSON.stringify(content, null, 2),
      });
    }
  }

  /**
   * Hide lock screen notification (Android only)
   */
  async hideNotification() {
    if (Platform.OS === "ios") {
      return;
    }

    // Android: Dismiss notification
    if (Platform.OS === "android" && Notifications && this.notificationId) {
      try {
        await Notifications.dismissNotificationAsync(this.notificationId);
        this.notificationId = null;
        this.currentTrack = null;
        this.isPlaying = false;
        this.positionMillis = 0;
        this.durationMillis = 0;
      } catch (error) {
        console.error("❌ Failed to hide notification:", error);
      }
    }
  }

  /**
   * Cleanup - remove listeners and hide notification
   */
  async cleanup() {
    if (this.responseSubscription) {
      this.responseSubscription.remove();
      this.responseSubscription = null;
    }
    await this.hideNotification();
    this.initialized = false;
  }
}

// Create singleton instance
const lockScreenControls = new LockScreenControls();

export default lockScreenControls;

