/**
 * Memoized, list-based chunks for UploadMixScreen — avoids re-rendering all genre
 * chips and library thumbnails on every keystroke (same idea as Listen FlatLists).
 */

import React, { memo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { HapticPatterns } from "../../lib/haptics";
import ProgressiveImage from "../ProgressiveImage";

export const MIX_GENRES = [
  "House",
  "Techno",
  "R&B",
  "Soul",
  "Hip-Hop",
  "Electronic",
  "Drum & Bass",
  "Dubstep",
  "Trance",
  "Deep House",
  "Tech House",
  "Disco",
  "Funk",
  "Other",
];

const GENRE_BATCH = 8;

/** Same chrome as the carousel so layout does not jump while mixes load. */
export const UploadMixLibraryPlaceholder = memo(
  function UploadMixLibraryPlaceholder({ styles: st, primaryColor }) {
    return (
      <View style={st.section}>
        <View style={st.sectionCard}>
          <Text style={st.sectionKicker}>Library</Text>
          <Text style={st.sectionTitle}>Your mixes</Text>
          <Text style={st.sectionSubtitle}>
            Tap a mix to edit metadata and artwork, or start fresh below.
          </Text>
          <View style={st.libraryPlaceholderStrip}>
            <View style={st.libraryPlaceholderCards}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={st.libraryPlaceholderCard} />
              ))}
            </View>
            <ActivityIndicator
              style={st.libraryPlaceholderSpinner}
              size="small"
              color={primaryColor}
            />
          </View>
          <View style={st.libraryPlaceholderButtonBar} />
        </View>
      </View>
    );
  }
);

/** After load: no mixes — same vertical rhythm as placeholder/carousel to avoid layout jump. */
export const UploadMixLibraryEmptyState = memo(function UploadMixLibraryEmptyState({
  styles: st,
  primaryColor,
  backgroundColor,
  onNewMix,
}) {
  return (
    <View style={st.section}>
      <View style={st.sectionCard}>
        <Text style={st.sectionKicker}>Library</Text>
        <Text style={st.sectionTitle}>Your mixes</Text>
        <Text style={st.sectionSubtitle}>
          Tap a mix to edit metadata and artwork, or start fresh below.
        </Text>
        <View style={st.libraryEmptyMessageWrap}>
          <Ionicons
            name="albums-outline"
            size={40}
            color={primaryColor}
            style={{ opacity: 0.35 }}
          />
          <Text style={st.libraryEmptyTitle}>No mixes yet</Text>
          <Text style={st.libraryEmptySubtitle}>
            When you upload, they will appear here for quick edits.
          </Text>
        </View>
        <TouchableOpacity
          style={st.newMixButton}
          onPress={onNewMix}
          activeOpacity={0.7}
        >
          <View style={st.newMixButtonIconWrap}>
            <Ionicons name="add" size={22} color={backgroundColor} />
          </View>
          <Text style={st.newMixButtonText}>Upload new mix</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export const UploadMixLibraryCarousel = memo(function UploadMixLibraryCarousel({
  mixes,
  styles: st,
  primaryColor,
  backgroundColor,
  onSelectMix,
  onNewMix,
}) {
  const renderItem = useCallback(
    ({ item: mix }) => {
      const uri = mix.artwork_url || mix.image_url;
      return (
        <TouchableOpacity
          style={st.mixSelectorCard}
          onPress={() => onSelectMix(mix)}
          activeOpacity={0.7}
        >
          <View style={st.mixSelectorFullBleed}>
            {uri ? (
              <ProgressiveImage
                source={{ uri }}
                style={st.mixSelectorImage}
                contentFit="cover"
              />
            ) : (
              <View
                style={[st.mixSelectorImage, st.mixSelectorPlaceholder]}
              >
                <Ionicons name="musical-note" size={32} color={primaryColor} />
                <Text style={st.mixSelectorNoArtworkLabel}>No artwork</Text>
              </View>
            )}
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.88)"]}
              locations={[0.35, 1]}
              style={st.mixSelectorCardGradient}
            >
              <Text style={st.mixSelectorTitleOverlay} numberOfLines={1}>
                {mix.title}
              </Text>
              <Text style={st.mixSelectorGenreOverlay} numberOfLines={1}>
                {mix.genre || "No genre"}
              </Text>
            </LinearGradient>
          </View>
        </TouchableOpacity>
      );
    },
    [onSelectMix, st, primaryColor]
  );

  const keyExtractor = useCallback((m) => String(m.id), []);

  return (
    <View style={st.section}>
      <View style={st.sectionCard}>
        <Text style={st.sectionKicker}>Library</Text>
        <Text style={st.sectionTitle}>Your mixes</Text>
        <Text style={st.sectionSubtitle}>
          Tap a mix to edit metadata and artwork, or start fresh below.
        </Text>
        <FlatList
          data={mixes}
          horizontal
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          showsHorizontalScrollIndicator={false}
          style={st.mixSelectorScroll}
          contentContainerStyle={st.mixSelectorScrollContent}
          initialNumToRender={4}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews
        />
        <TouchableOpacity
          style={st.newMixButton}
          onPress={onNewMix}
          activeOpacity={0.7}
        >
          <View style={st.newMixButtonIconWrap}>
            <Ionicons name="add" size={22} color={backgroundColor} />
          </View>
          <Text style={st.newMixButtonText}>Upload new mix</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

/**
 * Multi-select genre strip. Passes an array of selected genres via onToggleGenre.
 * Props:
 *   selectedGenres — string[]  (array of currently selected genre labels)
 *   onToggleGenre  — (genre: string) => void  (parent toggles in/out of the array)
 */
export const UploadMixGenreStrip = memo(function UploadMixGenreStrip({
  genres,
  selectedGenres,
  uploading,
  styles: st,
  onToggleGenre,
}) {
  const selectedSet = Array.isArray(selectedGenres) ? new Set(selectedGenres) : new Set();

  const renderItem = useCallback(
    ({ item: genre }) => {
      const selected = selectedSet.has(genre);
      return (
        <TouchableOpacity
          style={[st.genreChip, selected && st.genreChipSelected]}
          onPress={() => {
            HapticPatterns.buttonPress();
            onToggleGenre(genre);
          }}
          disabled={uploading}
          activeOpacity={0.8}
        >
          <Text
            style={[
              st.genreChipText,
              selected && st.genreChipTextSelected,
            ]}
          >
            {genre}
          </Text>
        </TouchableOpacity>
      );
    },
    [selectedSet, uploading, onToggleGenre, st]
  );

  return (
    <FlatList
      data={genres}
      horizontal
      keyExtractor={(g) => g}
      renderItem={renderItem}
      showsHorizontalScrollIndicator={false}
      style={st.genreScroll}
      contentContainerStyle={st.genreScrollContent}
      initialNumToRender={GENRE_BATCH}
      maxToRenderPerBatch={GENRE_BATCH}
      windowSize={5}
      removeClippedSubviews
    />
  );
});
