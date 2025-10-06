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
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../lib/supabase";

export default function SignupScreen({ onSignupSuccess, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    djName: "",
    firstName: "",
    lastName: "",
    city: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const updateFormData = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    const {
      email,
      password,
      confirmPassword,
      djName,
      firstName,
      lastName,
      city,
    } = formData;

    if (
      !email ||
      !password ||
      !confirmPassword ||
      !djName ||
      !firstName ||
      !lastName ||
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
        first_name: formData.firstName,
        last_name: formData.lastName,
        city: formData.city,
      });

      if (user) {
        // Create user profile in database (using upsert to handle duplicates)
        const profileData = {
          id: user.id, // Use the authenticated user's ID
          email: formData.email,
          dj_name: formData.djName,
          first_name: formData.firstName,
          last_name: formData.lastName,
          city: formData.city,
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

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const { user } = await auth.signInWithGoogle();
      if (user) {
        // For social sign-in, we'll need to create a basic profile
        // The user can complete their profile during onboarding
        const profileData = {
          id: user.id,
          email: user.email || "",
          dj_name: user.user_metadata?.full_name || "",
          first_name: user.user_metadata?.given_name || "",
          last_name: user.user_metadata?.family_name || "",
          city: "", // Will be set during onboarding
          genres: [],
          bio: "DJ from the underground",
        };

        await db.createUserProfile(profileData);
        onSignupSuccess(user);
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
      Alert.alert(
        "Sign-Up Failed",
        error.message || "Google sign-up was cancelled"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      const { user } = await auth.signInWithApple();
      if (user) {
        // For social sign-in, we'll need to create a basic profile
        // The user can complete their profile during onboarding
        const profileData = {
          id: user.id,
          email: user.email || "",
          dj_name: user.user_metadata?.full_name || "",
          first_name: user.user_metadata?.given_name || "",
          last_name: user.user_metadata?.family_name || "",
          city: "", // Will be set during onboarding
          genres: [],
          bio: "DJ from the underground",
        };

        await db.createUserProfile(profileData);
        onSignupSuccess(user);
      }
    } catch (error) {
      console.error("Apple sign-in error:", error);
      Alert.alert(
        "Sign-Up Failed",
        error.message || "Apple sign-up was cancelled"
      );
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
          <Image
            source={require("../assets/RHOOD_Lettering_White.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
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

          {/* First Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>First Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Your first name"
              placeholderTextColor="hsl(0, 0%, 50%)"
              value={formData.firstName}
              onChangeText={(value) => updateFormData("firstName", value)}
              autoCapitalize="words"
            />
          </View>

          {/* Last Name Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Last Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Your last name"
              placeholderTextColor="hsl(0, 0%, 50%)"
              value={formData.lastName}
              onChangeText={(value) => updateFormData("lastName", value)}
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
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social Sign-In Buttons */}
          <View style={styles.socialButtonsContainer}>
            {/* Google Sign-In */}
            <TouchableOpacity
              style={[
                styles.socialButton,
                styles.googleButton,
                loading && styles.buttonDisabled,
              ]}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              {/* Google Logo - using text fallback */}
              <View style={styles.logoContainer}>
                <Text style={styles.googleLogo}>G</Text>
              </View>
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Apple Sign-In */}
            {Platform.OS === "ios" && (
              <TouchableOpacity
                style={[
                  styles.socialButton,
                  styles.appleButton,
                  loading && styles.buttonDisabled,
                ]}
                onPress={handleAppleSignIn}
                disabled={loading}
              >
                {/* Apple Logo - using text fallback */}
                <View style={styles.logoContainer}>
                  <Text style={styles.appleLogo}>●</Text>
                </View>
                <Text style={[styles.socialButtonText, styles.appleButtonText]}>
                  Continue with Apple
                </Text>
              </TouchableOpacity>
            )}
          </View>

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
    fontFamily: "TS-Block-Bold",
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 10,
  },
  logoImage: {
    height: 48,
    width: 180,
    marginBottom: 10,
    alignSelf: "center",
  },
  subtitle: {
    color: "hsl(0, 0%, 70%)",
    fontSize: 16,
    fontFamily: "Helvetica Neue",
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
    fontFamily: "Helvetica Neue",
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
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "hsl(0, 0%, 10%)",
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    fontFamily: "Helvetica Neue",
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
    fontFamily: "Helvetica Neue",
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
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  switchText: {
    color: "hsl(0, 0%, 70%)",
    fontSize: 14,
    fontFamily: "Helvetica Neue",
  },
  switchLink: {
    color: "hsl(75, 100%, 60%)",
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "hsl(0, 0%, 15%)",
  },
  dividerText: {
    color: "hsl(0, 0%, 70%)",
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    marginHorizontal: 16,
  },
  socialButtonsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    gap: 12,
  },
  googleButton: {
    backgroundColor: "hsl(0, 0%, 100%)",
    borderColor: "hsl(0, 0%, 15%)",
  },
  appleButton: {
    backgroundColor: "hsl(0, 0%, 0%)",
    borderColor: "hsl(0, 0%, 100%)",
  },
  socialButtonText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    fontWeight: "600",
    color: "hsl(0, 0%, 0%)",
  },
  appleButtonText: {
    color: "hsl(0, 0%, 100%)",
  },
  logoContainer: {
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  googleLogo: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#4285F4",
    fontFamily: "Arial",
  },
  appleLogo: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000000",
    fontFamily: "Arial",
  },
});
