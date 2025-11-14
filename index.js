// Disable React DevTools overlays in development
if (typeof global !== "undefined") {
  global.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: false,
    inject: () => {},
    onCommitFiberRoot: () => {},
    onCommitFiberUnmount: () => {},
  };
}

import { registerRootComponent } from "expo";
import App from "./App";

// Register playback service for react-native-track-player
try {
  const TrackPlayer = require("react-native-track-player");
  console.log("🔊 [STARTUP] TrackPlayer available:", !!TrackPlayer);
  console.log(
    "🔊 [STARTUP] registerPlaybackService available:",
    !!TrackPlayer?.registerPlaybackService
  );

  if (TrackPlayer && TrackPlayer.registerPlaybackService) {
    console.log("🔊 [STARTUP] Registering playback service...");
    TrackPlayer.registerPlaybackService(() => {
      console.log(
        "🔊 [STARTUP] Service factory function called, requiring service module..."
      );
      const service = require("./src/audio/playbackService");
      console.log("🔊 [STARTUP] Service module loaded, type:", typeof service);
      return service;
    });
    console.log("✅ [STARTUP] Playback service registration completed");
  } else {
    console.warn(
      "⚠️ [STARTUP] TrackPlayer or registerPlaybackService not available"
    );
  }
} catch (error) {
  console.error("❌ [STARTUP] Error registering playback service:", error);
}

registerRootComponent(App);
