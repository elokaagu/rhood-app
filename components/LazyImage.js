import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';

const LazyImage = ({ 
  source, 
  style, 
  placeholder = null,
  blurRadius = 10,
  fadeInDuration = 300,
  showPlaceholder = true,
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const blurAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isLoaded) {
      // Fade in the image
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: fadeInDuration,
        useNativeDriver: true,
      }).start();

      // Fade out the blur
      Animated.timing(blurAnim, {
        toValue: 0,
        duration: fadeInDuration,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoaded, fadeAnim, blurAnim, fadeInDuration]);

  const handleLoad = () => {
    setIsLoaded(true);
    setIsLoading(false);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const renderPlaceholder = () => {
    if (placeholder) {
      return placeholder;
    }

    if (hasError) {
      return (
        <View style={[styles.placeholder, style]}>
          <Ionicons 
            name="image-outline" 
            size={Math.min(style?.width || 40, style?.height || 40) * 0.4} 
            color="hsl(0, 0%, 30%)" 
          />
        </View>
      );
    }

    return (
      <View style={[styles.placeholder, style]}>
        <Ionicons 
          name="musical-notes-outline" 
          size={Math.min(style?.width || 40, style?.height || 40) * 0.4} 
          color="hsl(0, 0%, 30%)" 
        />
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {/* Blurred placeholder */}
      {isLoading && (
        <Animated.View 
          style={[
            styles.blurContainer,
            { opacity: blurAnim }
          ]}
        >
          {Platform.OS === 'web' ? (
            <View style={[StyleSheet.absoluteFillObject, styles.webBlurPlaceholder]}>
              {renderPlaceholder()}
            </View>
          ) : (
            <BlurView
              intensity={blurRadius}
              style={StyleSheet.absoluteFillObject}
            >
              {renderPlaceholder()}
            </BlurView>
          )}
        </Animated.View>
      )}

      {/* Main image */}
      <Animated.View 
        style={[
          styles.imageContainer,
          { opacity: fadeAnim }
        ]}
      >
        <Image
          source={source}
          style={[styles.image, style]}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      </Animated.View>

      {/* Fallback for when image fails to load */}
      {hasError && (
        <View style={[styles.fallback, style]}>
          {renderPlaceholder()}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  imageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'hsl(0, 0%, 10%)',
  },
  fallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'hsl(0, 0%, 10%)',
  },
  webBlurPlaceholder: {
    backgroundColor: 'hsl(0, 0%, 15%)',
    filter: 'blur(10px)',
  },
});

export default LazyImage;
