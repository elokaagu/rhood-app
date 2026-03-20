import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const DEFAULT_ICON_COLOR = "hsl(0, 0%, 50%)";

function getInitial(name) {
  if (name == null) return null;
  const s = typeof name === "string" ? name.trim() : String(name).trim();
  if (!s) return null;
  const ch = s.charAt(0) === "@" && s.length > 1 ? s.charAt(1) : s.charAt(0);
  if (!ch || /\s/.test(ch)) return null;
  return ch.toUpperCase();
}

/**
 * Circular avatar placeholder — person icon, or first letter when `name` is set.
 *
 * @param {number} [size=40]
 * @param {object} [style] — merged with base circle (e.g. dimensions from parent)
 * @param {string} [name] — display name / @handle; drives optional initial
 * @param {string} [iconColor] — person icon color (default neutral gray)
 */
const ProfileImagePlaceholder = ({
  size = 40,
  style,
  name,
  iconColor = DEFAULT_ICON_COLOR,
}) => {
  const initial = getInitial(name);

  return (
    <View
      style={[
        styles.placeholder,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      {initial ? (
        <Text
          style={[
            styles.initial,
            {
              fontSize: Math.max(10, size * 0.4),
              lineHeight: Math.max(12, size * 0.44),
            },
          ]}
          numberOfLines={1}
          maxFontSizeMultiplier={1.4}
        >
          {initial}
        </Text>
      ) : (
        <Ionicons name="person" size={size * 0.5} color={iconColor} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  initial: {
    color: "hsl(0, 0%, 96%)",
    fontFamily: "Helvetica Neue",
    fontWeight: "700",
    textAlign: "center",
  },
});

export default ProfileImagePlaceholder;
