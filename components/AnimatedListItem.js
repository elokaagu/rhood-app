import React, { useEffect, useRef, useState } from "react";
import { Animated, AccessibilityInfo } from "react-native";

const DEFAULT_DELAY = 40;
const DEFAULT_MAX_STAGGER_INDEX = 6;
const DURATION = 280;
const START_OFFSET_Y = 12;

/**
 * Wrapper that fades in list items with optional stagger.
 * Use maxStaggerIndex so only the first N items stagger; rest appear together (avoids long lists crawling in).
 *
 * @param {boolean} [animate=true] — Set false to skip animation (e.g. perf or testing).
 */
export default function AnimatedListItem({
  children,
  index = 0,
  delay = DEFAULT_DELAY,
  maxStaggerIndex = DEFAULT_MAX_STAGGER_INDEX,
  animate = true,
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(START_OFFSET_Y)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  const safeDelay =
    Number.isFinite(delay) && delay >= 0 ? delay : DEFAULT_DELAY;
  const safeMax =
    Number.isFinite(maxStaggerIndex) && maxStaggerIndex >= 0
      ? maxStaggerIndex
      : DEFAULT_MAX_STAGGER_INDEX;
  const safeIndex = Number.isFinite(index) && index >= 0 ? index : 0;
  const staggeredDelay = Math.min(safeIndex, safeMax) * safeDelay;

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

  const shouldAnimate = animate && !reduceMotion;

  useEffect(() => {
    if (!shouldAnimate) {
      fadeAnim.setValue(1);
      translateY.setValue(0);
      return;
    }

    fadeAnim.setValue(0);
    translateY.setValue(START_OFFSET_Y);

    const anim = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: DURATION,
        delay: staggeredDelay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: DURATION,
        delay: staggeredDelay,
        useNativeDriver: true,
      }),
    ]);
    anim.start();
    return () => anim.stop();
  }, [fadeAnim, translateY, staggeredDelay, shouldAnimate]);

  return (
    <Animated.View
      style={{
        opacity: fadeAnim,
        transform: [{ translateY }],
      }}
    >
      {children}
    </Animated.View>
  );
}
