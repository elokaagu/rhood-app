import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Animated,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  sharedStyles,
} from "../lib/sharedStyles";

const { width, height } = Dimensions.get("window");

const RhoodModal = ({
  visible,
  onClose,
  title,
  message,
  primaryButtonText = "OK",
  secondaryButtonText,
  onPrimaryPress,
  onSecondaryPress,
  type = "info", // 'info', 'success', 'warning', 'error'
  showCloseButton = true,
}) => {
  const getIconAndColor = () => {
    switch (type) {
      case "success":
        return {
          icon: "checkmark-circle",
          color: COLORS.primary, // R/HOOD lime green
          bgColor: "hsl(75, 100%, 60%, 0.15)",
        };
      case "warning":
        return {
          icon: "warning",
          color: COLORS.primary, // Use R/HOOD lime instead of generic warning
          bgColor: "hsl(75, 100%, 60%, 0.15)",
        };
      case "error":
        return {
          icon: "close-circle",
          color: COLORS.primary, // Use R/HOOD lime instead of red
          bgColor: "hsl(75, 100%, 60%, 0.15)",
        };
      default:
        return {
          icon: "rhood-logo", // Custom type for R/HOOD logo
          color: COLORS.primary, // R/HOOD lime green
          bgColor: "hsl(75, 100%, 60%, 0.15)",
        };
    }
  };

  const { icon, color, bgColor } = getIconAndColor();

  const handlePrimaryPress = () => {
    if (onPrimaryPress) {
      onPrimaryPress();
    } else {
      onClose();
    }
  };

  const handleSecondaryPress = () => {
    if (onSecondaryPress) {
      onSecondaryPress();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            {showCloseButton && (
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Icon */}
          <View
            style={[
              icon === "rhood-logo" ? styles.rhoodLogoContainer : styles.iconContainer,
              {
                backgroundColor:
                  icon === "rhood-logo" ? "transparent" : bgColor,
              },
            ]}
          >
            {icon === "rhood-logo" ? (
              <Image
                source={require("../assets/rhood_logo.png")}
                style={styles.rhoodLogo}
                resizeMode="contain"
              />
            ) : (
              <Ionicons name={icon} size={48} color={color} />
            )}
          </View>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            {secondaryButtonText && (
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleSecondaryPress}
              >
                <Text style={styles.secondaryButtonText}>
                  {secondaryButtonText}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                { backgroundColor: color },
                !secondaryButtonText && styles.primaryButtonFull,
              ]}
              onPress={handlePrimaryPress}
            >
              <Text style={styles.primaryButtonText}>{primaryButtonText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...sharedStyles.modalOverlay,
  },
  modalContainer: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%, 0.2)", // R/HOOD lime border
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: SPACING.md,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: "hsl(75, 100%, 60%, 0.3)", // R/HOOD lime border
  },
  rhoodLogoContainer: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: SPACING.lg,
  },
  rhoodLogo: {
    width: 72,
    height: 72,
  },
  content: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: TYPOGRAPHY["2xl"],
    fontFamily: TYPOGRAPHY.brand, // Use R/HOOD brand font
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  message: {
    fontSize: TYPOGRAPHY.lg,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: SPACING.base,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    alignItems: "center",
  },
  primaryButtonFull: {
    flex: 1,
  },
  primaryButtonText: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.background, // Black text on lime background
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    alignItems: "center",
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%, 0.3)", // R/HOOD lime border
  },
  secondaryButtonText: {
    fontSize: TYPOGRAPHY.lg,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textPrimary,
  },
});

export default RhoodModal;
