// lib/backgroundAudioService.js
// Background audio service with lock screen controls

import { Platform } from "react-native";

// Import Audio from expo-av (the correct package)
import { Audio } from "expo-av";
console.log("✅ Audio module imported from expo-av");

// Conditionally import Notifications (not available in Expo Go)
let Notifications;
try {
  Notifications = require("expo-notifications");
} catch (error) {
  console.log("Notifications not available in Expo Go");
}

class BackgroundAudioService {
  constructor() {
    this.currentSound = null;
    this.currentTrack = null;
    this.isPlaying = false;
    this.position = 0;
    this.duration = 0;
    this.notificationId = null;
    this.updateInterval = null;

    // Configure audio mode for background playback
    this.setupAudioMode();

    // Set up notification handler for lock screen controls
    this.setupNotificationHandler();
  }

  async setupAudioMode() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      console.log("✅ Audio mode configured for background playback");
    } catch (error) {
      console.error("❌ Error setting up audio mode:", error);
    }
  }

  setupNotificationHandler() {
    if (Notifications) {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: false,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
    }
  }

  async playTrack(trackData) {
    console.log(
      "🎵 playTrack called - Audio available:",
      !!Audio,
      "Audio.Sound:",
      !!Audio?.Sound
    );
    console.log("🎵 Audio module available, proceeding with playback");

    try {
      // Stop current track if playing
      if (this.currentSound) {
        await this.stopTrack();
      }

      this.currentTrack = trackData;

      // Create audio source
      const audioSource = trackData.file_url
        ? { uri: trackData.file_url }
        : trackData.audioUrl;

      // Load and play the track
      const { sound } = await Audio.Sound.createAsync(audioSource, {
        shouldPlay: true,
        isLooping: false,
        volume: 1.0,
      });

      this.currentSound = sound;
      this.isPlaying = true;

      // Set up playback status listener
      sound.setOnPlaybackStatusUpdate(
        this.handlePlaybackStatusUpdate.bind(this)
      );

      // Show lock screen notification
      await this.showLockScreenNotification();

      // Start position update interval
      this.startPositionUpdates();

      console.log("🎵 Track started:", trackData.title);
      return true;
    } catch (error) {
      console.error("❌ Error playing track:", error);
      return false;
    }
  }

  async pauseTrack() {
    if (!this.currentSound || !this.isPlaying) {
      return false;
    }

    try {
      await this.currentSound.pauseAsync();
      this.isPlaying = false;

      // Update lock screen notification
      await this.updateLockScreenNotification();

      // Stop position updates
      this.stopPositionUpdates();

      console.log("⏸️ Track paused");
      return true;
    } catch (error) {
      console.error("❌ Error pausing track:", error);
      return false;
    }
  }

  async resumeTrack() {
    if (!this.currentSound || this.isPlaying) {
      return false;
    }

    try {
      await this.currentSound.playAsync();
      this.isPlaying = true;

      // Update lock screen notification
      await this.updateLockScreenNotification();

      // Start position updates
      this.startPositionUpdates();

      console.log("▶️ Track resumed");
      return true;
    } catch (error) {
      console.error("❌ Error resuming track:", error);
      return false;
    }
  }

  async stopTrack() {
    if (!this.currentSound) {
      return false;
    }

    try {
      await this.currentSound.unloadAsync();
      this.currentSound = null;
      this.currentTrack = null;
      this.isPlaying = false;
      this.position = 0;
      this.duration = 0;

      // Hide lock screen notification
      await this.hideLockScreenNotification();

      // Stop position updates
      this.stopPositionUpdates();

      console.log("⏹️ Track stopped");
      return true;
    } catch (error) {
      console.error("❌ Error stopping track:", error);
      return false;
    }
  }

  handlePlaybackStatusUpdate(status) {
    if (status.isLoaded) {
      this.position = status.positionMillis;
      this.duration = status.durationMillis;

      if (status.didJustFinish) {
        this.stopTrack();
      }
    }
  }

  startPositionUpdates() {
    // Update position every second for lock screen display
    this.updateInterval = setInterval(() => {
      if (this.currentSound && this.isPlaying) {
        this.updateLockScreenNotification();
      }
    }, 1000);
  }

  stopPositionUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  async showLockScreenNotification() {
    if (!Notifications || !this.currentTrack) return;

    try {
      // Cancel existing notification
      if (this.notificationId) {
        await Notifications.dismissNotificationAsync(this.notificationId);
      }

      // Create lock screen notification with media controls
      this.notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: this.currentTrack.title || "R/HOOD",
          subtitle: this.currentTrack.genre || "Electronic",
          body: this.currentTrack.artist || "Unknown Artist",
          data: {
            type: "audio_playback",
            trackId: this.currentTrack.id,
            isPlaying: this.isPlaying,
          },
          // iOS media controls
          ...(Platform.OS === "ios" && {
            categoryIdentifier: "AUDIO_PLAYBACK",
            sound: null, // No sound for media notifications
          }),
        },
        trigger: null, // Show immediately
      });

      console.log("📱 Lock screen notification shown");
    } catch (error) {
      console.error("❌ Error showing lock screen notification:", error);
    }
  }

  async updateLockScreenNotification() {
    if (!Notifications || !this.currentTrack || !this.notificationId) return;

    try {
      await Notifications.dismissNotificationAsync(this.notificationId);
      await this.showLockScreenNotification();
    } catch (error) {
      console.error("❌ Error updating lock screen notification:", error);
    }
  }

  async hideLockScreenNotification() {
    if (!Notifications || !this.notificationId) return;

    try {
      await Notifications.dismissNotificationAsync(this.notificationId);
      this.notificationId = null;
      console.log("📱 Lock screen notification hidden");
    } catch (error) {
      console.error("❌ Error hiding lock screen notification:", error);
    }
  }

  // Handle notification actions (play/pause from lock screen)
  async handleNotificationAction(action) {
    switch (action) {
      case "play":
        return await this.resumeTrack();
      case "pause":
        return await this.pauseTrack();
      case "stop":
        return await this.stopTrack();
      default:
        return false;
    }
  }

  // Get current playback state
  getPlaybackState() {
    return {
      isPlaying: this.isPlaying,
      currentTrack: this.currentTrack,
      position: this.position,
      duration: this.duration,
      progress: this.duration > 0 ? this.position / this.duration : 0,
    };
  }

  // Format time for display
  formatTime(milliseconds) {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }
}

// Create singleton instance
const backgroundAudioService = new BackgroundAudioService();

export default backgroundAudioService;
