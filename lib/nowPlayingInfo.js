// lib/nowPlayingInfo.js
// Native module bridge for iOS MPNowPlayingInfoCenter
// This will work with a custom Expo config plugin that adds native code

import { Platform, NativeModules } from "react-native";

let NowPlayingInfo = null;
try {
  // Try to access native module if it exists
  NowPlayingInfo =
    NativeModules.NowPlayingInfoModule || NativeModules.NowPlayingInfo || null;
  if (NowPlayingInfo) {
    console.log("✅ NowPlayingInfo native module found!");
  } else {
    console.warn(
      "⚠️ NowPlayingInfo native module not found. Available modules:",
      Object.keys(NativeModules).filter(
        (key) => key.includes("Now") || key.includes("Playing")
      )
    );
  }
} catch (error) {
  console.log("⚠️ Error accessing native modules:", error);
}

class NowPlayingInfoManager {
  async setNowPlayingInfo(metadata) {
    if (Platform.OS !== "ios") {
      // Android handles this through notifications
      return;
    }

    if (!NowPlayingInfo) {
      console.warn(
        "⚠️ NowPlayingInfo native module not available. This requires a development build with the native module added to Xcode. Expo Go won't work."
      );
      console.warn(
        "⚠️ Make sure you've:",
        "\n1. Run 'npx expo prebuild --platform ios'",
        "\n2. Added the native files to Xcode project",
        "\n3. Built a development build (not Expo Go)"
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

      console.log("🎵 Setting Now Playing info:", {
        title: info.title,
        artist: info.artist,
        duration: info.duration,
        hasArtwork: !!info.artwork,
        playbackRate: info.playbackRate,
      });

      await NowPlayingInfo.setNowPlayingInfo(info);
      console.log("✅ Now Playing info set successfully!");
    } catch (error) {
      console.error("❌ Failed to set Now Playing info:", error);
      console.error("❌ Error details:", error.message, error.stack);
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
