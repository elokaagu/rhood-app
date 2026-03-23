import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  SectionList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { HapticPatterns } from "../lib/haptics";
import { SkeletonMix } from "./Skeleton";
import { YOUR_LIKES_LIST_PERFORMANCE } from "../lib/performanceConstants";
import {
  normalizeMixForPlayback,
  presentYourLikesLongPressActions,
} from "../lib/yourLikesUtils";
import { fetchUserLikedMixesWithMixes } from "../lib/fetchUserLikedMixes";
import CategoryPickerModal from "./yourLikes/CategoryPickerModal";
import ManageCategoriesModal from "./yourLikes/ManageCategoriesModal";
import YourLikesRow from "./yourLikes/YourLikesRow";

export default function YourLikesScreen({
  globalAudioState,
  onPlayAudio,
  onPauseAudio,
  onResumeAudio,
  onBack,
  user,
  onAddToQueue,
  onPlayNext,
}) {
  const [mixes, setMixes] = useState([]);
  const [likedMixesWithCategories, setLikedMixesWithCategories] = useState({});
  const [playingMixId, setPlayingMixId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  /** Single surface for category UI: picker vs manage (avoids overlapping booleans). */
  const [categoryModal, setCategoryModal] = useState(null);
  const [selectedMixForCategory, setSelectedMixForCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState("");

  const fetchCategories = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from("like_categories")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) {
        if (error.code === "42P01" || error.code === "PGRST205") {
          console.warn(
            "like_categories table not found. Skipping categories fetch."
          );
          return;
        }
        console.error("❌ Error fetching categories:", error);
        return;
      }

      setCategories(data || []);
    } catch (error) {
      console.error("❌ Unexpected error fetching categories:", error);
    }
  }, [user?.id]);

  /** Refresh liked rows only (pull-to-refresh); does not toggle full-screen loading. */
  const loadLikedMixes = useCallback(async () => {
    if (!user?.id) {
      setMixes([]);
      setLikedMixesWithCategories({});
      return;
    }

    const { mixes: nextMixes, categoryMap, error } =
      await fetchUserLikedMixesWithMixes(user.id);

    if (error) {
      setMixes([]);
    } else {
      setMixes(nextMixes);
      setLikedMixesWithCategories(categoryMap);
    }
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user?.id) {
        setMixes([]);
        setLikedMixesWithCategories({});
        setLoading(false);
        return;
      }
      setLoading(true);
      const { mixes: nextMixes, categoryMap, error } =
        await fetchUserLikedMixesWithMixes(user.id);
      if (cancelled) return;
      if (error) {
        setMixes([]);
      } else {
        setMixes(nextMixes);
        setLikedMixesWithCategories(categoryMap);
      }
      setLoading(false);
      if (!cancelled) await fetchCategories();
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, fetchCategories]);

  const likedMixesByCategory = useMemo(() => {
    if (!user?.id || mixes.length === 0) return {};

    const grouped = { uncategorized: [] };
    categories.forEach((cat) => {
      grouped[cat.id] = [];
    });

    mixes.forEach((mix) => {
      const categoryId = likedMixesWithCategories[mix.id] || null;
      if (categoryId && grouped[categoryId]) {
        grouped[categoryId].push(mix);
      } else {
        grouped.uncategorized.push(mix);
      }
    });

    Object.keys(grouped).forEach((key) => {
      grouped[key].sort(
        (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
      );
    });

    return grouped;
  }, [mixes, likedMixesWithCategories, categories, user?.id]);

  useEffect(() => {
    if (globalAudioState.currentTrack) {
      setPlayingMixId(globalAudioState.currentTrack.id);
    } else {
      setPlayingMixId(null);
    }
  }, [globalAudioState.currentTrack]);

  const handleRefresh = useCallback(async () => {
    HapticPatterns.pullToRefresh();
    setRefreshing(true);
    try {
      await Promise.all([loadLikedMixes(), fetchCategories()]);
    } finally {
      setRefreshing(false);
    }
  }, [loadLikedMixes, fetchCategories]);

  const handleMixPress = useCallback(
    (mix) => {
      HapticPatterns.playPause();
      const current = globalAudioState.currentTrack;
      const sameTrack =
        current &&
        (String(current.id) === String(mix.id) ||
          String(current.id) === String(mix?.id));

      if (sameTrack) {
        if (globalAudioState.isPlaying) {
          onPauseAudio?.();
        } else {
          onResumeAudio?.();
        }
        return;
      }

      const normalized = normalizeMixForPlayback(mix);
      if (!normalized?.audioUrl) return;
      onPlayAudio?.(normalized);
    },
    [
      globalAudioState.currentTrack,
      globalAudioState.isPlaying,
      onPauseAudio,
      onResumeAudio,
      onPlayAudio,
    ]
  );

  const openCategoryPickerForMix = useCallback(
    (mix) => {
      HapticPatterns.itemPress();
      const normalized = normalizeMixForPlayback(mix);
      if (!normalized?.audioUrl) return;
      setSelectedMixForCategory(mix);
      presentYourLikesLongPressActions({
        mixTitle: mix.title,
        normalizedMix: normalized,
        onAddToQueue,
        onPlayNext,
        onRequestCategoryPicker: () => setCategoryModal("picker"),
      });
    },
    [onAddToQueue, onPlayNext]
  );

  const handleAssignToCategory = async (categoryId) => {
    if (!selectedMixForCategory || !user?.id) return;

    try {
      const { error } = await supabase
        .from("mix_likes")
        .update({ category_id: categoryId })
        .eq("user_id", user.id)
        .eq("mix_id", selectedMixForCategory.id);

      if (error) throw error;

      setLikedMixesWithCategories((prev) => ({
        ...prev,
        [selectedMixForCategory.id]: categoryId,
      }));

      setSelectedMixForCategory(null);
      setCategoryModal(null);
      HapticPatterns.success();
    } catch (error) {
      console.error("❌ Error assigning mix to category:", error);
      Alert.alert("Error", "Failed to assign mix to category");
    }
  };

  const handleRemoveFromCategory = async () => {
    if (!selectedMixForCategory || !user?.id) return;

    try {
      const { error } = await supabase
        .from("mix_likes")
        .update({ category_id: null })
        .eq("user_id", user.id)
        .eq("mix_id", selectedMixForCategory.id);

      if (error) throw error;

      setLikedMixesWithCategories((prev) => ({
        ...prev,
        [selectedMixForCategory.id]: null,
      }));

      setSelectedMixForCategory(null);
      setCategoryModal(null);
      HapticPatterns.success();
    } catch (error) {
      console.error("❌ Error removing mix from category:", error);
      Alert.alert("Error", "Failed to remove mix from category");
    }
  };

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
      setCategoryModal(null);
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

  const handleDeleteCategory = useCallback(
    (categoryId) => {
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
                const { error: updateError } = await supabase
                  .from("mix_likes")
                  .update({ category_id: null })
                  .eq("user_id", user.id)
                  .eq("category_id", categoryId);

                if (updateError) throw updateError;

                const { error: deleteError } = await supabase
                  .from("like_categories")
                  .delete()
                  .eq("id", categoryId)
                  .eq("user_id", user.id);

                if (deleteError) throw deleteError;

                setCategories((prev) =>
                  prev.filter((cat) => cat.id !== categoryId)
                );

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
    },
    [user?.id]
  );

  /** SectionList data: liked mixes grouped by like category (not “connections”). */
  const likeCategorySections = useMemo(() => {
    const keys = Object.keys(likedMixesByCategory).filter(
      (key) => (likedMixesByCategory[key] || []).length > 0
    );
    return keys.map((key) => {
      const category =
        key === "uncategorized"
          ? { id: "uncategorized", name: "Uncategorized" }
          : categories.find((c) => c.id === key);
      return {
        id: key,
        key,
        title: category?.name || key,
        categoryKey: key,
        category,
        data: likedMixesByCategory[key] || [],
      };
    });
  }, [likedMixesByCategory, categories]);

  const closeCategoryPicker = useCallback(() => {
    setCategoryModal(null);
    setSelectedMixForCategory(null);
  }, []);

  const closeManageModal = useCallback(() => {
    setCategoryModal(null);
    setNewCategoryName("");
  }, []);

  const renderListHeader = useCallback(
    () => (
      <View style={styles.categoriesHeader}>
        <Text style={styles.subtitle}>Organize your inspiration</Text>
        <TouchableOpacity
          style={styles.manageCategoriesButton}
          onPress={() => setCategoryModal("manage")}
          activeOpacity={0.7}
        >
          <Ionicons name="folder-outline" size={18} color="hsl(75, 100%, 60%)" />
          <Text style={styles.manageCategoriesText}>Manage Categories</Text>
        </TouchableOpacity>
      </View>
    ),
    []
  );

  const renderSectionHeader = useCallback(
    ({ section }) => {
      const { categoryKey, category } = section;
      return (
        <View style={styles.categoryHeader}>
          <View style={styles.categoryHeaderLeft}>
            <Ionicons
              name={categoryKey === "uncategorized" ? "folder-outline" : "folder"}
              size={18}
              color="hsl(75, 100%, 60%)"
            />
            <Text style={styles.categoryTitle}>{section.title}</Text>
            <Text style={styles.categoryCount}>({section.data.length})</Text>
          </View>
          {categoryKey !== "uncategorized" && category && (
            <TouchableOpacity
              onPress={() => handleDeleteCategory(category.id)}
              style={styles.deleteCategoryButton}
            >
              <Ionicons name="trash-outline" size={16} color="hsl(0, 100%, 50%)" />
            </TouchableOpacity>
          )}
        </View>
      );
    },
    [handleDeleteCategory]
  );

  const renderItem = useCallback(
    ({ item: mix }) => (
      <View style={styles.popularList}>
        <YourLikesRow
          mix={mix}
          isPlaying={
            playingMixId != null &&
            mix.id != null &&
            String(playingMixId) === String(mix.id) &&
            globalAudioState.isPlaying
          }
          onPress={handleMixPress}
          onLongPress={openCategoryPickerForMix}
        />
      </View>
    ),
    [
      playingMixId,
      globalAudioState.isPlaying,
      handleMixPress,
      openCategoryPickerForMix,
    ]
  );

  const keyExtractor = useCallback((item) => `liked-${item.id}`, []);

  return (
    <View style={styles.container}>
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
        <Text style={styles.headerTitle}>Your likes</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
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
          <View style={styles.skeletonContainer}>
            <SkeletonMix />
            <SkeletonMix />
            <SkeletonMix />
            <SkeletonMix />
            <SkeletonMix />
          </View>
        </ScrollView>
      ) : !user?.id ? (
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
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={64} color="hsl(0, 0%, 30%)" />
            <Text style={styles.emptyStateTitle}>Sign in to see your likes</Text>
            <Text style={styles.emptyStateSubtitle}>
              Sign in to view mixes you've liked
            </Text>
          </View>
        </ScrollView>
      ) : connectionSections.length === 0 ? (
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
          <View style={styles.emptyState}>
            <Ionicons name="heart-outline" size={64} color="hsl(0, 0%, 30%)" />
            <Text style={styles.emptyStateTitle}>No liked mixes yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Start liking mixes to see them here
            </Text>
          </View>
        </ScrollView>
      ) : (
        <SectionList
          sections={likeCategorySections}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          ListHeaderComponent={renderListHeader}
          stickySectionHeadersEnabled={false}
          initialNumToRender={YOUR_LIKES_LIST_PERFORMANCE.INITIAL_NUM_TO_RENDER}
          maxToRenderPerBatch={YOUR_LIKES_LIST_PERFORMANCE.MAX_TO_RENDER_PER_BATCH}
          windowSize={YOUR_LIKES_LIST_PERFORMANCE.WINDOW_SIZE}
          removeClippedSubviews={YOUR_LIKES_LIST_PERFORMANCE.REMOVE_CLIPPED_SUBVIEWS}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="hsl(75, 100%, 60%)"
            />
          }
          contentContainerStyle={styles.scrollContent}
          style={styles.scrollView}
        />
      )}

      <CategoryPickerModal
        visible={categoryModal === "picker"}
        onClose={closeCategoryPicker}
        styles={styles}
        categories={categories}
        onRemoveFromCategory={handleRemoveFromCategory}
        onAssignToCategory={handleAssignToCategory}
        onOpenCreateCategory={() => setCategoryModal("manage")}
      />

      <ManageCategoriesModal
        visible={categoryModal === "manage"}
        onClose={closeManageModal}
        styles={styles}
        categories={categories}
        newCategoryName={newCategoryName}
        onChangeNewCategoryName={setNewCategoryName}
        onCreateCategory={handleCreateCategory}
        onDeleteCategory={handleDeleteCategory}
      />
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
    color: "hsl(0, 0%, 100%)",
    letterSpacing: 0.5,
    flex: 1,
    textAlign: "center",
    marginHorizontal: 8,
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
