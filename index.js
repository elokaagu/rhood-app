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
  if (TrackPlayer?.registerPlaybackService) {
    TrackPlayer.registerPlaybackService(() => {
      try {
        return require("./src/audio/playbackService");
      } catch (error) {
        console.warn("Failed to load playback service:", error.message);
        // Return a no-op function if service can't be loaded
        return async function() {};
      }
    });
  }
} catch (error) {
  console.warn("TrackPlayer service registration failed:", error.message);
}

registerRootComponent(App);
