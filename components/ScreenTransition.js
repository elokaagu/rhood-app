import React, { useEffect, useRef } from 'react';
import { Animated, Dimensions } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ScreenTransition = ({ 
  children, 
  isActive, 
  transitionType = 'fade',
  duration = 300,
  direction = 'up'
}) => {
  const fadeAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const slideAnim = useRef(new Animated.Value(isActive ? 0 : screenHeight)).current;
  const scaleAnim = useRef(new Animated.Value(isActive ? 1 : 0.95)).current;

  useEffect(() => {
    const animations = [];

    try {
      if (transitionType === 'fade') {
        animations.push(
          Animated.timing(fadeAnim, {
            toValue: isActive ? 1 : 0,
            duration,
            useNativeDriver: true,
          })
        );
      } else if (transitionType === 'slide') {
        const slideValue = isActive ? 0 : (direction === 'up' ? screenHeight : -screenHeight);
        animations.push(
          Animated.timing(slideAnim, {
            toValue: slideValue,
            duration,
            useNativeDriver: true,
          })
        );
      } else if (transitionType === 'scale') {
        animations.push(
          Animated.timing(scaleAnim, {
            toValue: isActive ? 1 : 0.95,
            duration,
            useNativeDriver: true,
          })
        );
      } else if (transitionType === 'slideFade') {
        const slideValue = isActive ? 0 : (direction === 'up' ? screenHeight : -screenHeight);
        animations.push(
          Animated.parallel([
            Animated.timing(fadeAnim, {
              toValue: isActive ? 1 : 0,
              duration,
              useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
              toValue: slideValue,
              duration,
              useNativeDriver: true,
            })
          ])
        );
      }

      if (animations.length > 0) {
        Animated.parallel(animations).start();
      }
    } catch (error) {
      console.log('ScreenTransition animation error:', error);
    }
  }, [isActive, transitionType, direction, duration]);

  const getTransform = () => {
    const transforms = [];
    
    if (transitionType === 'slide' || transitionType === 'slideFade') {
      transforms.push({ translateY: slideAnim });
    }
    
    if (transitionType === 'scale') {
      transforms.push({ scale: scaleAnim });
    }
    
    return transforms;
  };

  const getOpacity = () => {
    if (transitionType === 'fade' || transitionType === 'slideFade') {
      return fadeAnim;
    }
    return 1;
  };

  return (
    <Animated.View
      style={{
        position: 'absolute',
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
