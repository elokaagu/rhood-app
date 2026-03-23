import React, { useMemo, useRef, useEffect } from "react";
import { View, StyleSheet, Platform, BackHandler } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { HapticPatterns } from "../lib/haptics";

/** Width of the touch strip along the left edge (matches common iOS back gesture zone). */
const EDGE_WIDTH = Platform.OS === "ios" ? 28 : 34;

/** Ignore swipe-back on web (RNGH pan edge is unreliable). */
const SWIPE_BACK_SUPPORTED = Platform.OS !== "web";

/**
 * Full-screen shell that detects a horizontal swipe starting from the left edge
 * and invokes `onBack` — same intent as the header back arrow.
 *
 * Only the narrow left strip uses a pan gesture so vertical lists and most taps
 * are unaffected.
 */
export default function SwipeBackScreenShell({
  children,
  onBack,
  enabled = true,
}) {
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  const runBack = useMemo(
    () => () => {
      HapticPatterns.backButton();
      const fn = onBackRef.current;
      if (typeof fn === "function") fn();
    },
    []
  );

  const edgeGesture = useMemo(() => {
    if (!SWIPE_BACK_SUPPORTED) {
      return Gesture.Pan().enabled(false);
    }
    return Gesture.Pan()
      .minPointers(1)
      .maxPointers(1)
      .activeOffsetX(20)
      .failOffsetY([-22, 22])
      .onEnd((e) => {
        const dx = e.translationX;
        const vx = e.velocityX;
        const shouldBack =
          dx >= 72 || (vx > 520 && dx >= 28) || (vx > 900 && dx >= 16);
        if (shouldBack) {
          runOnJS(runBack)();
        }
      });
  }, [runBack]);

  const allow = Boolean(enabled && onBack && SWIPE_BACK_SUPPORTED);

  // Android system / predictive back — same as edge swipe + header back
  useEffect(() => {
    if (!allow || Platform.OS !== "android") return undefined;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      runBack();
      return true;
    });
    return () => sub.remove();
  }, [allow, runBack]);

  if (!allow) {
    return children;
  }

  return (
    <View style={styles.root} collapsable={false}>
      {children}
      <GestureDetector gesture={edgeGesture}>
        <View
          style={[styles.edgeZone, { width: EDGE_WIDTH }]}
          pointerEvents="box-only"
          collapsable={false}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  edgeZone: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 20000,
    backgroundColor: "transparent",
  },
});
