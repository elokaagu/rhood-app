import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProgressiveImage from "./ProgressiveImage";
import RhoodScreenTitleBlock from "./RhoodScreenTitleBlock";
import styles from "./ConnectionsScreen.styles";
import { CONNECTIONS_SCREEN_TABS } from "../lib/connectionsScreenTabIds";

export default function ConnectionsScreenHeader({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  searchSuggestions,
  showSuggestions,
  isSearching = false,
  searchError = null,
  onClearSearch,
  onSelectSearchSuggestion,
}) {
  return (
    <View style={styles.header}>
      <RhoodScreenTitleBlock
        title="Friends"
        subtitle="Discover DJs and chat with people you know"
        subtitleBottomSpacing={16}
      />
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === CONNECTIONS_SCREEN_TABS.DISCOVER && styles.tabButtonActive,
          ]}
          onPress={() => onTabChange?.(CONNECTIONS_SCREEN_TABS.DISCOVER)}
        >
          <Ionicons
            name="compass"
            size={16}
            color={
              activeTab === CONNECTIONS_SCREEN_TABS.DISCOVER
                ? "hsl(0, 0%, 0%)"
                : "hsl(0, 0%, 70%)"
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === CONNECTIONS_SCREEN_TABS.DISCOVER && styles.tabTextActive,
            ]}
          >
            Discover
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === CONNECTIONS_SCREEN_TABS.CONNECTIONS && styles.tabButtonActive,
          ]}
          onPress={() => onTabChange?.(CONNECTIONS_SCREEN_TABS.CONNECTIONS)}
        >
          <Ionicons
            name="chatbubbles"
            size={16}
            color={
              activeTab === CONNECTIONS_SCREEN_TABS.CONNECTIONS
                ? "hsl(0, 0%, 0%)"
                : "hsl(0, 0%, 70%)"
            }
          />
          <Text
            style={[
              styles.tabText,
              activeTab === CONNECTIONS_SCREEN_TABS.CONNECTIONS && styles.tabTextActive,
            ]}
          >
            Chats
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.searchWrapper} pointerEvents="box-none">
        <View style={styles.searchContainer} pointerEvents="auto">
          <Ionicons name="search" size={20} color="hsl(0, 0%, 50%)" />
          <TextInput
            style={styles.searchInput}
            placeholder={
              activeTab === CONNECTIONS_SCREEN_TABS.DISCOVER
                ? "Search DJs..."
                : "Search people..."
            }
            placeholderTextColor="hsl(0, 0%, 50%)"
            value={searchQuery}
            onChangeText={onSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {isSearching ? (
            <ActivityIndicator
              size="small"
              color="hsl(0, 0%, 60%)"
              style={styles.searchLoadingIndicator}
            />
          ) : null}
          {searchQuery.length > 0 ? (
            <TouchableOpacity onPress={onClearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="hsl(0, 0%, 50%)" />
            </TouchableOpacity>
          ) : null}
        </View>
        {searchError && searchQuery.trim().length >= 2 ? (
          <Text style={styles.searchErrorHint} numberOfLines={1}>
            Couldn&apos;t refresh suggestions
          </Text>
        ) : null}
        {showSuggestions && searchSuggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <ScrollView
              style={styles.suggestionsScroll}
              contentContainerStyle={styles.suggestionsScrollContent}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {searchSuggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={suggestion.id}
                  style={[
                    styles.suggestionItem,
                    index === searchSuggestions.length - 1 &&
                      styles.suggestionItemLast,
                  ]}
                  onPress={() => onSelectSearchSuggestion?.(suggestion)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
                >
                  {suggestion.profileImage ? (
                    <ProgressiveImage
                      source={{ uri: suggestion.profileImage }}
                      style={styles.suggestionImage}
                    />
                  ) : (
                    <View style={[styles.suggestionImage, styles.suggestionImagePlaceholder]}>
                      <Ionicons name="person" size={16} color="hsl(0, 0%, 50%)" />
                    </View>
                  )}
                  <View style={styles.suggestionInfo}>
                    <Text style={styles.suggestionName} numberOfLines={1}>
                      {String(suggestion.name || "")}
                    </Text>
                    <Text style={styles.suggestionCity} numberOfLines={1}>
                      {suggestion.city && String(suggestion.city).trim()
                        ? String(suggestion.city)
                        : "DJ"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="hsl(0, 0%, 40%)" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}
