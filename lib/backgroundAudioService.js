// lib/backgroundAudioService.js
// Background audio service

// Import Audio from expo-av (works in Expo Go)
import { Audio } from "expo-av";
console.log("✅ Audio module imported from expo-av");

class BackgroundAudioService {
  constructor() {
    this.currentSound = null;
    this.currentTrack = null;
    this.isPlaying = false;
    this.position = 0;
    this.duration = 0;

    // Configure audio mode for background playback
    this.setupAudioMode();
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
