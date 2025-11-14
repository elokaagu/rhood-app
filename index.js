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

// Register playback service for react-native-track-player
try {
  const TrackPlayer = require("react-native-track-player");
  if (TrackPlayer && TrackPlayer.registerPlaybackService) {
    TrackPlayer.registerPlaybackService(() => {
      return require("./src/audio/playbackService");
    });
  }
} catch (error) {
  // Track player not available (expected in Expo Go)
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
