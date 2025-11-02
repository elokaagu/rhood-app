// lib/nowPlayingInfo.js
// Native module bridge for iOS MPNowPlayingInfoCenter
// This will work with a custom Expo config plugin that adds native code

import { Platform, NativeModules } from "react-native";

let NowPlayingInfo = null;
try {
  // Try to access native module if it exists
  NowPlayingInfo = NativeModules.NowPlayingInfo || null;
} catch (error) {
  console.log("⚠️ NowPlayingInfo native module not available:", error);
}

class NowPlayingInfoManager {
  async setNowPlayingInfo(metadata) {
    if (Platform.OS !== "ios") {
      // Android handles this through notifications
      return;
    }

    if (!NowPlayingInfo) {
      console.warn(
        "⚠️ NowPlayingInfo native module not available. Install the config plugin and rebuild."
      );
      return;
    }

    try {
      const info = {
        title: metadata.title || "R/HOOD Mix",
        artist: metadata.artist || "Unknown Artist",
        albumTitle: metadata.album || metadata.genre || "R/HOOD",
        artwork: metadata.image || null,
        duration: metadata.durationMillis ? metadata.durationMillis / 1000 : 0,
        elapsedPlaybackTime: metadata.positionMillis
          ? metadata.positionMillis / 1000
          : 0,
        playbackRate: metadata.isPlaying ? 1.0 : 0.0,
      };

      await NowPlayingInfo.setNowPlayingInfo(info);
      console.log("✅ Now Playing info set:", info.title);
    } catch (error) {
      console.error("❌ Failed to set Now Playing info:", error);
    }
  }

  async updatePlaybackTime(positionMillis, durationMillis, isPlaying) {
    if (Platform.OS !== "ios" || !NowPlayingInfo) {
      return;
    }

    try {
      await NowPlayingInfo.updatePlaybackTime(
        positionMillis / 1000,
        durationMillis / 1000,
        isPlaying ? 1.0 : 0.0
      );
    } catch (error) {
      console.error("❌ Failed to update playback time:", error);
    }
  }

  async clearNowPlayingInfo() {
    if (Platform.OS !== "ios" || !NowPlayingInfo) {
      return;
    }

    try {
      await NowPlayingInfo.clearNowPlayingInfo();
    } catch (error) {
      console.error("❌ Failed to clear Now Playing info:", error);
    }
  }
}

const nowPlayingInfo = new NowPlayingInfoManager();
export default nowPlayingInfo;
