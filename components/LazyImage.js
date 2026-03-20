import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProgressiveImage from "./ProgressiveImage";

const defaultIconPlaceholder = (
  <View style={styles.iconPlaceholder}>
    <Ionicons
      name="musical-notes-outline"
      size={24}
      color="hsl(0, 0%, 30%)"
    />
  </View>
);

/**
 * Back-compat alias: same behavior as {@link ProgressiveImage} (one `Image`, layered
 * placeholder, fade-in). Prefer importing `ProgressiveImage` directly in new code.
 *
 * @param {object|number|null} source — RN `Image` source
 * @param {object} style — layout on the outer container (size, radius, margin, overflow)
 * @param {React.ReactNode} [placeholder] — optional; defaults to musical-notes icon
 * @param {object} ...imageProps — forwarded to the underlying `Image` (e.g. `accessibilityLabel`)
 */
function LazyImage({ source, style, placeholder = null, ...imageProps }) {
  return (
    <ProgressiveImage
      source={source}
      style={style}
      placeholder={placeholder ?? defaultIconPlaceholder}
      contentFit="cover"
      {...imageProps}
    />
  );
}

const styles = StyleSheet.create({
  iconPlaceholder: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 15%)",
  },
});

export default LazyImage;
