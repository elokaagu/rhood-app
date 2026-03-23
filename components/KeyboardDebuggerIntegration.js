/**
 * Copy-paste recipe for wiring KeyboardDebugger into a screen.
 *
 * Pattern:
 * - Import the default export under a distinct name (avoid shadowing the hook).
 * - Mount the overlay only when open → no listeners / state while closed.
 * - Attach `inputRef` to the TextInput (or a wrapper View) you want to measure.
 *
 * Default export: minimal runnable example for dev builds.
 */

import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import KeyboardDebuggerOverlay, {
  useKeyboardDebugger,
} from "./KeyboardDebugger";

/** Tune to your screen: status bar + header row (see MessagesScreen / App header). */
const EXAMPLE_KEYBOARD_VERTICAL_OFFSET_IOS = 56;

/**
 * Minimal screen showing the integration pattern.
 * Toggle with the bug button; type in the field, open the overlay, check overlap.
 */
export default function KeyboardDebuggerIntegrationExample() {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const { isDebuggerVisible, toggleDebugger, inputRef } = useKeyboardDebugger();

  useEffect(() => {
    // Optional: match a real screen’s entrance animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={
        Platform.OS === "ios" ? EXAMPLE_KEYBOARD_VERTICAL_OFFSET_IOS : 0
      }
    >
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
          <Text style={styles.headerTitle}>Keyboard debug example</Text>
          <TouchableOpacity
            onPress={toggleDebugger}
            style={styles.debugButtonInHeader}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Open keyboard debugger"
          >
            <Ionicons name="bug" size={22} color="hsl(75, 100%, 60%)" />
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          Same ref on this field powers overlap math in the overlay.
        </Text>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Focus here, then open the debugger"
          placeholderTextColor="hsl(0, 0%, 45%)"
          multiline
          keyboardAppearance="dark"
        />

        {/* Only mount when open: no keyboard/dimension listeners while hidden */}
        {isDebuggerVisible ? (
          <KeyboardDebuggerOverlay
            isVisible
            onToggle={toggleDebugger}
            inputRef={inputRef}
          />
        ) : null}
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

/**
 * Alternative: floating bug button (uses safe area). Prefer header placement when
 * you have a real header row — avoids overlap with notches and back buttons.
 */
export function useFloatingKeyboardDebugButtonStyle() {
  const insets = useSafeAreaInsets();
  return {
    position: "absolute",
    right: 16,
    top: insets.top + 8,
    zIndex: 1000,
  };
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 5%)",
  },
  inner: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 18%)",
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "hsl(0, 0%, 100%)",
  },
  debugButtonInHeader: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "hsl(0, 0%, 20%)",
  },
  hint: {
    marginHorizontal: 16,
    marginTop: 12,
    fontSize: 13,
    color: "hsl(0, 0%, 55%)",
  },
  input: {
    margin: 16,
    minHeight: 120,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 35%)",
    backgroundColor: "hsl(0, 0%, 10%)",
    color: "hsl(0, 0%, 100%)",
    fontSize: 16,
    textAlignVertical: "top",
  },
});
