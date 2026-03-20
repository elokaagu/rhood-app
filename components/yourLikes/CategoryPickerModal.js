import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function CategoryPickerModal({
  visible,
  onClose,
  styles,
  categories,
  onRemoveFromCategory,
  onAssignToCategory,
  onOpenCreateCategory,
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
            <Text style={styles.modalTitle}>Move to Category</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.categoryPickerList}>
            <TouchableOpacity
              style={styles.categoryPickerItem}
              onPress={onRemoveFromCategory}
            >
              <Ionicons
                name="folder-outline"
                size={20}
                color="hsl(0, 0%, 60%)"
              />
              <Text style={styles.categoryPickerText}>Uncategorized</Text>
            </TouchableOpacity>
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryPickerItem}
                onPress={() => onAssignToCategory(category.id)}
              >
                <Ionicons name="folder" size={20} color="hsl(75, 100%, 60%)" />
                <Text style={styles.categoryPickerText}>{category.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={styles.createCategoryButton}
            onPress={onOpenCreateCategory}
          >
            <Ionicons
              name="add-circle-outline"
              size={20}
              color="hsl(75, 100%, 60%)"
            />
            <Text style={styles.createCategoryButtonText}>
              Create New Category
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
