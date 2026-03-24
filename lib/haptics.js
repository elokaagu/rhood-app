/**
 * Haptic Feedback Utility
 * Provides consistent haptic feedback patterns throughout the app
 */

import * as Haptics from "expo-haptics";

/**
 * Haptic feedback types mapped to expo-haptics styles
 */
export const HapticType = {
  // Impact feedback (for button presses, taps)
  LIGHT: "light",
  MEDIUM: "medium",
  HEAVY: "heavy",
  
  // Notification feedback (for success/error states)
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
  
  // Selection feedback (for pickers, toggles)
  SELECTION: "selection",
};

let hapticsEnabled = true;

export const setHapticsEnabled = (enabled) => {
  hapticsEnabled = !!enabled;
};

/**
 * Trigger haptic feedback based on type
 * @param {string} type - One of HapticType values
 */
export const triggerHaptic = async (type = HapticType.LIGHT) => {
  if (!hapticsEnabled) return;

  try {
    switch (type) {
      case HapticType.LIGHT:
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case HapticType.MEDIUM:
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case HapticType.HEAVY:
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case HapticType.SUCCESS:
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case HapticType.WARNING:
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case HapticType.ERROR:
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      case HapticType.SELECTION:
        await Haptics.selectionAsync();
        break;
      default:
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch (error) {
    // Silently fail - haptics may not be available on all devices
    if (__DEV__) {
      console.warn("Haptic feedback not available:", error?.message || error);
    }
  }
};

/**
 * Wrapper for button press handlers with haptic feedback
 * @param {Function} handler - Original onPress handler
 * @param {string} hapticType - Haptic feedback type (default: LIGHT)
 * @returns {Function} Wrapped handler with haptic feedback
 */
export const withHaptic = (handler, hapticType = HapticType.LIGHT) => {
  return (...args) => {
    triggerHaptic(hapticType);
    return handler?.(...args);
  };
};

/**
 * Common haptic patterns for specific interactions
 */
export const HapticPatterns = {
  // Button interactions
  buttonPress: () => triggerHaptic(HapticType.LIGHT),
  primaryButtonPress: () => triggerHaptic(HapticType.MEDIUM),
  destructiveButtonPress: () => triggerHaptic(HapticType.HEAVY),
  
  // List/item interactions
  itemPress: () => triggerHaptic(HapticType.LIGHT),
  itemLongPress: () => triggerHaptic(HapticType.MEDIUM),
  
  // Toggle/switch interactions
  toggle: () => triggerHaptic(HapticType.SELECTION),
  
  // Navigation
  tabSwitch: () => triggerHaptic(HapticType.SELECTION),
  backButton: () => triggerHaptic(HapticType.LIGHT),
  
  // Actions
  like: () => triggerHaptic(HapticType.LIGHT),
  share: () => triggerHaptic(HapticType.LIGHT),
  delete: () => triggerHaptic(HapticType.MEDIUM),
  save: () => triggerHaptic(HapticType.SUCCESS),
  
  // Feedback states
  success: () => triggerHaptic(HapticType.SUCCESS),
  error: () => triggerHaptic(HapticType.ERROR),
  warning: () => triggerHaptic(HapticType.WARNING),
  
  // Gestures
  swipe: () => triggerHaptic(HapticType.LIGHT),
  pullToRefresh: () => triggerHaptic(HapticType.MEDIUM),
  
  // Audio controls
  playPause: () => triggerHaptic(HapticType.MEDIUM),
  seek: () => triggerHaptic(HapticType.LIGHT),
  nextPrevious: () => triggerHaptic(HapticType.SELECTION),
};

