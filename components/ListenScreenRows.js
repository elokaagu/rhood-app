/**
 * Memoized row components for Listen screen lists. Reduces jank by avoiding
 * full list re-renders when only one row's state (e.g. playing, liked) changes.
 */
import React, { memo } from "react";
import { View, Text, TouchableOpacity, Image, ScrollView, Platform } from "react-native";
import ProgressiveImage from "./ProgressiveImage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { HapticPatterns } from "../lib/haptics";
import styles from "./ListenScreen.styles";

export const ListenMixRow = memo(function ListenMixRow({
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
            <View style={[styles.popularImage, { backgroundColor: "hsl(0, 0%, 12%)", justifyContent: "center", alignItems: "center" }]}>
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
        <Text style={styles.popularTitle} numberOfLines={1}>{mix.title}</Text>
        <Text style={styles.popularSubtitle} numberOfLines={1}>{artist}</Text>
        <View style={styles.popularMetaRow}>
          {mix.durationFormatted && <Text style={styles.popularMeta}>{mix.durationFormatted}</Text>}
          {mix.genre && (
            <>
              {mix.durationFormatted && <Text style={styles.popularMeta}> • </Text>}
              <Text style={styles.popularMeta}>{mix.genre}</Text>
            </>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.likeButton}
        onPress={(e) => { e.stopPropagation(); onToggleLike(mix); }}
        activeOpacity={0.7}
        disabled={likeLoading}
      >
        <Ionicons name={isLiked ? "heart" : "heart-outline"} size={18} color={isLiked ? "hsl(75, 100%, 60%)" : "hsl(0, 0%, 60%)"} />
      </TouchableOpacity>
      <Ionicons name="chevron-forward" size={18} color="hsl(0, 0%, 60%)" />
    </TouchableOpacity>
  );
});

export const ListenPlaylistRow = memo(function ListenPlaylistRow({ playlist, onPress }) {
  return (
    <TouchableOpacity
      style={styles.playlistRow}
      onPress={() => { HapticPatterns.itemPress(); onPress(playlist); }}
      activeOpacity={0.8}
    >
      <View style={styles.playlistIconContainer}>
        {playlist.image_url ? (
          <Image source={{ uri: playlist.image_url }} style={styles.playlistImage} resizeMode="cover" />
        ) : (
          <Ionicons name="musical-notes" size={24} color="hsl(75, 100%, 60%)" />
        )}
      </View>
      <View style={styles.playlistInfo}>
        <Text style={styles.playlistName} numberOfLines={1}>{playlist.name}</Text>
        <Text style={styles.playlistMeta}>
          {playlist.mixCount ?? 0} {(playlist.mixCount ?? 0) === 1 ? "mix" : "mixes"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="hsl(0, 0%, 60%)" />
    </TouchableOpacity>
  );
});

export const ListenPlaylistSquareCard = memo(function ListenPlaylistSquareCard({
  playlist,
  onPress,
}) {
  const imageUri = playlist.image_url || null;
  return (
    <TouchableOpacity
      style={styles.playlistSquareTouchable}
      onPress={() => { HapticPatterns.itemPress(); onPress(playlist); }}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`${playlist.name || "Playlist"}, ${playlist.mixCount ?? 0} mixes`}
    >
      <View style={styles.playlistSquareImageWrap}>
        {imageUri ? (
          <ProgressiveImage
            source={{ uri: imageUri }}
            style={styles.playlistSquareImage}
            contentFit="cover"
            placeholder={
              <View style={[styles.playlistSquareImage, { backgroundColor: "hsl(0, 0%, 12%)", justifyContent: "center", alignItems: "center" }]}>
                <Ionicons name="musical-notes" size={32} color="hsl(75, 100%, 60%)" />
              </View>
            }
          />
        ) : (
          <Ionicons name="musical-notes" size={36} color="hsl(75, 100%, 60%)" />
        )}
      </View>
      <Text style={styles.playlistSquareTitle} numberOfLines={2}>
        {playlist.name || "Playlist"}
      </Text>
      <Text style={styles.playlistSquareMeta}>
        {(playlist.mixCount ?? 0) === 1 ? "1 mix" : `${playlist.mixCount ?? 0} mixes`}
      </Text>
    </TouchableOpacity>
  );
});

export const ListenPlaylistStrip = memo(function ListenPlaylistStrip({
  playlists,
  onPlaylistPress,
}) {
  if (!playlists?.length) return null;
  return (
    <View style={styles.playlistStripWrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.playlistStripContent}
        decelerationRate={Platform.OS === "ios" ? "normal" : 0.98}
      >
        {playlists.map((p) => (
          <ListenPlaylistSquareCard
            key={p.id ?? p.name}
            playlist={p}
            onPress={onPlaylistPress}
          />
        ))}
      </ScrollView>
    </View>
  );
});

export const ListenSectionHeader = memo(function ListenSectionHeader({ section }) {
  if (!section) return null;
  if (section.type === "horizontalMixes") {
    return (
      <View style={styles.recommendationsSection}>
        <View style={styles.recommendationsHeader}>
          <Text style={styles.recommendationsTitle}>You may like</Text>
        </View>
        <Text style={styles.recommendationExplainer}>{section.subtitle}</Text>
      </View>
    );
  }
  const isClickable = !!section.onSeeAll;
  const content = (
    <>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      {isClickable ? <Text style={styles.sectionHeaderLink}>See all</Text> : null}
    </>
  );
  return (
    <View style={styles.section}>
      {isClickable ? (
        <TouchableOpacity style={styles.sectionHeader} onPress={() => { HapticPatterns.itemPress(); section.onSeeAll?.(); }} activeOpacity={0.7}>
          {content}
        </TouchableOpacity>
      ) : (
        <View style={styles.sectionHeader}>{content}</View>
      )}
      <Text style={styles.sectionSubtitle}>{section.subtitle}</Text>
    </View>
  );
});

const RecommendationCard = memo(function RecommendationCard({
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
            <View style={[styles.recommendationImage, { backgroundColor: "hsl(0, 0%, 12%)", justifyContent: "center", alignItems: "center" }]}>
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
          onPress={(e) => { e.stopPropagation(); onToggleLike(mix); }}
          activeOpacity={0.7}
          disabled={likeLoading}
        >
          <Ionicons name={isLiked ? "heart" : "heart-outline"} size={20} color={isLiked ? "hsl(75, 100%, 60%)" : "hsl(0, 0%, 100%)"} />
        </TouchableOpacity>
        <LinearGradient
          colors={["transparent", "rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0.8)", "rgba(0, 0, 0, 0.95)"]}
          style={styles.recommendationGradientOverlay}
        />
        <View style={styles.recommendationInfo}>
          <Text style={styles.recommendationTitle} numberOfLines={1}>{mix.title}</Text>
          <Text style={styles.recommendationArtist} numberOfLines={1}>{artist}</Text>
          {mix.genre && <Text style={styles.recommendationGenre} numberOfLines={1}>{mix.genre}</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
});

export const ListenRecommendationStrip = memo(function ListenRecommendationStrip({
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
        decelerationRate={Platform.OS === "ios" ? "normal" : 0.98}
      >
        {mixes.map((mix) => (
          <RecommendationCard
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
});
