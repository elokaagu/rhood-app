import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

const LazyImage = ({
  source,
  style,
  placeholder = null,
  blurRadius = 10,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const blurAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isLoaded) {
      // Fade in the image and fade out the blur
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(blurAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLoaded]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
  };

  const renderPlaceholder = () => {
    if (placeholder) {
      return placeholder;
    }

    return (
      <View style={[styles.placeholder, style]}>
        <Ionicons
          name="musical-notes-outline"
          size={24}
          color="hsl(0, 0%, 30%)"
        />
      </View>
    );
  };

  const renderBlurPlaceholder = () => {
    if (Platform.OS === 'web') {
      // For web, use a simple view with CSS blur
      return (
        <View style={[styles.blurPlaceholder, style]}>
          <View style={styles.webBlurContainer}>
            <Ionicons
              name="musical-notes-outline"
              size={24}
              color="hsl(0, 0%, 30%)"
            />
          </View>
        </View>
      );
    }

    // For native, use BlurView
    return (
      <Animated.View style={[styles.blurContainer, { opacity: blurAnim }]}>
        <BlurView
          intensity={blurRadius}
          style={[styles.blurView, style]}
        >
          <View style={styles.blurContent}>
            <Ionicons
              name="musical-notes-outline"
              size={24}
              color="hsl(0, 0%, 30%)"
            />
          </View>
        </BlurView>
      </Animated.View>
    );
  };

  if (hasError) {
    return renderPlaceholder();
  }

  return (
    <View style={style}>
      {/* Blur placeholder */}
      {!isLoaded && renderBlurPlaceholder()}
      
      {/* Actual image */}
      <Animated.View style={[styles.imageContainer, { opacity: fadeAnim }]}>
        <Image
          source={source}
          style={[styles.image, style]}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'hsl(0, 0%, 15%)',
  },
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  blurView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'hsl(0, 0%, 15%)',
  },
  webBlurContainer: {
    filter: 'blur(10px)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  image: {
    flex: 1,
  },
});

export default LazyImage;