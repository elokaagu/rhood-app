import React, { memo, useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";

const FADE_IN_DURATION = 280;

/**
 * Lightweight reveal: opacity fade only (no blur). Use on list rows/cards for lower cost than BlurInView.
 */
function FadeInView({ children, style }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_IN_DURATION,
      useNativeDriver: true,
    }).start();
  }, [opacity]);

  return (
    <Animated.View style={[styles.wrapper, style, { opacity }]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {},
});

export default memo(FadeInView);
