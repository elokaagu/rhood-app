import React, { useMemo, useRef, useEffect } from "react";
import { View, StyleSheet, Platform, BackHandler, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticPatterns } from "../lib/haptics";

/** Width of the touch strip along the left edge (matches common iOS back gesture zone). */
const EDGE_WIDTH = Platform.OS === "ios" ? 28 : 34;

/** Space below status bar reserved for header row so the edge overlay does not steal back-button taps. */
const HEADER_ROW_CLEARANCE = 92;

/** Ignore swipe-back on web (RNGH pan edge is unreliable). */
const SWIPE_BACK_SUPPORTED = Platform.OS !== "web";

/**
 * Full-screen shell that detects a horizontal swipe starting from the left edge
 * and invokes `onBack` — same intent as the header back arrow.
 *
 * Content follows the finger with a spring cancel / eased exit for a smoother feel.
 * The edge strip starts below the typical header so the back control stays tappable.
 */
export default function SwipeBackScreenShell({
  children,
  onBack,
  enabled = true,
}) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const edgeZoneTop = insets.top + HEADER_ROW_CLEARANCE;

  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  }, [onBack]);

  const translateX = useSharedValue(0);
  const widthSV = useSharedValue(windowWidth);

  useEffect(() => {
    widthSV.value = windowWidth;
  }, [windowWidth, widthSV]);

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
      .activeOffsetX(12)
      .failOffsetY([-28, 28])
      .onUpdate((e) => {
        const w = widthSV.value;
        const tx = e.translationX;
        const maxDrag = w * 0.92;
        const damped =
          tx <= maxDrag ? Math.max(0, tx) : maxDrag + (tx - maxDrag) * 0.22;
        translateX.value = Math.min(damped, w);
      })
      .onEnd((e) => {
        const w = widthSV.value;
        const tx = e.translationX;
        const vx = e.velocityX;
        const dismiss =
          tx > w * 0.18 ||
          (vx > 320 && tx > 32) ||
          (vx > 620 && tx > 16);
        if (dismiss) {
          translateX.value = withTiming(
            w,
            {
              duration: 280,
              easing: Easing.out(Easing.cubic),
            },
            (finished) => {
              if (finished) {
                runOnJS(runBack)();
              }
            }
          );
        } else {
          translateX.value = withSpring(0, {
            damping: 28,
            stiffness: 280,
            mass: 0.88,
            overshootClamping: true,
          });
        }
      });
  }, [runBack, translateX, widthSV]);

  const contentStyle = useAnimatedStyle(() => ({
    flex: 1,
    transform: [{ translateX: translateX.value }],
  }));

  const allow = Boolean(enabled && onBack && SWIPE_BACK_SUPPORTED);

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
      <Animated.View style={contentStyle} collapsable={false}>
        {children}
      </Animated.View>
      <GestureDetector gesture={edgeGesture}>
        <View
          style={[styles.edgeZone, { width: EDGE_WIDTH, top: edgeZoneTop }]}
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
    bottom: 0,
    zIndex: 20000,
    backgroundColor: "transparent",
  },
});
