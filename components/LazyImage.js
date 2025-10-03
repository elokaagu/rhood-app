import React, { useState } from "react";
import { View, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const LazyImage = ({ source, style, placeholder = null, ...props }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

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

  if (hasError) {
    return renderPlaceholder();
  }

  return (
    <View style={style}>
      {/* Show placeholder while loading */}
      {!isLoaded && renderPlaceholder()}

      {/* Show image when loaded */}
      {isLoaded && (
        <Image
          source={source}
          style={[styles.image, style]}
          onError={handleError}
          {...props}
        />
      )}

      {/* Hidden image to trigger load event */}
      <Image
        source={source}
        style={styles.hiddenImage}
        onLoad={handleLoad}
        onError={handleError}
        {...props}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 15%)",
  },
  image: {
    flex: 1,
  },
  hiddenImage: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
});

export default LazyImage;
