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
import React from "react";
import App from "./App";
import { AudioProvider } from "./context/AudioContext";

// TrackPlayer service registration is now handled in App.js after app initialization
// This prevents Metro from trying to analyze the native module during bundling

function Root() {
  return (
    <AudioProvider>
      <App />
    </AudioProvider>
  );
}

registerRootComponent(Root);
