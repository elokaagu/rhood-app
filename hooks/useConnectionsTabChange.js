import { useCallback } from "react";
import { Animated } from "react-native";
import { CONNECTIONS_SCREEN_TABS } from "../lib/connectionsScreenTabIds";

/**
 * Connections screen tab switch: active tab + symmetrical fade coordination.
 * When Discover list was empty, {@link loadDiscoverDJs} runs; `loadDiscoverDJsImpl` fades Discover in when load completes.
 *
 * @param {object} opts
 * @param {string} opts.activeTab - current tab (guards redundant presses)
 * @param {import('react').Dispatch<import('react').SetStateAction<string>>} opts.setActiveTab
 * @param {import('react-native').Animated.Value} opts.discoverFadeAnim
 * @param {import('react-native').Animated.Value} opts.connectionsFadeAnim
 * @param {number} opts.discoverUsersLength - raw list length (stable dep vs full array identity)
 * @param {() => void} opts.loadDiscoverDJs
 */
export function useConnectionsTabChange({
  activeTab,
  setActiveTab,
  discoverFadeAnim,
  connectionsFadeAnim,
  discoverUsersLength,
  loadDiscoverDJs,
}) {
  return useCallback(
    (tab) => {
      if (tab === activeTab) return;

      if (tab === CONNECTIONS_SCREEN_TABS.DISCOVER) {
        setActiveTab(CONNECTIONS_SCREEN_TABS.DISCOVER);
        connectionsFadeAnim.setValue(0);
        discoverFadeAnim.setValue(0);

        if (discoverUsersLength === 0) {
          loadDiscoverDJs();
        } else {
          Animated.timing(discoverFadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }
        return;
      }

      if (tab === CONNECTIONS_SCREEN_TABS.CONNECTIONS) {
        setActiveTab(CONNECTIONS_SCREEN_TABS.CONNECTIONS);
        discoverFadeAnim.setValue(0);
        connectionsFadeAnim.setValue(0);
        Animated.timing(connectionsFadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    },
    [
      activeTab,
      setActiveTab,
      discoverFadeAnim,
      connectionsFadeAnim,
      discoverUsersLength,
      loadDiscoverDJs,
    ]
  );
}
