import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HapticPatterns } from "../../lib/haptics";
import styles from "../ListenScreen.styles";

function ListenSectionHeader({ section }) {
  if (!section) return null;

  if (section.type === "horizontalMixes") {
    return (
      <View style={styles.recommendationsSection}>
        <View style={styles.recommendationsHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="sparkles" size={18} color="hsl(75, 100%, 60%)" />
            <Text style={styles.recommendationsTitle}>YOU MAY LIKE</Text>
          </View>
        </View>
        <Text style={styles.recommendationExplainer}>{section.subtitle}</Text>
      </View>
    );
  }

  const isClickable = !!section.onSeeAll;
  const content = (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {section.id === "playlists" && (
          <Ionicons name="musical-notes" size={18} color="hsl(75, 100%, 60%)" />
        )}
        {section.id === "trending" && (
          <Ionicons name="flame" size={18} color="hsl(75, 100%, 60%)" />
        )}
        {section.id === "yourLikes" && (
          <Ionicons name="heart" size={18} color="hsl(75, 100%, 60%)" />
        )}
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
      {isClickable && (
        <Ionicons name="chevron-forward" size={18} color="hsl(0, 0%, 60%)" />
      )}
    </>
  );

  return (
    <View style={styles.section}>
      {isClickable ? (
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => {
            HapticPatterns.itemPress();
            section.onSeeAll?.();
          }}
          activeOpacity={0.7}
        >
          {content}
        </TouchableOpacity>
      ) : (
        <View style={styles.sectionHeader}>{content}</View>
      )}
      <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
    </View>
  );
}

export default memo(ListenSectionHeader);
