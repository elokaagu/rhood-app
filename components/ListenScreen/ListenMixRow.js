import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProgressiveImage from "../ProgressiveImage";
import styles from "../ListenScreen.styles";

function ListenMixRow({
  mix,
  isPlaying,
  isLiked,
  likeLoading,
  onPress,
  onLongPress,
  onToggleLike,
}) {
  const imageUri = mix.artwork_url || mix.image_url || mix.image;
  const artist = mix.artist || mix.user_dj_name || "Unknown";

  return (
    <TouchableOpacity
      style={styles.popularRow}
      onPress={() => onPress(mix)}
      onLongPress={() => onLongPress(mix)}
      delayLongPress={500}
      activeOpacity={0.8}
    >
      <View style={styles.popularImageWrap}>
        <ProgressiveImage
          source={imageUri ? { uri: imageUri } : null}
          style={styles.popularImage}
          contentFit="cover"
          placeholder={
            <View
              style={[
                styles.popularImage,
                {
                  backgroundColor: "hsl(0, 0%, 12%)",
                  justifyContent: "center",
                  alignItems: "center",
                },
              ]}
            >
              <Ionicons name="musical-notes" size={24} color="hsl(75, 100%, 60%)" />
            </View>
          }
        />
        {isPlaying && (
          <View style={styles.recommendationPlayingOverlay}>
            <Ionicons name="play" size={20} color="hsl(75, 100%, 60%)" />
          </View>
        )}
      </View>
      <View style={styles.popularInfo}>
        <Text style={styles.popularTitle} numberOfLines={1}>
          {mix.title}
        </Text>
        <Text style={styles.popularSubtitle} numberOfLines={1}>
          {artist}
        </Text>
        <View style={styles.popularMetaRow}>
          {mix.durationFormatted && (
            <Text style={styles.popularMeta}>{mix.durationFormatted}</Text>
          )}
          {mix.genre && (
            <>
              {mix.durationFormatted && (
                <Text style={styles.popularMeta}> • </Text>
              )}
              <Text style={styles.popularMeta}>{mix.genre}</Text>
            </>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.likeButton}
        onPress={(e) => {
          e.stopPropagation();
          onToggleLike(mix);
        }}
        activeOpacity={0.7}
        disabled={likeLoading}
      >
        <Ionicons
          name={isLiked ? "heart" : "heart-outline"}
          size={18}
          color={isLiked ? "hsl(75, 100%, 60%)" : "hsl(0, 0%, 60%)"}
        />
      </TouchableOpacity>
      <Ionicons name="chevron-forward" size={18} color="hsl(0, 0%, 60%)" />
    </TouchableOpacity>
  );
}

export default memo(ListenMixRow);
