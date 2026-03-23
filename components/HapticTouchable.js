/**
 * Pressable wrapper with consistent haptic feedback.
 *
 * @param {import('react-native').PressableProps} props
 * @param {string} [hapticType] — Used when `hapticPattern` is omitted (see {@link HapticType} in lib/haptics).
 * @param {() => void | Promise<void>} [hapticPattern] — Custom pattern, e.g. `HapticPatterns.buttonPress` from `../lib/haptics`.
 *   Runs first, then `onPress`. Mutually exclusive with the default `withHaptic(..., hapticType)` path.
 */

import React, { useCallback } from "react";
import { Pressable } from "react-native";
import { withHaptic, HapticType } from "../lib/haptics";

export default function HapticTouchable({
  hapticType = HapticType.LIGHT,
  hapticPattern,
  onPress,
  style,
  activeOpacity = 0.7,
  children,
  ...props
}) {
  const handlePress = useCallback(
    async (event) => {
      if (typeof hapticPattern === "function") {
        try {
          await Promise.resolve(hapticPattern());
        } catch {
          /* haptics are best-effort */
        }
        onPress?.(event);
        return;
      }

      const wrapped = withHaptic(onPress, hapticType);
      await wrapped?.(event);
    },
    [hapticPattern, onPress, hapticType]
  );

  return (
    <Pressable
      {...props}
      onPress={handlePress}
      style={(state) => {
        const base =
          typeof style === "function" ? style(state) : style;
        return [base, { opacity: state.pressed ? activeOpacity : 1 }];
      }}
    >
      {children}
    </Pressable>
  );
}
