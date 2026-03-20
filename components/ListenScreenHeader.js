import React from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { HapticPatterns } from "../lib/haptics";
import styles from "./ListenScreen.styles";

export default function ListenScreenHeader({
  searchQuery,
  setSearchQuery,
  selectedGenre,
  setSelectedGenre,
  refreshing,
  availableGenres,
}) {
  return (
    <View style={styles.listenScreenHeaderRoot}>
      <View style={styles.header}>
        <Text style={styles.tsBlockBoldHeading}>LISTEN</Text>
        <Text style={styles.headerSubtitle}>
          DJ mixes from the R/HOOD community
          {refreshing && <Text> • Refreshing...</Text>}
        </Text>
      </View>

      <View style={styles.searchWrapper}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="hsl(0, 0%, 50%)" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search mixes, artists, or genres..."
            placeholderTextColor="hsl(0, 0%, 50%)"
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              if (text.trim() && selectedGenre) setSelectedGenre(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setSelectedGenre(null);
              }}
              style={styles.clearButton}
              accessibilityLabel="Clear search and genre filter"
            >
              <Ionicons name="close-circle" size={20} color="hsl(0, 0%, 50%)" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {Array.isArray(availableGenres) && availableGenres.length > 0 && (
        <View style={styles.genreFilterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.genreFilterContent}
          >
            {availableGenres.map((genre) => {
              const isActive = selectedGenre === genre;
              return (
                <TouchableOpacity
                  key={genre}
                  style={[styles.genreChip, isActive && styles.genreChipActive]}
                  onPress={() => {
                    HapticPatterns.itemPress();
                    if (selectedGenre === genre) {
                      setSelectedGenre(null);
                      setSearchQuery("");
                    } else {
                      setSelectedGenre(genre);
                      setSearchQuery(genre);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.genreChipText, isActive && styles.genreChipTextActive]}>
                    {genre}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}
