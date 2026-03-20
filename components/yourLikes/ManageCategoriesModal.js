import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ManageCategoriesModal({
  visible,
  onClose,
  styles,
  categories,
  newCategoryName,
  onChangeNewCategoryName,
  onCreateCategory,
  onDeleteCategory,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Manage Categories</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
            </TouchableOpacity>
          </View>

          <View style={styles.createCategorySection}>
            <Text style={styles.createCategoryLabel}>Create New Category</Text>
            <View style={styles.createCategoryInputRow}>
              <TextInput
                style={styles.createCategoryInput}
                placeholder="e.g., Afrobeats, House, Techno"
                placeholderTextColor="hsl(0, 0%, 50%)"
                value={newCategoryName}
                onChangeText={onChangeNewCategoryName}
                maxLength={50}
                autoCapitalize="words"
              />
              <TouchableOpacity
                style={[
                  styles.createCategorySubmitButton,
                  !newCategoryName.trim() &&
                    styles.createCategorySubmitButtonDisabled,
                ]}
                onPress={onCreateCategory}
                disabled={!newCategoryName.trim()}
              >
                <Text style={styles.createCategorySubmitText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.categoriesList}>
            <Text style={styles.categoriesListTitle}>Your Categories</Text>
            {categories.length === 0 ? (
              <Text style={styles.noCategoriesText}>
                No categories yet. Create one above!
              </Text>
            ) : (
              categories.map((category) => (
                <View key={category.id} style={styles.categoryListItem}>
                  <View style={styles.categoryListItemLeft}>
                    <Ionicons
                      name="folder"
                      size={20}
                      color="hsl(75, 100%, 60%)"
                    />
                    <Text style={styles.categoryListItemText}>
                      {category.name}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => onDeleteCategory(category.id)}
                    style={styles.categoryDeleteButton}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={18}
                      color="hsl(0, 100%, 50%)"
                    />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
