import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";

/**
 * Wrapper that fades in list items with optional stagger.
 * Use maxStaggerIndex so only the first N items stagger; rest appear together (avoids long lists crawling in).
 */
export default function AnimatedListItem({
  children,
  index,
  // delay = 40,
  // maxStaggerIndex = 6,
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;
  const staggeredDelay = Math.min(index, maxStaggerIndex) * delay;

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
  }, [index, delay, maxStaggerIndex]);

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
