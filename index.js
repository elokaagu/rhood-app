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
// Note: This may fail during Metro bundling if TrackPlayer native module isn't available
// That's expected - the service will be registered at runtime when the app runs
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const TrackPlayer = require('react-native-track-player');
  if (TrackPlayer && TrackPlayer.registerPlaybackService) {
    TrackPlayer.registerPlaybackService(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require('./src/audio/playbackService');
    });
  }
} catch (error) {
  // Expected during build - TrackPlayer requires native modules that aren't available during bundling
  // The app will work fine - service registration happens at runtime
}

registerRootComponent(App);
