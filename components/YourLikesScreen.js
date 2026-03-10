import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
  ActivityIndicator,
  Platform,
  ActionSheetIOS,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { HapticPatterns } from "../lib/haptics";
import { SkeletonMix } from "./Skeleton";

const extractDurationSeconds = (mix) => {
  if (!mix || typeof mix !== "object") return null;

  const metadataSources = [
    mix.duration,
    mix.duration_seconds,
    mix.durationSeconds,
    mix.duration_secs,
    mix.metadata?.duration,
    mix.metadata?.duration_seconds,
    mix.audio_metadata?.duration,
    mix.audio_metadata?.duration_seconds,
  ];

  for (const source of metadataSources) {
    if (source == null || source === undefined) continue;
    if (typeof source === "number" && Number.isFinite(source) && source > 0) {
      return Math.round(source);
    }
    if (typeof source === "string" && source.trim()) {
      const trimmed = source.trim();
      if (trimmed === "0" || trimmed === "0:00") continue;
      const colonParts = trimmed.split(":").map((part) => part.trim());
      if (colonParts.length >= 2 && colonParts.length <= 3) {
        const numbers = colonParts.map((part) => Number(part));
        if (numbers.every((num) => Number.isFinite(num) && num >= 0)) {
          if (numbers.length === 3) {
            const [hours, minutes, seconds] = numbers;
            const totalSeconds = hours * 3600 + minutes * 60 + seconds;
            return totalSeconds > 0 ? totalSeconds : null;
          }
          const [minutes, seconds] = numbers;
          const totalSeconds = minutes * 60 + seconds;
          return totalSeconds > 0 ? totalSeconds : null;
        }
      }
    }
  }

  return null;
};

const formatDurationLabel = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }
  const totalSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export default function YourLikesScreen({
  globalAudioState,
  onPlayAudio,
  onPauseAudio,
  onBack,
  user,
  onAddToQueue,
  onPlayNext,
}) {
  const [mixes, setMixes] = useState([]);
  const [likedMixIds, setLikedMixIds] = useState(() => new Set());
  const [playingMixId, setPlayingMixId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch all mixes
  const fetchMixes = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("mixes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ Error fetching mixes:", error);
        setMixes([]);
        return;
      }

      // Transform mixes with user profiles
      const transformedMixes = await Promise.all(
        data.map(async (mix) => {
          let latestArtistName = null;

          let userProfile = null;
          if (mix.user_id) {
            const { data: profile } = await supabase
              .from("user_profiles")
              .select("dj_name, first_name, last_name, profile_image_url, bio")
              .eq("id", mix.user_id)
              .single();

            if (profile) {
              userProfile = profile;
              latestArtistName =
                profile.dj_name ||
                `${profile.first_name || ""} ${profile.last_name || ""}`.trim() ||
                "Unknown Artist";
            }
          }

          const fallbackArtist =
            mix.artist &&
            typeof mix.artist === "string" &&
            mix.artist.trim().length > 0
              ? mix.artist.trim()
              : "Unknown Artist";
          const resolvedArtist = latestArtistName || fallbackArtist;

          const durationSeconds = extractDurationSeconds(mix);
          const durationLabel = formatDurationLabel(durationSeconds);

          return {
            id: mix.id,
            user_id: mix.user_id,
            title: mix.title,
            artist: resolvedArtist,
            genre: mix.genre || "Electronic",
            durationSeconds,
            durationFormatted: durationLabel,
            artwork_url: mix.artwork_url || mix.image_url || mix.image || null,
            image: mix.artwork_url || mix.image_url || mix.image || null,
            audioUrl: mix.file_url,
            plays: mix.plays || mix.play_count || 0,
            created_at: mix.created_at || null,
            user: userProfile, // Include full user profile for DJ image
            user_image: userProfile?.profile_image_url,
            user_dj_name: userProfile?.dj_name,
            user_bio: userProfile?.bio,
          };
        })
      );

      setMixes(transformedMixes);
    } catch (error) {
      console.error("❌ Error in fetchMixes:", error);
      setMixes([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user's liked mixes with categories
  const fetchUserLikedMixes = async () => {
    if (!user?.id) {
      setLikedMixIds(new Set());
      setLikedMixesWithCategories({});
      return;
    }

    try {
      const { data, error } = await supabase
        .from("mix_likes")
        .select("mix_id, category_id")
        .eq("user_id", user.id);

      if (error) {
        if (error.code === "42P01" || error.code === "PGRST205") {
          console.warn("mix_likes table not found. Skipping liked mixes fetch.");
          return;
        }
        console.error("❌ Error fetching liked mixes:", error);
        return;
      }

      const likedSet = new Set(
        (data || [])
          .map((row) => row?.mix_id)
          .filter((mixId) => mixId !== null && mixId !== undefined)
      );

      const categoryMap = {};
      (data || []).forEach((row) => {
        if (row.mix_id) {
          categoryMap[row.mix_id] = row.category_id || null;
        }
      });

      setLikedMixIds(likedSet);
      setLikedMixesWithCategories(categoryMap);
    } catch (error) {
      console.error("❌ Unexpected error fetching liked mixes:", error);
    }
  };

  // Fetch user's categories
  const fetchCategories = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("like_categories")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) {
        if (error.code === "42P01" || error.code === "PGRST205") {
          console.warn("like_categories table not found. Skipping categories fetch.");
          return;
        }
        console.error("❌ Error fetching categories:", error);
        return;
      }

      setCategories(data || []);
    } catch (error) {
      console.error("❌ Unexpected error fetching categories:", error);
    }
  };

  // Get user's liked mixes grouped by category
  const likedMixesByCategory = useMemo(() => {
    if (!user?.id || likedMixIds.size === 0) return {};

    const likedMixes = mixes.filter((mix) => likedMixIds.has(mix.id));
    const grouped = {};

    // Initialize with "Uncategorized"
    grouped.uncategorized = [];

    // Initialize with user categories
    categories.forEach((cat) => {
      grouped[cat.id] = [];
    });

    // Group mixes by category
    likedMixes.forEach((mix) => {
      const categoryId = likedMixesWithCategories[mix.id] || null;
      if (categoryId && grouped[categoryId]) {
        grouped[categoryId].push(mix);
      } else {
        grouped.uncategorized.push(mix);
      }
    });

    // Sort mixes within each category
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
    });

    return grouped;
  }, [mixes, likedMixIds, likedMixesWithCategories, categories, user?.id]);

  useEffect(() => {
    fetchMixes();
  }, []);

  useEffect(() => {
    fetchUserLikedMixes();
    fetchCategories();
  }, [user?.id]);

  // Sync playing state
  useEffect(() => {
    if (globalAudioState.currentTrack) {
      setPlayingMixId(globalAudioState.currentTrack.id);
    } else {
      setPlayingMixId(null);
    }
  }, [globalAudioState.currentTrack]);

  const handleRefresh = async () => {
    HapticPatterns.pullToRefresh();
    setRefreshing(true);
    await Promise.all([fetchMixes(), fetchUserLikedMixes(), fetchCategories()]);
    setRefreshing(false);
  };

  const handleMixPress = (mix) => {
    HapticPatterns.playPause();
    if (playingMixId === mix.id) {
      onPauseAudio();
    } else {
      const normalizedMix = {
        ...mix,
        audioUrl: mix.audioUrl || mix.file_url || mix.audio_url || null,
        image: mix.artwork_url || mix.image_url || mix.image || null,
        user_id: mix.user_id || mix.user?.id,
        user_image: mix.user_image || mix.user?.profile_image_url,
        user_dj_name: mix.user_dj_name || mix.user?.dj_name,
        user_bio: mix.user_bio || mix.user?.bio,
        user: mix.user,
      };

      if (!normalizedMix.audioUrl) {
        return;
      }

      onPlayAudio(normalizedMix);
    }
  };

  const handleMixLongPress = (mix) => {
    HapticPatterns.itemPress();
    const normalizedMix = {
      ...mix,
      audioUrl: mix.audioUrl || mix.file_url || mix.audio_url || null,
      image: mix.artwork_url || mix.image_url || mix.image || null,
      user_id: mix.user_id || mix.user?.id,
      user_image: mix.user_image || mix.user?.profile_image_url,
      user_dj_name: mix.user_dj_name || mix.user?.dj_name,
      user_bio: mix.user_bio || mix.user?.bio,
      user: mix.user,
    };

    if (!normalizedMix.audioUrl) {
      return;
    }

    setSelectedMixForCategory(mix);

    if (Platform.OS === "ios") {
      const options = ["Cancel", "Add to Queue", "Play Next", "Move to Category"];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: options,
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            // Add to Queue
            if (onAddToQueue) {
              onAddToQueue(normalizedMix);
              HapticPatterns.success();
            }
          } else if (buttonIndex === 2) {
            // Play Next
            if (onPlayNext) {
              onPlayNext(normalizedMix);
              HapticPatterns.success();
            }
          } else if (buttonIndex === 3) {
            // Move to Category
            setShowCategoryPicker(true);
          }
        }
      );
    } else {
      // Android
      Alert.alert(
        mix.title || "Mix",
        "Choose an option",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Add to Queue",
            onPress: () => {
              if (onAddToQueue) {
                onAddToQueue(normalizedMix);
                HapticPatterns.success();
              }
            },
          },
          {
            text: "Play Next",
            onPress: () => {
              if (onPlayNext) {
                onPlayNext(normalizedMix);
                HapticPatterns.success();
              }
            },
          },
          {
            text: "Move to Category",
            onPress: () => {
              setShowCategoryPicker(true);
            },
          },
        ],
        { cancelable: true }
      );
    }
  };

  // Assign mix to category
  const handleAssignToCategory = async (categoryId) => {
    if (!selectedMixForCategory || !user?.id) return;

    try {
      const { error } = await supabase
        .from("mix_likes")
        .update({ category_id: categoryId })
        .eq("user_id", user.id)
        .eq("mix_id", selectedMixForCategory.id);

      if (error) throw error;

      // Update local state
      setLikedMixesWithCategories((prev) => ({
        ...prev,
        [selectedMixForCategory.id]: categoryId,
      }));

      setSelectedMixForCategory(null);
      setShowCategoryPicker(false);
      HapticPatterns.success();
    } catch (error) {
      console.error("❌ Error assigning mix to category:", error);
      Alert.alert("Error", "Failed to assign mix to category");
    }
  };

  // Remove mix from category (move to uncategorized)
  const handleRemoveFromCategory = async () => {
    if (!selectedMixForCategory || !user?.id) return;

    try {
      const { error } = await supabase
        .from("mix_likes")
        .update({ category_id: null })
        .eq("user_id", user.id)
        .eq("mix_id", selectedMixForCategory.id);

      if (error) throw error;

      // Update local state
      setLikedMixesWithCategories((prev) => ({
        ...prev,
        [selectedMixForCategory.id]: null,
      }));

      setSelectedMixForCategory(null);
      setShowCategoryPicker(false);
      HapticPatterns.success();
    } catch (error) {
      console.error("❌ Error removing mix from category:", error);
      Alert.alert("Error", "Failed to remove mix from category");
    }
  };

  // Create new category
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim() || !user?.id) return;

    try {
      const { data, error } = await supabase
        .from("like_categories")
        .insert({
          user_id: user.id,
          name: newCategoryName.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      setCategories((prev) => [...prev, data]);
      setNewCategoryName("");
      setShowCategoryModal(false);
      HapticPatterns.success();
    } catch (error) {
      console.error("❌ Error creating category:", error);
      if (error.code === "23505") {
        Alert.alert("Error", "A category with this name already exists");
      } else {
        Alert.alert("Error", "Failed to create category");
      }
    }
  };

  // Delete category
  const handleDeleteCategory = async (categoryId) => {
    if (!user?.id) return;

    Alert.alert(
      "Delete Category",
      "Are you sure? Mixes in this category will be moved to Uncategorized.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // First, remove category from all mixes
              const { error: updateError } = await supabase
                .from("mix_likes")
                .update({ category_id: null })
                .eq("user_id", user.id)
                .eq("category_id", categoryId);

              if (updateError) throw updateError;

              // Then delete the category
              const { error: deleteError } = await supabase
                .from("like_categories")
                .delete()
                .eq("id", categoryId)
                .eq("user_id", user.id);

              if (deleteError) throw deleteError;

              // Update local state
              setCategories((prev) => prev.filter((cat) => cat.id !== categoryId));
              
              // Update likedMixesWithCategories to remove category references
              setLikedMixesWithCategories((prev) => {
                const updated = { ...prev };
                Object.keys(updated).forEach((mixId) => {
                  if (updated[mixId] === categoryId) {
                    updated[mixId] = null;
                  }
                });
                return updated;
              });

              HapticPatterns.success();
            } catch (error) {
              console.error("❌ Error deleting category:", error);
              Alert.alert("Error", "Failed to delete category");
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            HapticPatterns.backButton();
            onBack();
          }}
        >
          <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
        </TouchableOpacity>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons
            name="heart"
            size={20}
            color="hsl(75, 100%, 60%)"
          />
          <Text style={styles.headerTitle}>YOUR LIKES</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="hsl(75, 100%, 60%)"
          />
        }
      >
        {loading ? (
          <View style={styles.skeletonContainer}>
            <SkeletonMix />
            <SkeletonMix />
            <SkeletonMix />
            <SkeletonMix />
            <SkeletonMix />
          </View>
        ) : !user?.id ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="heart-outline"
              size={64}
              color="hsl(0, 0%, 30%)"
            />
            <Text style={styles.emptyStateTitle}>Sign in to see your likes</Text>
            <Text style={styles.emptyStateSubtitle}>
              Sign in to view mixes you've liked
            </Text>
          </View>
        ) : Object.keys(likedMixesByCategory).length === 0 || 
            Object.values(likedMixesByCategory).every(arr => arr.length === 0) ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="heart-outline"
              size={64}
              color="hsl(0, 0%, 30%)"
            />
            <Text style={styles.emptyStateTitle}>No liked mixes yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Start liking mixes to see them here
            </Text>
          </View>
        ) : (
          <>
            {/* Header with Manage Categories button */}
            <View style={styles.categoriesHeader}>
              <Text style={styles.subtitle}>
                Organize your inspiration
              </Text>
              <TouchableOpacity
                style={styles.manageCategoriesButton}
                onPress={() => setShowCategoryModal(true)}
                activeOpacity={0.7}
              >
                <Ionicons name="folder-outline" size={18} color="hsl(75, 100%, 60%)" />
                <Text style={styles.manageCategoriesText}>Manage Categories</Text>
              </TouchableOpacity>
            </View>

            {/* Render mixes grouped by category */}
            {Object.keys(likedMixesByCategory).map((categoryKey) => {
              const categoryMixes = likedMixesByCategory[categoryKey];
              if (categoryMixes.length === 0) return null;

              const category = categoryKey === "uncategorized" 
                ? { id: "uncategorized", name: "Uncategorized" }
                : categories.find((cat) => cat.id === categoryKey);

              if (!category) return null;

              return (
                <View key={categoryKey} style={styles.categorySection}>
                  <View style={styles.categoryHeader}>
                    <View style={styles.categoryHeaderLeft}>
                      <Ionicons
                        name={categoryKey === "uncategorized" ? "folder-outline" : "folder"}
                        size={18}
                        color="hsl(75, 100%, 60%)"
                      />
                      <Text style={styles.categoryTitle}>{category.name}</Text>
                      <Text style={styles.categoryCount}>({categoryMixes.length})</Text>
                    </View>
                    {categoryKey !== "uncategorized" && (
                      <TouchableOpacity
                        onPress={() => handleDeleteCategory(category.id)}
                        style={styles.deleteCategoryButton}
                      >
                        <Ionicons name="trash-outline" size={16} color="hsl(0, 100%, 50%)" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={styles.popularList}>
                    {categoryMixes.map((mix) => {
                      const isPlaying = playingMixId === mix.id;
                      return (
                        <TouchableOpacity
                          key={`liked-${mix.id}`}
                          style={styles.popularRow}
                          onPress={() => handleMixPress(mix)}
                          onLongPress={() => handleMixLongPress(mix)}
                          delayLongPress={500}
                          activeOpacity={0.8}
                        >
                          <View style={styles.popularImageWrap}>
                            <Image
                              source={
                                mix.artwork_url || mix.image_url || mix.image
                                  ? { uri: mix.artwork_url || mix.image_url || mix.image }
                                  : require("../assets/rhood_logo.webp")
                              }
                              style={styles.popularImage}
                              resizeMode="cover"
                            />
                            {isPlaying && (
                              <View style={styles.playingOverlay}>
                                <Ionicons
                                  name="play"
                                  size={20}
                                  color="hsl(75, 100%, 60%)"
                                />
                              </View>
                            )}
                          </View>
                          <View style={styles.popularInfo}>
                            <Text style={styles.popularTitle} numberOfLines={1}>
                              {mix.title}
                            </Text>
                            <Text style={styles.popularSubtitle} numberOfLines={1}>
                              {mix.artist || "Unknown"}
                            </Text>
                            <View style={styles.popularMetaRow}>
                              {mix.durationFormatted && (
                                <Text style={styles.popularMeta}>
                                  {mix.durationFormatted}
                                </Text>
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
                          <Ionicons
                            name="chevron-forward"
                            size={18}
                            color="hsl(0, 0%, 60%)"
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Category Picker Modal */}
      <Modal
        visible={showCategoryPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowCategoryPicker(false);
          setSelectedMixForCategory(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Move to Category</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCategoryPicker(false);
                  setSelectedMixForCategory(null);
                }}
              >
                <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.categoryPickerList}>
              <TouchableOpacity
                style={styles.categoryPickerItem}
                onPress={() => handleRemoveFromCategory()}
              >
                <Ionicons name="folder-outline" size={20} color="hsl(0, 0%, 60%)" />
                <Text style={styles.categoryPickerText}>Uncategorized</Text>
              </TouchableOpacity>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={styles.categoryPickerItem}
                  onPress={() => handleAssignToCategory(category.id)}
                >
                  <Ionicons name="folder" size={20} color="hsl(75, 100%, 60%)" />
                  <Text style={styles.categoryPickerText}>{category.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.createCategoryButton}
              onPress={() => {
                setShowCategoryPicker(false);
                setShowCategoryModal(true);
              }}
            >
              <Ionicons name="add-circle-outline" size={20} color="hsl(75, 100%, 60%)" />
              <Text style={styles.createCategoryButtonText}>Create New Category</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Manage Categories Modal */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowCategoryModal(false);
          setNewCategoryName("");
          setEditingCategory(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Manage Categories</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowCategoryModal(false);
                  setNewCategoryName("");
                  setEditingCategory(null);
                }}
              >
                <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
              </TouchableOpacity>
            </View>

            {/* Create New Category */}
            <View style={styles.createCategorySection}>
              <Text style={styles.createCategoryLabel}>Create New Category</Text>
              <View style={styles.createCategoryInputRow}>
                <TextInput
                  style={styles.createCategoryInput}
                  placeholder="e.g., Afrobeats, House, Techno"
                  placeholderTextColor="hsl(0, 0%, 50%)"
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  maxLength={50}
                  autoCapitalize="words"
                />
                <TouchableOpacity
                  style={[
                    styles.createCategorySubmitButton,
                    !newCategoryName.trim() && styles.createCategorySubmitButtonDisabled,
                  ]}
                  onPress={handleCreateCategory}
                  disabled={!newCategoryName.trim()}
                >
                  <Text style={styles.createCategorySubmitText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Existing Categories */}
            <ScrollView style={styles.categoriesList}>
              <Text style={styles.categoriesListTitle}>Your Categories</Text>
              {categories.length === 0 ? (
                <Text style={styles.noCategoriesText}>No categories yet. Create one above!</Text>
              ) : (
                categories.map((category) => (
                  <View key={category.id} style={styles.categoryListItem}>
                    <View style={styles.categoryListItemLeft}>
                      <Ionicons name="folder" size={20} color="hsl(75, 100%, 60%)" />
                      <Text style={styles.categoryListItemText}>{category.name}</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleDeleteCategory(category.id)}
                      style={styles.categoryDeleteButton}
                    >
                      <Ionicons name="trash-outline" size={18} color="hsl(0, 100%, 50%)" />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "TS Block Bold",
    fontWeight: "900",
    color: "hsl(0, 0%, 100%)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 160,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    marginBottom: 16,
    paddingHorizontal: 20,
    marginTop: 16,
    lineHeight: 18,
  },
  popularList: {
    paddingHorizontal: 20,
  },
  popularRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  popularImageWrap: {
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "hsl(0, 0%, 12%)",
    position: "relative",
  },
  popularImage: {
    width: "100%",
    height: "100%",
  },
  playingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  popularInfo: {
    flex: 1,
    gap: 4,
  },
  popularTitle: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
  },
  popularSubtitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 80%)",
  },
  popularMeta: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
  },
  popularMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  skeletonContainer: {
    padding: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    textAlign: "center",
    lineHeight: 20,
  },
  categoriesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
  },
  manageCategoriesButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "hsl(0, 0%, 12%)",
  },
  manageCategoriesText: {
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
  },
  categorySection: {
    marginBottom: 32,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  categoryHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  categoryTitle: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
  },
  categoryCount: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
  },
  deleteCategoryButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
  },
  categoryPickerList: {
    maxHeight: 400,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  categoryPickerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  categoryPickerText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
  },
  createCategoryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 12,
    backgroundColor: "hsl(0, 0%, 12%)",
  },
  createCategoryButtonText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(75, 100%, 60%)",
  },
  createCategorySection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  createCategoryLabel: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    marginBottom: 12,
  },
  createCategoryInputRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  createCategoryInput: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 12%)",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
  },
  createCategorySubmitButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "hsl(75, 100%, 60%)",
  },
  createCategorySubmitButtonDisabled: {
    backgroundColor: "hsl(0, 0%, 20%)",
    opacity: 0.5,
  },
  createCategorySubmitText: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 0%)",
  },
  categoriesList: {
    maxHeight: 400,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  categoriesListTitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    marginBottom: 12,
  },
  categoryListItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  categoryListItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  categoryListItemText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
  },
  categoryDeleteButton: {
    padding: 4,
  },
  noCategoriesText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    textAlign: "center",
    paddingVertical: 20,
  },
});

