import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import styles from "./ListenScreen.styles";

export default function ListenUploadModal({ visible, onClose, onNavigate }) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Ionicons
            name="cloud-upload-outline"
            size={64}
            color="hsl(75, 100%, 60%)"
            style={styles.modalIcon}
          />
          <Text style={styles.modalTitle}>Upload Your Mix</Text>
          <Text style={styles.modalDescription}>
            Share your full DJ set with the R/HOOD community!
          </Text>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalUploadButton}
              onPress={() => {
                onClose();
                if (onNavigate) onNavigate("upload-mix");
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={["hsl(75, 100%, 60%)", "hsl(75, 100%, 50%)"]}
                style={styles.modalUploadGradient}
              >
                <Text style={styles.modalUploadText}>Upload</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
