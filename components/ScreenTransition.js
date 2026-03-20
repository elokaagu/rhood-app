import React, { useEffect, useRef } from "react";
import { Animated, Dimensions } from "react-native";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

/** Inactive screen position: which edge it sits off (slides into view when active). */
function getInactiveSlideOffset(direction, screenW, screenH) {
  switch (direction) {
    case "down":
      return -screenH;
    case "left":
      return -screenW;
    case "right":
      return screenW;
    case "up":
    default:
      return screenH;
  }
}

function isHorizontalDirection(direction) {
  return direction === "left" || direction === "right";
}

/**
 * Full-screen transition wrapper. Not a navigator — inactive layers use pointerEvents="none".
 *
 * @param {boolean} isActive
 * @param {'fade'|'slide'|'scale'|'slideFade'} [transitionType='fade']
 * @param {number} [duration=300]
 * @param {'up'|'down'|'left'|'right'} [direction='up'] — off-screen edge for slide / slideFade
 */
const ScreenTransition = ({
  children,
  isActive,
  transitionType = "fade",
  duration = 300,
  direction = "up",
}) => {
  const fadeAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const slideAnim = useRef(
    new Animated.Value(
      isActive
        ? 0
        : getInactiveSlideOffset(direction, SCREEN_W, SCREEN_H)
    )
  ).current;
  const scaleAnim = useRef(new Animated.Value(isActive ? 1 : 0.95)).current;

  useEffect(() => {
    fadeAnim.stopAnimation();
    slideAnim.stopAnimation();
    scaleAnim.stopAnimation();

    const slideTarget = isActive
      ? 0
      : getInactiveSlideOffset(direction, SCREEN_W, SCREEN_H);

    const animations = [];

    if (transitionType === "fade") {
      animations.push(
        Animated.timing(fadeAnim, {
          toValue: isActive ? 1 : 0,
          duration,
          useNativeDriver: true,
        })
      );
    } else if (transitionType === "slide") {
      animations.push(
        Animated.timing(slideAnim, {
          toValue: slideTarget,
          duration,
          useNativeDriver: true,
        })
      );
    } else if (transitionType === "scale") {
      animations.push(
        Animated.timing(scaleAnim, {
          toValue: isActive ? 1 : 0.95,
          duration,
          useNativeDriver: true,
        })
      );
    } else if (transitionType === "slideFade") {
      animations.push(
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: isActive ? 1 : 0,
            duration,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: slideTarget,
            duration,
            useNativeDriver: true,
          }),
        ])
      );
    }

    if (animations.length > 0) {
      Animated.parallel(animations).start();
    }
  }, [
    isActive,
    transitionType,
    direction,
    duration,
    fadeAnim,
    slideAnim,
    scaleAnim,
  ]);

  const getTransform = () => {
    const transforms = [];

    if (transitionType === "slide" || transitionType === "slideFade") {
      if (isHorizontalDirection(direction)) {
        transforms.push({ translateX: slideAnim });
      } else {
        transforms.push({ translateY: slideAnim });
      }
    }

    if (transitionType === "scale") {
      transforms.push({ scale: scaleAnim });
    }

    return transforms;
  };

  const getOpacity = () => {
    if (transitionType === "fade" || transitionType === "slideFade") {
      return fadeAnim;
    }
    return 1;
  };

  return (
    <Animated.View
      pointerEvents={isActive ? "auto" : "none"}
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: getOpacity(),
        transform: getTransform(),
      }}
    >
      {children}
    </Animated.View>
  );
};

export default ScreenTransition;
