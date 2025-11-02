// Disable React DevTools overlays in development
if (typeof global !== "undefined") {
  // Disable React DevTools inspector overlays
  global.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: false,
    inject: () => {},
    onCommitFiberRoot: () => {},
    onCommitFiberUnmount: () => {},
  };
}

import { registerRootComponent } from "expo";
import App from "./App";

// Register the playback service for background audio and remote controls
// CRITICAL: This MUST be called at app startup, BEFORE any audio plays
// Only register if react-native-track-player is available (requires native build)
try {
  const TrackPlayer = require("react-native-track-player");
  if (TrackPlayer && TrackPlayer.registerPlaybackService) {
    // Register the service - this makes iOS recognize the app for remote control events
    TrackPlayer.registerPlaybackService(() =>
      require("./src/audio/playbackService")
    );
    console.log("✅ Track player playback service registered at app startup");
    console.log("📱 iOS will now send remote control events to this service");
  } else {
    console.warn("⚠️ TrackPlayer.registerPlaybackService not available");
  }
} catch (error) {
  console.warn("⚠️ Track player not available:", error.message);
  // Continue without track-player - app will use expo-av fallback
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
