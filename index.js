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
// Simplified registration pattern as recommended
try {
  const TrackPlayer = require("react-native-track-player");
  if (TrackPlayer && TrackPlayer.registerPlaybackService) {
    console.log("🔊 [STARTUP] Registering playback service...");
    TrackPlayer.registerPlaybackService(() => require("./src/audio/playbackService"));
    console.log("✅ [STARTUP] Playback service registration completed");
  } else {
    console.warn(
      "⚠️ [STARTUP] TrackPlayer.registerPlaybackService not available"
    );
  }
} catch (error) {
  console.error("❌ [STARTUP] Error registering playback service:", error);
}

registerRootComponent(App);
