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

// ============================================================================
// CRITICAL: Register playback service for iOS remote controls
// ============================================================================
// This registration MUST happen at app startup, BEFORE React mounts,
// and BEFORE any audio plays. iOS needs to know about this service
// to route remote control events (lock screen, Control Center, AirPods).
// ============================================================================
try {
  const TrackPlayer = require("react-native-track-player");

  if (TrackPlayer && TrackPlayer.registerPlaybackService) {
    console.log(
      "✅✅✅ [STARTUP] Registering playback service for iOS remote controls..."
    );

    // Register the service - this tells iOS where to send remote control events
    // The service function will be called when TrackPlayer.setupPlayer() is invoked
    //
    // IMPORTANT: registerPlaybackService expects a function that returns the service function
    // Since playbackService.js uses module.exports = async function playbackService(),
    // require() will return the service function directly
    TrackPlayer.registerPlaybackService(() => {
      const service = require("./src/audio/playbackService");

      // Verify we got the service function (not just the module object)
      if (typeof service === "function") {
        console.log(
          "✅✅✅ [STARTUP] Service function correctly loaded (type: function)"
        );
        return service;
      } else {
        // If it's the module object, try to get the default export or the exported function
        console.warn(
          "⚠️ [STARTUP] Service require returned object, checking for default export..."
        );
        return service.default || service;
      }
    });

    console.log("✅✅✅ [STARTUP] Playback service registered successfully");
    console.log(
      "✅✅✅ [STARTUP] iOS will route remote control events to: src/audio/playbackService.js"
    );
    console.log(
      "✅✅✅ [STARTUP] When audio plays, check device logs for '[SERVICE]' and '[REMOTE]' messages"
    );
  } else {
    console.warn(
      "⚠️ [STARTUP] TrackPlayer.registerPlaybackService not available"
    );
    console.warn(
      "⚠️ [STARTUP] This might mean react-native-track-player isn't properly installed"
    );
  }
} catch (error) {
  console.warn("⚠️ [STARTUP] Track player not available:", error.message);
  console.warn(
    "⚠️ [STARTUP] This is expected in Expo Go - rebuild with EAS for native controls"
  );
  // Continue without track-player - app will use expo-av fallback
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
