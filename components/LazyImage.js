import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LazyImage = ({ 
  source, 
  style, 
  placeholder = null,
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLoaded) {
      // Fade in the image
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoaded, fadeAnim]);

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
            size={24} 
            color="hsl(0, 0%, 30%)" 
          />
        </View>
      );
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

  return (
    <View style={[styles.container, style]}>
      {/* Loading placeholder */}
      {isLoading && !hasError && (
        <View style={styles.placeholderContainer}>
          {renderPlaceholder()}
        </View>
      )}

      {/* Main image */}
      {!hasError && (
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
      )}

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
  placeholderContainer: {
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
    backgroundColor: 'hsl(0, 0%, 15%)',
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
});

export default LazyImage;
