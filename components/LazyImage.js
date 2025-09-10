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

  useEffect(() => {
    if (isLoaded) {
      // Simple fade in animation without useNativeDriver for web compatibility
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false, // Changed to false for web compatibility
      }).start();
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
      <View style={[styles.blurContainer, style]}>
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
      </View>
    );
  };

  if (hasError) {
    return renderPlaceholder();
  }

  return (
    <View style={style}>
      {/* Blur placeholder - only show when not loaded */}
      {!isLoaded && renderBlurPlaceholder()}
      
      {/* Actual image - only show when loaded */}
      {isLoaded && (
        <Animated.View style={[styles.imageContainer, { opacity: fadeAnim }]}>
          <Image
            source={source}
            style={[styles.image, style]}
            onError={handleError}
            {...props}
          />
        </Animated.View>
      )}
      
      {/* Hidden image for loading - this triggers the onLoad */}
      {!isLoaded && !hasError && (
        <Image
          source={source}
          style={styles.hiddenImage}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}
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
  hiddenImage: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});

export default LazyImage;