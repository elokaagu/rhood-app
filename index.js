// Supabase + auth on React Native need URL + crypto polyfills before any client import.
import "react-native-url-polyfill/auto";
import "react-native-get-random-values";

// Initialize RNGH before other imports (required for touch system / ScrollView integration).
// Note: Do not assign to global.__REACT_DEVTOOLS_GLOBAL_HOOK__ here — React 19 / Hermes
// may define it as getter-only, which throws "Cannot assign to property ... only a getter".
import "react-native-gesture-handler";

import { registerRootComponent } from "expo";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import App from "./App";
import { AudioProvider } from "./context/AudioContext";

function Root() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AudioProvider>
          <App />
        </AudioProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

registerRootComponent(Root);
