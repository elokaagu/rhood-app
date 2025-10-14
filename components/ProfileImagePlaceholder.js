import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const ProfileImagePlaceholder = ({ size = 40, style }) => {
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
      <Ionicons name="person" size={size * 0.5} color="hsl(0, 0%, 50%)" />
    </View>
  );
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: "hsl(0, 0%, 15%)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ProfileImagePlaceholder;
