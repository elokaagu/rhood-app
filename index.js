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
      const service = require("./src/audio/playbackService");
      console.log("✅ [STARTUP] Service module loaded, type:", typeof service);

      if (typeof service !== "function") {
        console.error(
          "❌ [STARTUP] Service is not a function! Got:",
          typeof service,
          "- Check playbackService.js exports"
        );
        throw new Error(
          "Playback service must export a function. Got: " + typeof service
        );
      }

      return service; // Should be "function" with CommonJS module.exports
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
