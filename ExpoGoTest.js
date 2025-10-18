// Test Expo Go compatibility for multimedia functionality
// Run this in your Expo Go app to test

import React, { useState } from "react";
import { View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";

export default function ExpoGoTest() {
  const [testResults, setTestResults] = useState({});

  const testImagePicker = async () => {
    try {
      console.log("Testing ImagePicker in Expo Go...");

      // Request permissions
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log("ImagePicker permission status:", status);

      if (status !== "granted") {
        Alert.alert("Permission Required", "Please grant photo library access");
        return;
      }

      // Test image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      console.log("ImagePicker result:", result);

      if (result.canceled) {
        setTestResults((prev) => ({ ...prev, imagePicker: "User canceled" }));
      } else {
        setTestResults((prev) => ({
          ...prev,
          imagePicker: "SUCCESS - Image selected",
        }));
      }
    } catch (error) {
      console.error("ImagePicker error:", error);
      setTestResults((prev) => ({
        ...prev,
        imagePicker: `ERROR: ${error.message}`,
      }));
    }
  };

  const testDocumentPicker = async () => {
    try {
      console.log("Testing DocumentPicker in Expo Go...");

      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
      });

      console.log("DocumentPicker result:", result);

      if (result.canceled) {
        setTestResults((prev) => ({
          ...prev,
          documentPicker: "User canceled",
        }));
      } else {
        setTestResults((prev) => ({
          ...prev,
          documentPicker: "SUCCESS - Document selected",
        }));
      }
    } catch (error) {
      console.error("DocumentPicker error:", error);
      setTestResults((prev) => ({
        ...prev,
        documentPicker: `ERROR: ${error.message}`,
      }));
    }
  };

  const testFileSystem = async () => {
    try {
      console.log("Testing FileSystem in Expo Go...");

      const { FileSystem } = await import("expo-file-system");
      const info = await FileSystem.getInfoAsync(FileSystem.documentDirectory);

      console.log("FileSystem info:", info);
      setTestResults((prev) => ({
        ...prev,
        fileSystem: "SUCCESS - FileSystem working",
      }));
    } catch (error) {
      console.error("FileSystem error:", error);
      setTestResults((prev) => ({
        ...prev,
        fileSystem: `ERROR: ${error.message}`,
      }));
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Expo Go Multimedia Test</Text>

      <TouchableOpacity style={styles.button} onPress={testImagePicker}>
        <Text style={styles.buttonText}>Test Image Picker</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={testDocumentPicker}>
        <Text style={styles.buttonText}>Test Document Picker</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={testFileSystem}>
        <Text style={styles.buttonText}>Test File System</Text>
      </TouchableOpacity>

      <View style={styles.results}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        {Object.entries(testResults).map(([key, value]) => (
          <Text key={key} style={styles.resultText}>
            {key}: {value}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#000",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    color: "#fff",
    textAlign: "center",
    marginBottom: 30,
    fontWeight: "bold",
  },
  button: {
    backgroundColor: "#00ff00",
    padding: 15,
    borderRadius: 10,
    marginVertical: 10,
  },
  buttonText: {
    color: "#000",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
  },
  results: {
    marginTop: 30,
    padding: 15,
    backgroundColor: "#111",
    borderRadius: 10,
  },
  resultsTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  resultText: {
    color: "#fff",
    fontSize: 14,
    marginVertical: 2,
  },
});
