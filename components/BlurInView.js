import React, { memo, useEffect, useRef, useState } from "react";
import { View, Animated, StyleSheet, AccessibilityInfo } from "react-native";
import { BlurView } from "expo-blur";

const DEFAULT_DURATION = 280;
const DEFAULT_INTENSITY = 90;

/**
 * Wraps content and animates a blur overlay from visible to transparent so content "blurs in".
 * Use on list rows and cards for a consistent reveal effect.
 *
 * @param {number} [duration=280] — Fade duration (ms).
 * @param {number} [intensity=90] — expo-blur intensity (high values cost more GPU).
 * @param {boolean} [animate=true] — Set false to skip animation (perf / testing).
 */
function BlurInView({
  children,
  style,
  duration = DEFAULT_DURATION,
  intensity = DEFAULT_INTENSITY,
  animate = true,
}) {
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let subscription;
    AccessibilityInfo.isReduceMotionEnabled?.().then(setReduceMotion);
    if (typeof AccessibilityInfo.addEventListener === "function") {
      subscription = AccessibilityInfo.addEventListener(
        "reduceMotionChanged",
        setReduceMotion
      );
    }
    return () => subscription?.remove?.();
  }, []);

  const safeDuration =
    Number.isFinite(duration) && duration >= 0 ? duration : DEFAULT_DURATION;
  const safeIntensity =
    Number.isFinite(intensity) && intensity >= 0
      ? intensity
      : DEFAULT_INTENSITY;

  const shouldAnimate = animate && !reduceMotion;

  useEffect(() => {
    if (!shouldAnimate) {
      overlayOpacity.setValue(0);
      return;
    }

    overlayOpacity.setValue(1);

    const anim = Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: safeDuration,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [overlayOpacity, safeDuration, shouldAnimate]);

  return (
    <View style={[styles.wrapper, style]}>
      {children}
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: overlayOpacity }]}
        pointerEvents="none"
      >
        <BlurView
          intensity={safeIntensity}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
});

export default memo(BlurInView);
