import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Image,
  Animated,
  View,
  StyleSheet,
} from "react-native";

const AnimatedImage = Animated.createAnimatedComponent(Image);

/** Map expo-image-style contentFit names to RN Image resizeMode. */
function contentFitToResizeMode(contentFit) {
  const key =
    typeof contentFit === "string" ? contentFit.toLowerCase() : contentFit;
  const map = {
    cover: "cover",
    contain: "contain",
    fill: "stretch",
    stretch: "stretch",
    scaledown: "contain",
    none: "center",
    center: "center",
    repeat: "repeat",
  };
  return map[key] ?? "cover";
}

function getSourceSignature(source) {
  if (source == null) return null;
  if (typeof source === "number") return source;
  if (typeof source === "object" && source.uri != null) return source.uri;
  try {
    return JSON.stringify(source);
  } catch {
    return String(source);
  }
}

/**
 * Remote/local image with a placeholder and opacity fade-in when loaded.
 * (Not multi-resolution progressive decode — single source, fade when ready.)
 *
 * @param {object|number} source — RN Image source
 * @param {object} [style] — outer container (size, borderRadius, margin, overflow)
 * @param {object} [imageStyle] — optional overrides on the image layer only
 * @param {React.ReactNode} [placeholder] — custom placeholder; should fill space if needed
 * @param {string} [contentFit='cover'] — maps to resizeMode (cover, contain, fill, …)
 */
const ProgressiveImage = ({
  source,
  style,
  imageStyle,
  placeholder = null,
  contentFit = "cover",
  transition = 300,
  onError,
  ...imageProps
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [revealDone, setRevealDone] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const sourceSignature = useMemo(
    () => getSourceSignature(source),
    [source]
  );

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setRevealDone(false);
    fadeAnim.setValue(0);
  }, [sourceSignature, fadeAnim]);

  const resizeMode = contentFitToResizeMode(contentFit);

  const handleLoad = () => {
    setIsLoaded(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: transition,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setRevealDone(true);
    });
  };

  const handleError = (error) => {
    setHasError(true);
    setRevealDone(false);
    fadeAnim.setValue(0);
    onError?.(error);
  };

  /** Keep placeholder under the image until load + fade completes (avoids empty flash at opacity 0). */
  const showPlaceholder = !isLoaded || hasError || !revealDone;

  const defaultPlaceholder = (
    <View style={styles.neutralPlaceholder} />
  );

  const placeholderContent = (
    <View style={styles.placeholderLayer} pointerEvents="none">
      {placeholder != null ? (
        <View style={styles.placeholderInner}>{placeholder}</View>
      ) : (
        defaultPlaceholder
      )}
    </View>
  );

  if (!source) {
    return (
      <View style={[styles.container, style]}>
        {placeholderContent}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {showPlaceholder && placeholderContent}

      {!hasError && (
        <AnimatedImage
          {...imageProps}
          source={source}
          style={[styles.image, imageStyle, { opacity: fadeAnim }]}
          resizeMode={resizeMode}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
  },
  placeholderLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  placeholderInner: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  /** Flat neutral surface (not a gradient). */
  neutralPlaceholder: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "hsl(0, 0%, 15%)",
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    zIndex: 1,
  },
});

export default ProgressiveImage;
