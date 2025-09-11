import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const RhoodModal = ({
  visible,
  onClose,
  title,
  message,
  primaryButtonText = 'OK',
  secondaryButtonText,
  onPrimaryPress,
  onSecondaryPress,
  type = 'info', // 'info', 'success', 'warning', 'error'
  showCloseButton = true,
}) => {
  const getIconAndColor = () => {
    switch (type) {
      case 'success':
        return {
          icon: 'checkmark-circle',
          color: 'hsl(75, 100%, 60%)',
          bgColor: 'hsl(75, 100%, 60%, 0.1)',
        };
      case 'warning':
        return {
          icon: 'warning',
          color: 'hsl(45, 100%, 60%)',
          bgColor: 'hsl(45, 100%, 60%, 0.1)',
        };
      case 'error':
        return {
          icon: 'close-circle',
          color: 'hsl(0, 100%, 60%)',
          bgColor: 'hsl(0, 100%, 60%, 0.1)',
        };
      default:
        return {
          icon: 'information-circle',
          color: 'hsl(200, 100%, 60%)',
          bgColor: 'hsl(200, 100%, 60%, 0.1)',
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
              <TouchableOpacity
                style={styles.closeButton}
                onPress={onClose}
              >
                <Ionicons name="close" size={24} color="hsl(0, 0%, 70%)" />
              </TouchableOpacity>
            )}
          </View>

          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
            <Ionicons name={icon} size={48} color={color} />
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
                !secondaryButtonText && styles.primaryButtonFull
              ]}
              onPress={handlePrimaryPress}
            >
              <Text style={styles.primaryButtonText}>
                {primaryButtonText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: 'hsl(0, 0%, 8%)',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'hsl(0, 0%, 15%)',
    shadowColor: 'hsl(75, 100%, 60%)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  closeButton: {
    padding: 4,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  content: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: 'hsl(0, 0%, 100%)',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: 'hsl(0, 0%, 70%)',
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonFull: {
    flex: 1,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'hsl(0, 0%, 0%)',
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'hsl(0, 0%, 15%)',
    borderWidth: 1,
    borderColor: 'hsl(0, 0%, 25%)',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'hsl(0, 0%, 100%)',
  },
});

export default RhoodModal;
