// lib/lockScreenControls.js
// Lock screen media controls for R/HOOD app

import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { Audio } from "expo-av";

class LockScreenControls {
  constructor() {
    this.currentTrack = null;
    this.isPlaying = false;
    this.position = 0;
    this.duration = 0;
    this.onPlayPause = null;
    this.onNext = null;
    this.onPrevious = null;
    this.onSeek = null;

    this.setupNotificationHandler();
  }

  setupNotificationHandler() {
    // Configure notification handler for media controls
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });

    // Listen for notification responses (lock screen button presses)
    Notifications.addNotificationResponseReceivedListener((response) => {
      const { actionIdentifier, userText } = response;

      console.log("🔒 Lock screen action:", actionIdentifier);

      switch (actionIdentifier) {
        case "PLAY_PAUSE":
          this.onPlayPause && this.onPlayPause();
          break;
        case "NEXT":
          this.onNext && this.onNext();
          break;
        case "PREVIOUS":
          this.onPrevious && this.onPrevious();
          break;
        case "SEEK_FORWARD":
          this.onSeek && this.onSeek(10000); // Seek 10 seconds forward
          break;
        case "SEEK_BACKWARD":
          this.onSeek && this.onSeek(-10000); // Seek 10 seconds backward
          break;
        default:
          console.log("Unknown lock screen action:", actionIdentifier);
      }
    });
  }

  async showLockScreenNotification(trackData) {
    try {
      this.currentTrack = trackData;

      // Cancel any existing notifications
      await Notifications.cancelAllScheduledNotificationsAsync();

      // Create media notification with controls
      const notification = {
        title: trackData.title || "R/HOOD Track",
        body: trackData.artist || "Unknown Artist",
        data: {
          type: "media",
          trackId: trackData.id,
          trackTitle: trackData.title,
          trackArtist: trackData.artist,
        },
        categoryIdentifier: "MEDIA_CONTROLS",
        sound: false,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        sticky: true,
        autoDismiss: false,
      };

      // Add album art if available
      if (trackData.image) {
        notification.image = trackData.image;
      }

      // Schedule the notification
      await Notifications.scheduleNotificationAsync({
        content: notification,
        trigger: null, // Show immediately
      });

      console.log("🔒 Lock screen notification shown for:", trackData.title);
    } catch (error) {
      console.error("❌ Error showing lock screen notification:", error);
    }
  }

  async updateLockScreenNotification(progress = null) {
    try {
      if (!this.currentTrack) return;

      // Update notification with current progress
      const notification = {
        title: this.currentTrack.title || "R/HOOD Track",
        body: this.currentTrack.artist || "Unknown Artist",
        data: {
          type: "media",
          trackId: this.currentTrack.id,
          trackTitle: this.currentTrack.title,
          trackArtist: this.currentTrack.artist,
          isPlaying: this.isPlaying,
          position: this.position,
          duration: this.duration,
        },
        categoryIdentifier: "MEDIA_CONTROLS",
        sound: false,
        priority: Notifications.AndroidNotificationPriority.HIGH,
        sticky: true,
        autoDismiss: false,
      };

      // Add album art if available
      if (this.currentTrack.image) {
        notification.image = this.currentTrack.image;
      }

      // Update the notification
      await Notifications.scheduleNotificationAsync({
        content: notification,
        trigger: null,
      });
    } catch (error) {
      console.error("❌ Error updating lock screen notification:", error);
    }
  }

  async hideLockScreenNotification() {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      this.currentTrack = null;
      console.log("🔒 Lock screen notification hidden");
    } catch (error) {
      console.error("❌ Error hiding lock screen notification:", error);
    }
  }

  setPlaybackState(isPlaying, position = 0, duration = 0) {
    this.isPlaying = isPlaying;
    this.position = position;
    this.duration = duration;

    // Update lock screen notification with current state
    this.updateLockScreenNotification();
  }

  setCallbacks(callbacks) {
    this.onPlayPause = callbacks.onPlayPause;
    this.onNext = callbacks.onNext;
    this.onPrevious = callbacks.onPrevious;
    this.onSeek = callbacks.onSeek;
  }

  async setupMediaCategories() {
    try {
      // Define media control categories for lock screen
      await Notifications.setNotificationCategoryAsync("MEDIA_CONTROLS", [
        {
          identifier: "PREVIOUS",
          buttonTitle: "Previous",
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: "PLAY_PAUSE",
          buttonTitle: this.isPlaying ? "Pause" : "Play",
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: "NEXT",
          buttonTitle: "Next",
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: "SEEK_BACKWARD",
          buttonTitle: "⏪",
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
        {
          identifier: "SEEK_FORWARD",
          buttonTitle: "⏩",
          options: {
            isDestructive: false,
            isAuthenticationRequired: false,
          },
        },
      ]);

      console.log("🔒 Media control categories set up");
    } catch (error) {
      console.error("❌ Error setting up media categories:", error);
    }
  }
}

// Create singleton instance
const lockScreenControls = new LockScreenControls();

export default lockScreenControls;
