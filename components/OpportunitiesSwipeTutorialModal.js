import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";

/**
 * First-run swipe tutorial for the opportunities deck.
 * Styles are passed from App (same keys as before extraction).
 */
export default function OpportunitiesSwipeTutorialModal({
  visible,
  onDismiss,
  styles,
}) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.tutorialOverlay}>
        <View style={styles.tutorialContent}>
          <View style={styles.tutorialHeader}>
            <Text style={styles.tutorialTitle}>How to Use</Text>
            <TouchableOpacity
              onPress={onDismiss}
              style={styles.tutorialCloseButton}
              accessibilityRole="button"
              accessibilityLabel="Close tutorial"
            >
              <Ionicons name="close" size={24} color="hsl(0, 0%, 100%)" />
            </TouchableOpacity>
          </View>
          <View style={styles.tutorialInstructions}>
            <View style={styles.tutorialInstructionRow}>
              <View style={styles.tutorialIconContainer}>
                <Ionicons
                  name="arrow-forward"
                  size={32}
                  color="hsl(75, 100%, 60%)"
                />
              </View>
              <View style={styles.tutorialTextContainer}>
                <Text style={styles.tutorialInstructionTitle}>
                  Swipe Right
                </Text>
                <Text style={styles.tutorialInstructionText}>
                  To apply for an opportunity
                </Text>
              </View>
            </View>
            <View style={styles.tutorialInstructionRow}>
              <View style={styles.tutorialIconContainer}>
                <Ionicons
                  name="arrow-back"
                  size={32}
                  color="hsl(0, 100%, 60%)"
                />
              </View>
              <View style={styles.tutorialTextContainer}>
                <Text style={styles.tutorialInstructionTitle}>Swipe Left</Text>
                <Text style={styles.tutorialInstructionText}>
                  To dismiss and see the next opportunity
                </Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.tutorialGotItButton}
            onPress={onDismiss}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Dismiss tutorial"
          >
            <Text style={styles.tutorialGotItButtonText}>Got It</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
