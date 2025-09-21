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
import { auth } from "../lib/supabase";

export default function LoginScreen({ onLoginSuccess, onSwitchToSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      const { user } = await auth.signIn(email, password);

      if (user) {
        onLoginSuccess(user);
      }
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert("Login Failed", error.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert("Email Required", "Please enter your email address first");
      return;
    }

    try {
      await auth.resetPassword(email);
      Alert.alert(
        "Password Reset Sent",
        "Check your email for password reset instructions"
      );
    } catch (error) {
      console.error("Password reset error:", error);
      Alert.alert("Error", "Failed to send password reset email");
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
          <Text style={styles.subtitle}>Welcome back to the underground</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.formTitle}>Sign In</Text>

          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor="hsl(0, 0%, 50%)"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
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

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotPassword}
            onPress={handleForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="hsl(0, 0%, 0%)" />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Switch to Signup */}
          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>Don't have an account? </Text>
            <TouchableOpacity onPress={onSwitchToSignup}>
              <Text style={styles.switchLink}>Sign Up</Text>
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
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotPasswordText: {
    color: "hsl(75, 100%, 60%)",
    fontSize: 14,
    fontFamily: "Helvetica Neue",
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
});
