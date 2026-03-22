import React, { memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * Single options menu for mix rows. Render once at list/screen level; rows call onOpenOptions(mix).
 */
function DJMixOptionsModal({
  visible,
  mix,
  isOwnMix,
  onClose,
  onAddToQueue,
  onDelete,
  /** Called after delete confirmation dialog is cancelled (e.g. reset row swipe) */
  onDeleteAlertCancel,
}) {
  const handleDelete = () => {
    if (!mix) return;
    Alert.alert(
      "Delete Mix",
      `Are you sure you want to delete "${mix.title}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            onClose?.();
            onDeleteAlertCancel?.();
          },
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            onClose?.();
            onDelete?.(mix);
          },
        },
      ]
    );
  };

  return (
    <Modal
      visible={Boolean(visible && mix != null)}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        {/* Stop backdrop press when tapping menu chrome (same pattern as legacy in-row modal) */}
        <TouchableOpacity activeOpacity={1} onPress={() => {}}>
          <View style={styles.optionsModal}>
          <TouchableOpacity
            style={styles.optionItem}
            onPress={() => {
              onClose?.();
              onAddToQueue?.(mix);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="list" size={20} color="hsl(75, 100%, 60%)" />
            <Text style={styles.optionTextGreen}>Add to Queue</Text>
          </TouchableOpacity>

          {isOwnMix ? (
            <TouchableOpacity
              style={styles.optionItem}
              onPress={handleDelete}
              activeOpacity={0.7}
            >
              <Ionicons name="trash" size={20} color="hsl(0, 100%, 60%)" />
              <Text style={styles.optionTextDelete}>Delete Mix</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.optionItem}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color="hsl(0, 0%, 70%)" />
            <Text style={styles.optionText}>Cancel</Text>
          </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  optionsModal: {
    backgroundColor: "hsl(0, 0%, 10%)",
    borderRadius: 12,
    padding: 8,
    width: "80%",
    maxWidth: 300,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
  },
  optionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 8,
  },
  optionText: {
    color: "hsl(0, 0%, 70%)",
    fontSize: 16,
    marginLeft: 12,
    fontWeight: "500",
  },
  optionTextGreen: {
    color: "hsl(75, 100%, 60%)",
    fontSize: 16,
    marginLeft: 12,
    fontWeight: "600",
  },
  optionTextDelete: {
    color: "hsl(0, 100%, 60%)",
    fontSize: 16,
    marginLeft: 12,
    fontWeight: "600",
  },
});

export default memo(DJMixOptionsModal);
