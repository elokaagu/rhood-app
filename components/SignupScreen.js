import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../lib/supabase";

export default function SignupScreen({ onSignupSuccess, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    djName: "",
    fullName: "",
    city: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const { email, password, confirmPassword, djName, fullName, city } =
      formData;

    if (
      !email ||
      !password ||
      !confirmPassword ||
      !djName ||
      !fullName ||
      !city
    ) {
      Alert.alert("Error", "Please fill in all fields");
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return false;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return false;
    }

    return true;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const { user } = await auth.signUp(formData.email, formData.password, {
        dj_name: formData.djName,
        full_name: formData.fullName,
        city: formData.city,
      });

      if (user) {
        // Create user profile in database
        const profileData = {
          dj_name: formData.djName,
          full_name: formData.fullName,
          city: formData.city,
          email: formData.email,
          genres: [], // Will be set during onboarding
          bio: `DJ from ${formData.city}`,
        };

        await db.createUserProfile(profileData);
        onSignupSuccess(user);
      }
    } catch (error) {
      console.error("Signup error:", error);
      Alert.alert("Signup Failed", error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      setLoading(true);
      await auth.signInWithGoogle();
    } catch (error) {
      console.error("Google signup error:", error);
      Alert.alert("Signup Failed", "Google sign-up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignup = async () => {
    try {
      setLoading(true);
      await auth.signInWithApple();
    } catch (error) {
      console.error("Apple signup error:", error);
      Alert.alert("Signup Failed", "Apple sign-up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.logoText}>R/HOOD</Text>
          <Text style={styles.subtitle}>
            Join the underground music community
          </Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Create Account</Text>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="hsl(0, 0%, 50%)"
              value={formData.email}
              onChangeText={(value) => updateFormData("email", value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* DJ Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>DJ Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Your stage name"
              placeholderTextColor="hsl(0, 0%, 50%)"
              value={formData.djName}
              onChangeText={(value) => updateFormData("djName", value)}
              autoCapitalize="words"
            />
          </View>

          {/* Full Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Your real name"
              placeholderTextColor="hsl(0, 0%, 50%)"
              value={formData.fullName}
              onChangeText={(value) => updateFormData("fullName", value)}
              autoCapitalize="words"
            />
          </View>

          {/* City Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>City *</Text>
            <TextInput
              style={styles.input}
              placeholder="Your city"
              placeholderTextColor="hsl(0, 0%, 50%)"
              value={formData.city}
              onChangeText={(value) => updateFormData("city", value)}
              autoCapitalize="words"
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Create a password"
                placeholderTextColor="hsl(0, 0%, 50%)"
                value={formData.password}
                onChangeText={(value) => updateFormData("password", value)}
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
                placeholder="Confirm your password"
                placeholderTextColor="hsl(0, 0%, 50%)"
                value={formData.confirmPassword}
                onChangeText={(value) =>
                  updateFormData("confirmPassword", value)
                }
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

          {/* Signup Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="hsl(0, 0%, 0%)" />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Signup Buttons */}
          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleGoogleSignup}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={20} color="hsl(0, 0%, 100%)" />
            <Text style={styles.socialButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.socialButton}
            onPress={handleAppleSignup}
            disabled={loading}
          >
            <Ionicons name="logo-apple" size={20} color="hsl(0, 0%, 100%)" />
            <Text style={styles.socialButtonText}>Continue with Apple</Text>
          </TouchableOpacity>

          {/* Switch to Login */}
          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>Already have an account? </Text>
            <TouchableOpacity onPress={onSwitchToLogin}>
              <Text style={styles.switchLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    justifyContent: "center",
    padding: 20,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoText: {
    color: "hsl(75, 100%, 60%)",
    fontSize: 32,
    fontFamily: "Arial Black",
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 10,
  },
  subtitle: {
    color: "hsl(0, 0%, 70%)",
    fontSize: 16,
    fontFamily: "Arial",
    textAlign: "center",
  },
  form: {
    backgroundColor: "hsl(0, 0%, 5%)",
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  formTitle: {
    fontSize: 24,
    fontFamily: "Arial",
    fontWeight: "bold",
    color: "hsl(0, 0%, 100%)",
    textAlign: "center",
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    color: "hsl(0, 0%, 100%)",
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "hsl(0, 0%, 10%)",
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  passwordContainer: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 10%)",
    borderRadius: 8,
    padding: 16,
    paddingRight: 50,
    fontSize: 16,
    fontFamily: "Arial",
    color: "hsl(0, 0%, 100%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  eyeButton: {
    position: "absolute",
    right: 16,
    padding: 4,
  },
  button: {
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "hsl(0, 0%, 0%)",
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "bold",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "hsl(0, 0%, 15%)",
  },
  dividerText: {
    color: "hsl(0, 0%, 50%)",
    fontSize: 14,
    fontFamily: "Arial",
    marginHorizontal: 16,
  },
  socialButton: {
    backgroundColor: "hsl(0, 0%, 10%)",
    borderRadius: 8,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 15%)",
  },
  socialButtonText: {
    color: "hsl(0, 0%, 100%)",
    fontSize: 16,
    fontFamily: "Arial",
    fontWeight: "600",
    marginLeft: 12,
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  switchText: {
    color: "hsl(0, 0%, 70%)",
    fontSize: 14,
    fontFamily: "Arial",
  },
  switchLink: {
    color: "hsl(75, 100%, 60%)",
    fontSize: 14,
    fontFamily: "Arial",
    fontWeight: "600",
  },
});

