// Example integration for MessagesScreen.js
// Add this to your MessagesScreen component

import KeyboardDebugger, { useKeyboardDebugger } from "./KeyboardDebugger";

// Inside your MessagesScreen component, add this:
const MessagesScreen = ({ user, navigation, route }) => {
  // ... your existing state and logic ...

  // Add keyboard debugger
  const { isDebuggerVisible, toggleDebugger, KeyboardDebugger } =
    useKeyboardDebugger();

  // Add a debug button to your header (temporary for testing)
  const renderDebugButton = () => (
    <TouchableOpacity style={styles.debugButton} onPress={toggleDebugger}>
      <Ionicons name="bug" size={20} color="hsl(75, 100%, 60%)" />
    </TouchableOpacity>
  );

  // In your header section, add the debug button:
  // <View style={styles.header}>
  //   <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
  //     <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
  //   </TouchableOpacity>
  //   {renderDebugButton()} {/* Add this line */}
  //   {/* ... rest of your header content ... */}
  // </View>

  // At the end of your component, before the closing tag:
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        {/* ... your existing content ... */}

        {/* Add the debugger component */}
        <KeyboardDebugger />
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

// Add this style to your StyleSheet:
const styles = StyleSheet.create({
  // ... your existing styles ...
  debugButton: {
    position: "absolute",
    right: 16,
    top: 16,
    backgroundColor: "hsl(0, 0%, 20%)",
    padding: 8,
    borderRadius: 20,
    zIndex: 1000,
  },
});
