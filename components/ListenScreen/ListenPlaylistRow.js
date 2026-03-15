import React, { memo } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HapticPatterns } from "../../lib/haptics";
import styles from "../ListenScreen.styles";

function ListenPlaylistRow({ playlist, onPress }) {
  return (
    <TouchableOpacity
      style={styles.playlistRow}
      onPress={() => {
        HapticPatterns.itemPress();
        onPress(playlist);
      }}
      activeOpacity={0.8}
    >
      <View style={styles.playlistIconContainer}>
        {playlist.image_url ? (
          <Image
            source={{ uri: playlist.image_url }}
            style={styles.playlistImage}
            resizeMode="cover"
          />
        ) : (
          <Ionicons name="musical-notes" size={24} color="hsl(75, 100%, 60%)" />
        )}
      </View>
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistName} numberOfLines={1}>
          {playlist.name}
        </Text>
        <Text style={styles.playlistMeta}>
          {playlist.mixCount ?? 0} {(playlist.mixCount ?? 0) === 1 ? "mix" : "mixes"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="hsl(0, 0%, 60%)" />
    </TouchableOpacity>
  );
}

export default memo(ListenPlaylistRow);
