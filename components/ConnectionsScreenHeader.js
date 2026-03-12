import React from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ProgressiveImage from "./ProgressiveImage";
import styles from "./ConnectionsScreen.styles";

export default function ConnectionsScreenHeader({
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  searchSuggestions,
  setSearchSuggestions,
  setShowSuggestions,
  showSuggestions,
  connectionsFadeAnim,
  discoverFadeAnim,
  discoverUsersLength,
  loadDiscoverDJs,
  onNavigate,
}) {
  return (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>CONNECTIONS</Text>
      <Text style={styles.headerSubtitle}>
        Connect with DJs and manage your conversations
      </Text>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "discover" && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab("discover");
            discoverFadeAnim.setValue(0);
            if (discoverUsersLength === 0) {
              loadDiscoverDJs();
            } else {
              Animated.timing(discoverFadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }).start();
            }
          }}
        >
          <Ionicons
            name="compass"
            size={16}
            color={activeTab === "discover" ? "hsl(0, 0%, 0%)" : "hsl(0, 0%, 70%)"}
          />
          <Text style={[styles.tabText, activeTab === "discover" && styles.tabTextActive]}>
            Discover
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "connections" && styles.tabButtonActive]}
          onPress={() => {
            setActiveTab("connections");
            Animated.timing(connectionsFadeAnim, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }).start();
            discoverFadeAnim.setValue(0);
          }}
        >
          <Ionicons
            name="people"
            size={16}
            color={activeTab === "connections" ? "hsl(0, 0%, 0%)" : "hsl(0, 0%, 70%)"}
          />
          <Text style={[styles.tabText, activeTab === "connections" && styles.tabTextActive]}>
            Messages
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.searchWrapper} pointerEvents="box-none">
        <View style={styles.searchContainer} pointerEvents="auto">
          <Ionicons name="search" size={20} color="hsl(0, 0%, 50%)" />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === "discover" ? "Search DJs..." : "Search connections..."}
            placeholderTextColor="hsl(0, 0%, 50%)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setSearchSuggestions([]);
                setShowSuggestions(false);
              }}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={20} color="hsl(0, 0%, 50%)" />
            </TouchableOpacity>
          )}
        </View>
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
                  style={[styles.suggestionItem, index === 0 && styles.suggestionItemFirst]}
                  onPress={() => {
                    setSearchQuery(suggestion.name);
                    setShowSuggestions(false);
                    onNavigate?.("user-profile", { userId: suggestion.id, djName: suggestion.name });
                  }}
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
