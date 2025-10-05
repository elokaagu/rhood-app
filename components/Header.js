import React from "react";
import { View, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "../contexts/NavigationContext";
import { COLORS, SPACING } from "../lib/sharedStyles";

const Header = () => {
  const { toggleMenu } = useNavigation();

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Image
          source={require("../assets/RHOOD_Lettering_Logo.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
          <Ionicons name="menu" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: COLORS.background,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerLeft: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-start",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  logoImage: {
    height: 36,
    width: 140,
    alignSelf: "flex-start",
  },
});

export default Header;

