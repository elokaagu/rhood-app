import React from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
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
  const handleClose = () => {
    onClose();
    setNewLocationCity("");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Update Location</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
            </TouchableOpacity>
          </View>
          <View style={styles.locationModalBody}>
            <Text style={styles.locationModalDescription}>
              Update your location to see opportunities and DJs near you
            </Text>
            <View style={styles.locationInputContainer}>
              <TextInput
                style={styles.locationInput}
                placeholder="Enter city name (e.g., London, New York)"
                placeholderTextColor="hsl(0, 0%, 50%)"
                value={newLocationCity}
                onChangeText={setNewLocationCity}
                autoCapitalize="words"
                maxLength={100}
              />
              <TouchableOpacity
                style={styles.useCurrentLocationButton}
                onPress={onUseCurrentLocation}
                activeOpacity={0.7}
              >
                <Ionicons name="locate" size={20} color="hsl(75, 100%, 60%)" />
                <Text style={styles.useCurrentLocationText}>Use Current</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.locationModalActions}>
              <TouchableOpacity style={styles.locationModalCancelButton} onPress={handleClose}>
                <Text style={styles.locationModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.locationModalSaveButton,
                  (!newLocationCity.trim() || updatingLocation) && styles.locationModalSaveButtonDisabled,
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
      </View>
    </Modal>
  );
}
