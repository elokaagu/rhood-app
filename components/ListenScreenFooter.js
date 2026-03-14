import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import styles from "./ListenScreen.styles";

export default function ListenScreenFooter({ hasUserMixes, onUploadMix }) {
  return (
    <>
      <View style={styles.uploadSection}>
        <View style={styles.uploadCard}>
          <Text style={styles.uploadTitle}>Share Your Mix</Text>
          <Text style={styles.uploadDescription}>
            {hasUserMixes
              ? "Update your mix or upload a new one"
              : "Upload your own DJ mix and connect with the community"}
          </Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={onUploadMix}
            activeOpacity={0.8}
          >
            <Text style={styles.uploadButtonText}>
              {hasUserMixes ? "Manage Mixes" : "Upload Mix"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.bottomSpacing} />
    </>
  );
}
