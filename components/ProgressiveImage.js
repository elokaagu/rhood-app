import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  Animated,
  View,
  StyleSheet,
} from "react-native";
import { Image as ExpoImage } from "expo-image";

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
 *
 * Cache-hit fast path: if expo-image fires onLoad within 50ms of mount the
 * image was already on disk — we skip the animation entirely and reveal
 * instantly, preserving the smooth feel for images the user has seen before.
 * Only genuinely new images (network fetch) get the fade-in.
 *
 * @param {object|number} source    — RN Image source
 * @param {object}        [style]   — outer container (size, borderRadius, overflow…)
 * @param {object}        [imageStyle] — overrides on the image layer only
 * @param {ReactNode}     [placeholder] — shown until load completes
 * @param {string}        [contentFit='cover']
 * @param {number}        [transition=300] — fade duration in ms for network-fetched images
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
  const mountTimeRef = useRef(Date.now());

  const sourceSignature = useMemo(
    () => getSourceSignature(source),
    [source]
  );

  useEffect(() => {
    mountTimeRef.current = Date.now();
    setIsLoaded(false);
    setHasError(false);
    setRevealDone(false);
    fadeAnim.setValue(0);
  }, [sourceSignature, fadeAnim]);

  const handleLoad = () => {
    setIsLoaded(true);
    const elapsed = Date.now() - mountTimeRef.current;
    // Cache hit: image was already on disk — skip the fade and reveal instantly.
    // Only animate images that had to be fetched over the network.
    if (elapsed < 50) {
      fadeAnim.setValue(1);
      setRevealDone(true);
    } else {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: transition,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setRevealDone(true);
      });
    }
  };

  const handleError = (error) => {
    setHasError(true);
    setRevealDone(false);
    fadeAnim.setValue(0);
    onError?.(error);
  };

  const showPlaceholder = !isLoaded || hasError || !revealDone;

  const placeholderContent = (
    <View style={styles.placeholderLayer} pointerEvents="none">
      {placeholder != null ? (
        <View style={styles.placeholderInner}>{placeholder}</View>
      ) : (
        <View style={styles.neutralPlaceholder} />
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
        <Animated.View style={[styles.image, imageStyle, { opacity: fadeAnim }]}>
          <ExpoImage
            {...imageProps}
            source={source}
            style={StyleSheet.absoluteFill}
            contentFit={contentFit}
            cachePolicy="disk"
            transition={0}
            onLoad={handleLoad}
            onError={handleError}
          />
        </Animated.View>
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
