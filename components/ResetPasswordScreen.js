import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth, supabase } from "../lib/supabase";
import RhoodModal from "./RhoodModal";
import { HapticPatterns } from "../lib/haptics";

export default function ResetPasswordScreen({ onBack, onSuccess }) {
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState({ visible: false, title: "", message: "" });
  const [successModal, setSuccessModal] = useState({ visible: false });

  // Check if user has a valid password reset session
  useEffect(() => {
    checkResetSession();
  }, []);

  const checkResetSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // If there's no session, the reset link might not have been opened yet
      // or the session expired. We'll still allow them to try resetting.
      if (!session) {
        console.log("⚠️ No active reset session found");
        // Don't show error - user might be coming from email link
      }
    } catch (error) {
      console.error("Error checking reset session:", error);
    }
  };

  const validateForm = () => {
    if (!password || password.length < 6) {
      setErrorModal({ 
        visible: true, 
        title: "Invalid Password", 
        message: "Password must be at least 6 characters long" 
      });
      return false;
    }

    if (password !== confirmPassword) {
      setErrorModal({ 
        visible: true, 
        title: "Passwords Don't Match", 
        message: "Please make sure both passwords match" 
      });
      return false;
    }

    return true;
  };

  const handleResetPassword = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      HapticPatterns.primaryButtonPress();

      // Update password using Supabase auth
      await auth.updatePassword(password);

      console.log("✅ Password reset successfully");
      HapticPatterns.success();
      
      // Show success modal
      setSuccessModal({ visible: true });
    } catch (error) {
      console.error("Password reset error:", error);
      HapticPatterns.error();
      
      let errorMessage = "Failed to reset password. Please try again.";
      
      if (error.message?.includes("session") || error.message?.includes("expired")) {
        errorMessage = "This password reset link has expired. Please request a new one.";
      } else if (error.message?.includes("same")) {
        errorMessage = "New password must be different from your current password.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setErrorModal({ visible: true, title: "Reset Failed", message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleSuccessClose = () => {
    setSuccessModal({ visible: false });
    if (onSuccess) {
      onSuccess();
    } else if (onBack) {
      onBack();
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView 
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Ionicons name="arrow-back" size={24} color="hsl(0, 0%, 100%)" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Reset Password</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Image
              source={require("../assets/rhood_logo.png")}
              style={styles.logoIcon}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>Create New Password</Text>
          <Text style={styles.subtitle}>
            Enter your new password below
          </Text>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>New Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter new password"
                placeholderTextColor="hsl(0, 0%, 50%)"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color="hsl(0, 0%, 70%)"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm new password"
                placeholderTextColor="hsl(0, 0%, 50%)"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={20}
                  color="hsl(0, 0%, 70%)"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Reset Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="hsl(0, 0%, 0%)" />
            ) : (
              <Text style={styles.buttonText}>Reset Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Error Modal */}
      <RhoodModal
        visible={errorModal.visible}
        onClose={() => setErrorModal({ visible: false, title: "", message: "" })}
        title={errorModal.title}
        message={errorModal.message}
        type="error"
        primaryButtonText="OK"
        onPrimaryPress={() => setErrorModal({ visible: false, title: "", message: "" })}
      />

      {/* Success Modal */}
      <RhoodModal
        visible={successModal.visible}
        onClose={handleSuccessClose}
        title="Password Reset Successful!"
        message="Your password has been successfully reset. You can now sign in with your new password."
        type="success"
        primaryButtonText="Sign In"
        onPrimaryPress={handleSuccessClose}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 0%)",
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    marginBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    fontWeight: "bold",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    maxWidth: 400,
    width: "100%",
    alignSelf: "center",
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoIcon: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 28,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "bold",
  },
  subtitle: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 60%)",
    textAlign: "center",
    marginBottom: 32,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 8,
    fontWeight: "500",
  },
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "hsl(0, 0%, 12%)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
  },
  eyeButton: {
    padding: 12,
  },
  button: {
    width: "100%",
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
  },
});

