import React, { useState, useRef } from 'react';
import { Image, Animated, View, StyleSheet } from 'react-native';

const ProgressiveImage = ({
  source,
  style,
  placeholder = null,
  contentFit = "cover",
  transition = 300,
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleLoad = () => {
    setIsLoaded(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: transition,
      useNativeDriver: true,
    }).start();
  };

  const handleError = () => {
    setHasError(true);
  };

  const renderPlaceholder = () => {
    if (placeholder) {
      return placeholder;
    }

    // Simple gradient placeholder
    return (
      <View style={[styles.placeholder, style]}>
        <View style={styles.gradientPlaceholder} />
      </View>
    );
  };

  return (
    <View style={style}>
      {/* Placeholder - always visible until image loads */}
      {!isLoaded && !hasError && renderPlaceholder()}
      
      {/* Actual image - fades in when loaded */}
      {!hasError && (
        <Animated.View style={[styles.imageContainer, { opacity: fadeAnim }]}>
          <Image
            source={source}
            style={[styles.image, style]}
            onLoad={handleLoad}
            onError={handleError}
            {...props}
          />
        </Animated.View>
      )}
      
      {/* Hidden image to trigger load event */}
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gradientPlaceholder: {
    flex: 1,
    backgroundColor: 'hsl(0, 0%, 15%)',
    // Add a subtle gradient effect
    shadowColor: 'hsl(0, 0%, 30%)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
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

export default ProgressiveImage;