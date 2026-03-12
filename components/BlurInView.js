import React, { memo, useEffect, useRef } from "react";
import { View, Animated, StyleSheet } from "react-native";
import { BlurView } from "expo-blur";

const BLUR_IN_DURATION = 280;

/**
 * Wraps content and animates a blur overlay from visible to transparent so content "blurs in".
 * Use on list rows and cards for a consistent reveal effect.
 */
function BlurInView({ children, style }) {
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(overlayOpacity, {
      toValue: 0,
      duration: BLUR_IN_DURATION,
      useNativeDriver: true,
    }).start();
  }, [overlayOpacity]);

  return (
    <View style={[styles.wrapper, style]}>
      {children}
      <Animated.View
        style={[StyleSheet.absoluteFill, styles.overlay, { opacity: overlayOpacity }]}
        pointerEvents="none"
      >
        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
  },
  overlay: {
    overflow: "hidden",
  },
});

export default memo(BlurInView);
