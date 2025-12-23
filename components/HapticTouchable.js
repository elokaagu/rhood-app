/**
 * HapticTouchable Component
 * A TouchableOpacity wrapper that automatically provides haptic feedback
 */

import React from "react";
import { TouchableOpacity } from "react-native";
import { withHaptic, HapticType, HapticPatterns } from "../lib/haptics";

/**
 * TouchableOpacity with built-in haptic feedback
 * 
 * @param {Object} props - All TouchableOpacity props plus:
 * @param {string} hapticType - Type of haptic feedback (default: LIGHT)
 * @param {Function} hapticPattern - Predefined haptic pattern function (e.g., HapticPatterns.buttonPress)
 * @param {Function} onPress - Original onPress handler
 */
export default function HapticTouchable({
  hapticType = HapticType.LIGHT,
  hapticPattern,
  onPress,
  ...props
}) {
  const handlePress = hapticPattern
    ? withHaptic(onPress, HapticType.LIGHT) // Pattern functions handle their own haptics
    : withHaptic(onPress, hapticType);

  return <TouchableOpacity onPress={handlePress} {...props} />;
}

