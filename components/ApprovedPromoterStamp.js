import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Visual stamp for surfaces where a user is contacted by an R/HOOD–approved promoter.
 */
function ApprovedPromoterStamp({ compact = false, style }) {
  return (
    <View
      style={[styles.wrap, compact && styles.wrapCompact, style]}
      accessibilityRole="text"
      accessibilityLabel="R/HOOD approved promoter"
    >
      <Ionicons
        name="shield-checkmark"
        size={compact ? 12 : 14}
        color="hsl(75, 100%, 55%)"
      />
      <Text style={[styles.text, compact && styles.textCompact]}>
        R/HOOD approved promoter
      </Text>
    </View>
  );
}

export default memo(ApprovedPromoterStamp);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "hsl(75, 55%, 32%)",
    backgroundColor: "rgba(75, 255, 150, 0.08)",
  },
  wrapCompact: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  text: {
    fontSize: 11,
    fontFamily: "Helvetica Neue",
    fontWeight: "700",
    color: "hsl(75, 100%, 62%)",
    letterSpacing: 0.2,
  },
  textCompact: {
    fontSize: 10,
  },
});
