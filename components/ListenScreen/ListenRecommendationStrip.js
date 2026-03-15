import React, { memo } from "react";
import { View, ScrollView } from "react-native";
import ListenRecommendationCard from "./ListenRecommendationCard";
import styles from "../ListenScreen.styles";

function ListenRecommendationStrip({
  mixes,
  playingMixId,
  likedMixIds,
  likeLoadingMap,
  onMixPress,
  onMixLongPress,
  onToggleLike,
}) {
  if (!mixes?.length) return null;

  return (
    <View style={styles.recommendationsSection}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.recommendationsScroll}
        contentContainerStyle={styles.recommendationsContent}
      >
        {mixes.map((mix) => (
          <ListenRecommendationCard
            key={mix.id}
            mix={mix}
            isPlaying={playingMixId === mix.id}
            isLiked={likedMixIds.has(mix.id)}
            likeLoading={!!likeLoadingMap[mix.id]}
            onPress={onMixPress}
            onLongPress={onMixLongPress}
            onToggleLike={onToggleLike}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export default memo(ListenRecommendationStrip);
