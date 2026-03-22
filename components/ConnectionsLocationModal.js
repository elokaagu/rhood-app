import React from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "./ConnectionsScreen.styles";

export default function ConnectionsLocationModal({
  visible,
  onClose,
  newLocationCity,
  setNewLocationCity,
  updatingLocation,
  onUpdateLocation,
  onUseCurrentLocation,
}) {
  /**
   * Draft stays in parent state if user dismisses — reopening re-seeds from
   * profile in handleOpenLocationModal. Successful save clears in parent.
   */
  const handleClose = () => {
    if (updatingLocation) return;
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={styles.locationModalBackdrop}
          onPress={handleClose}
          accessibilityLabel="Dismiss"
          accessibilityRole="button"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.locationModalKeyboardAvoid}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Location</Text>
              <TouchableOpacity
                onPress={handleClose}
                disabled={updatingLocation}
                accessibilityState={{ disabled: updatingLocation }}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={
                    updatingLocation
                      ? "hsl(0, 0%, 40%)"
                      : "hsl(0, 0%, 100%)"
                  }
                />
              </TouchableOpacity>
            </View>
            <View style={styles.locationModalBody}>
              <Text style={styles.locationModalDescription}>
                Update your location to see opportunities and DJs near you
              </Text>
              <View style={styles.locationInputContainer}>
                <TextInput
                  style={[
                    styles.locationInput,
                    updatingLocation && localStyles.inputDisabled,
                  ]}
                  placeholder="Enter city name (e.g., London, New York)"
                  placeholderTextColor="hsl(0, 0%, 50%)"
                  value={newLocationCity}
                  onChangeText={setNewLocationCity}
                  autoCapitalize="words"
                  maxLength={100}
                  editable={!updatingLocation}
                />
                <TouchableOpacity
                  style={[
                    styles.useCurrentLocationButton,
                    updatingLocation && localStyles.actionDisabled,
                  ]}
                  onPress={onUseCurrentLocation}
                  activeOpacity={0.7}
                  disabled={updatingLocation}
                  accessibilityState={{ disabled: updatingLocation }}
                >
                  <Ionicons
                    name="locate"
                    size={20}
                    color={
                      updatingLocation
                        ? "hsl(0, 0%, 40%)"
                        : "hsl(75, 100%, 60%)"
                    }
                  />
                  <Text
                    style={[
                      styles.useCurrentLocationText,
                      updatingLocation && localStyles.mutedText,
                    ]}
                  >
                    Use Current
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.locationModalActions}>
                <TouchableOpacity
                  style={[
                    styles.locationModalCancelButton,
                    updatingLocation && localStyles.actionDisabled,
                  ]}
                  onPress={handleClose}
                  disabled={updatingLocation}
                >
                  <Text style={styles.locationModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.locationModalSaveButton,
                    (!newLocationCity.trim() || updatingLocation) &&
                      styles.locationModalSaveButtonDisabled,
                  ]}
                  onPress={onUpdateLocation}
                  disabled={!newLocationCity.trim() || updatingLocation}
                >
                  {updatingLocation ? (
                    <ActivityIndicator size="small" color="hsl(0, 0%, 0%)" />
                  ) : (
                    <Text style={styles.locationModalSaveText}>Update</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  inputDisabled: {
    opacity: 0.6,
  },
  actionDisabled: {
    opacity: 0.55,
  },
  mutedText: {
    color: "hsl(0, 0%, 40%)",
  },
});
