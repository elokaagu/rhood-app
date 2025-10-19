import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Keyboard,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const KeyboardTestHelper = () => {
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [screenHeight, setScreenHeight] = useState(
    Dimensions.get("window").height
  );
  const [inputFieldPosition, setInputFieldPosition] = useState({
    y: 0,
    height: 0,
  });
  const [testResults, setTestResults] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        setKeyboardHeight(event.endCoordinates.height);
        setIsKeyboardVisible(true);
        checkInputFieldVisibility();
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    const dimensionListener = Dimensions.addEventListener(
      "change",
      ({ window }) => {
        setScreenHeight(window.height);
      }
    );

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
      dimensionListener?.remove();
    };
  }, []);

  const checkInputFieldVisibility = () => {
    if (inputRef.current) {
      inputRef.current.measure((x, y, width, height, pageX, pageY) => {
        const inputBottom = pageY + height;
        const keyboardTop = screenHeight - keyboardHeight;
        const isVisible = inputBottom <= keyboardTop;

        const result = {
          timestamp: new Date().toISOString(),
          keyboardHeight,
          inputPosition: { x: pageX, y: pageY, width, height },
          inputBottom,
          keyboardTop,
          isVisible,
          screenHeight,
        };

        setTestResults((prev) => [...prev, result]);

        if (!isVisible) {
          Alert.alert(
            "Keyboard Test Failed",
            `Input field is blocked!\nInput bottom: ${inputBottom}\nKeyboard top: ${keyboardTop}\nDifference: ${
              inputBottom - keyboardTop
            }px`
          );
        }
      });
    }
  };

  const runComprehensiveTest = () => {
    const tests = [
      { name: "Short message", text: "Hi" },
      {
        name: "Medium message",
        text: "This is a medium length message to test keyboard behavior",
      },
      {
        name: "Long message",
        text: "This is a very long message that should span multiple lines and test how the keyboard behaves when the input field needs to expand to accommodate longer text content",
      },
      { name: "Max length message", text: "A".repeat(500) },
    ];

    tests.forEach((test, index) => {
      setTimeout(() => {
        Alert.alert("Test", `Testing: ${test.name}`);
        // Focus input and set text
        if (inputRef.current) {
          inputRef.current.focus();
          // Simulate typing
          setTimeout(() => {
            checkInputFieldVisibility();
          }, 100);
        }
      }, index * 2000);
    });
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  const exportTestResults = () => {
    const resultsText = testResults
      .map(
        (result) =>
          `${result.timestamp}: ${
            result.isVisible ? "PASS" : "FAIL"
          } - Keyboard: ${result.keyboardHeight}px, Input bottom: ${
            result.inputBottom
          }px, Keyboard top: ${result.keyboardTop}px`
      )
      .join("\n");

    Alert.alert("Test Results", resultsText);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Keyboard Test Helper</Text>
        <Text style={styles.subtitle}>
          Screen: {screenHeight}px | Keyboard: {keyboardHeight}px | Visible:{" "}
          {isKeyboardVisible ? "Yes" : "No"}
        </Text>
      </View>

      <View style={styles.testControls}>
        <TouchableOpacity
          style={styles.testButton}
          onPress={runComprehensiveTest}
        >
          <Text style={styles.buttonText}>Run Tests</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={clearTestResults}>
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testButton} onPress={exportTestResults}>
          <Text style={styles.buttonText}>Export Results</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.testInput}
          placeholder="Test input field - tap to test keyboard behavior"
          placeholderTextColor="hsl(0, 0%, 50%)"
          multiline
          maxLength={500}
          onFocus={() => {
            setTimeout(checkInputFieldVisibility, 100);
          }}
          onBlur={() => {
            setTimeout(checkInputFieldVisibility, 100);
          }}
        />
      </View>

      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>
          Test Results ({testResults.length})
        </Text>
        {testResults.slice(-5).map((result, index) => (
          <Text
            key={index}
            style={[
              styles.resultText,
              {
                color: result.isVisible
                  ? "hsl(75, 100%, 60%)"
                  : "hsl(0, 100%, 50%)",
              },
            ]}
          >
            {result.isVisible ? "✓" : "✗"}{" "}
            {new Date(result.timestamp).toLocaleTimeString()}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: "hsl(75, 100%, 60%)",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    color: "hsl(0, 0%, 60%)",
    fontSize: 14,
  },
  testControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  testButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  buttonText: {
    color: "hsl(0, 0%, 0%)",
    fontSize: 12,
    fontWeight: "600",
  },
  inputContainer: {
    backgroundColor: "hsl(0, 0%, 8%)",
    borderRadius: 8,
    marginBottom: 20,
  },
  testInput: {
    backgroundColor: "hsl(0, 0%, 12%)",
    borderRadius: 8,
    padding: 12,
    color: "hsl(0, 0%, 100%)",
    fontSize: 16,
    minHeight: 44,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%)",
  },
  resultsContainer: {
    flex: 1,
  },
  resultsTitle: {
    color: "hsl(0, 0%, 100%)",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  resultText: {
    fontSize: 12,
    marginBottom: 4,
  },
});

export default KeyboardTestHelper;
