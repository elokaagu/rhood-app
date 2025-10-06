import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";

/**
 * Wrapper component that adds fade-in animation to list items
 * Each item fades in with a staggered delay based on its index
 */
export default function AnimatedListItem({ children, index, delay = 100 }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Start animation with staggered delay
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay: index * delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, delay]);

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
