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
    TrackPlayer.registerPlaybackService(() => require("./src/audio/playbackService"));
  }
} catch (error) {
  console.warn("TrackPlayer service registration failed:", error.message);
}

registerRootComponent(App);
