import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";

/**
 * Wrapper that fades in list items with optional stagger.
 * Use maxStaggerIndex so only the first N items stagger; rest appear together (avoids long lists crawling in).
 */
export default function AnimatedListItem({
  children,
  index = 0,
  delay = 40,
  maxStaggerIndex = 6,
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const safeDelay = Number.isFinite(delay) && delay >= 0 ? delay : 40;
  const safeMax = Number.isFinite(maxStaggerIndex) && maxStaggerIndex >= 0 ? maxStaggerIndex : 6;
  const safeIndex = Number.isFinite(index) && index >= 0 ? index : 0;
  const staggeredDelay = Math.min(safeIndex, safeMax) * safeDelay;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 280,
        delay: staggeredDelay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        delay: staggeredDelay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [safeIndex, safeDelay, safeMax]);

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
