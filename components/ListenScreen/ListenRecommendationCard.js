import React, { memo } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import ProgressiveImage from "../ProgressiveImage";
import styles from "../ListenScreen.styles";

function ListenRecommendationCard({
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
      style={styles.recommendationCard}
      onPress={() => onPress(mix)}
      onLongPress={() => onLongPress(mix)}
      delayLongPress={500}
      activeOpacity={0.8}
    >
      <View style={styles.recommendationImageContainer}>
        <ProgressiveImage
          source={imageUri ? { uri: imageUri } : null}
          style={styles.recommendationImage}
          contentFit="cover"
          placeholder={
            <View
              style={[
                styles.recommendationImage,
                {
                  backgroundColor: "hsl(0, 0%, 12%)",
                  justifyContent: "center",
                  alignItems: "center",
                },
              ]}
            >
              <Ionicons name="musical-notes" size={28} color="hsl(75, 100%, 60%)" />
            </View>
          }
        />
        {isPlaying && (
          <View style={styles.recommendationPlayingOverlay}>
            <Ionicons name="play" size={24} color="hsl(75, 100%, 60%)" />
          </View>
        )}
        <TouchableOpacity
          style={styles.recommendationLikeButton}
          onPress={(e) => {
            e.stopPropagation();
            onToggleLike(mix);
          }}
          activeOpacity={0.7}
          disabled={likeLoading}
        >
          <Ionicons
            name={isLiked ? "heart" : "heart-outline"}
            size={20}
            color={isLiked ? "hsl(75, 100%, 60%)" : "hsl(0, 0%, 100%)"}
          />
        </TouchableOpacity>
        <LinearGradient
          colors={[
            "transparent",
            "rgba(0, 0, 0, 0.3)",
            "rgba(0, 0, 0, 0.8)",
            "rgba(0, 0, 0, 0.95)",
          ]}
          style={styles.recommendationGradientOverlay}
        />
        <View style={styles.recommendationInfo}>
          <Text style={styles.recommendationTitle} numberOfLines={1}>
            {mix.title}
          </Text>
          <Text style={styles.recommendationArtist} numberOfLines={1}>
            {artist}
          </Text>
          {mix.genre && (
            <Text style={styles.recommendationGenre} numberOfLines={1}>
              {mix.genre}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default memo(ListenRecommendationCard);
