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
import { auth, supabase } from "../lib/supabase";
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  sharedStyles,
} from "../lib/sharedStyles";
import { appleNonceProbe } from "../debug/appleNonceProbe";

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
      
      // Handle specific error cases
      if (error.message?.includes("Email not confirmed")) {
        Alert.alert(
          "Email Not Confirmed", 
          "Please check your email and click the confirmation link before signing in.",
          [
            { text: "OK", style: "default" },
            { 
              text: "Resend Confirmation", 
              style: "default",
              onPress: () => handleResendConfirmation(email)
            }
          ]
        );
      } else if (error.message?.includes("Invalid login credentials")) {
        Alert.alert("Login Failed", "Invalid email or password");
      } else {
        Alert.alert("Login Failed", error.message || "An error occurred during login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async (emailAddress) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailAddress,
      });

      if (error) throw error;
      
      Alert.alert(
        "Confirmation Email Sent",
        "Please check your email and click the confirmation link."
      );
    } catch (error) {
      console.error("Resend confirmation error:", error);
      Alert.alert("Error", "Failed to resend confirmation email");
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
      
      // Handle specific error cases
      if (error.message?.includes("rate limit")) {
        Alert.alert("Error", "Too many password reset attempts. Please wait before trying again.");
      } else if (error.message?.includes("not found")) {
        Alert.alert("Error", "No account found with this email address.");
      } else {
        Alert.alert("Error", "Failed to send password reset email. Please try again.");
      }
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const sessionData = await auth.signInWithGoogle(false); // Pass false for login flow
      console.log("✅ Google Sign-In returned sessionData:", !!sessionData);
      console.log("✅ User from sessionData:", sessionData?.user?.email);

      if (sessionData?.user) {
        console.log(
          "📞 Calling onLoginSuccess with user:",
          sessionData.user.id
        );
        onLoginSuccess(sessionData.user);
      } else {
        console.error("❌ No user in sessionData");
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
      Alert.alert(
        "Sign-In Failed",
        error.message || "Google sign-in was cancelled"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      const sessionData = await auth.signInWithApple();
      console.log("✅ Apple Sign-In returned sessionData:", !!sessionData);
      console.log("✅ User from sessionData:", sessionData?.user?.email);

      if (sessionData?.user) {
        console.log(
          "📞 Calling onLoginSuccess with user:",
          sessionData.user.id
        );
        onLoginSuccess(sessionData.user);
      } else {
        console.error("❌ No user in sessionData");
      }
    } catch (error) {
      console.error("Apple sign-in error:", error);
      Alert.alert(
        "Sign-In Failed",
        error.message || "Apple sign-in was cancelled"
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
          <View style={styles.logoContainer}>
            <Image
              source={require("../assets/rhood_logo.png")}
              style={styles.logoIcon}
              resizeMode="contain"
            />
            <Image
              source={require("../assets/RHOOD_Lettering_White.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.subtitle}>Welcome back to R/HOOD</Text>
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
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Apple Sign-In - Temporarily Hidden */}
            {false && Platform.OS === "ios" && (
              <>
                <TouchableOpacity
                  style={[
                    styles.socialButton,
                    styles.appleButton,
                    loading && styles.buttonDisabled,
                  ]}
                  onPress={handleAppleSignIn}
                  disabled={loading}
                >
                  <Text
                    style={[styles.socialButtonText, styles.appleButtonText]}
                  >
                    Continue with Apple
                  </Text>
                </TouchableOpacity>

                {/* Debug Probe Button - Only in development */}
                {__DEV__ && (
                  <TouchableOpacity
                    style={[styles.socialButton, styles.debugButton]}
                    onPress={appleNonceProbe}
                  >
                    <Text
                      style={[styles.socialButtonText, styles.debugButtonText]}
                    >
                      🔍 Apple Debug Probe
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

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
    ...sharedStyles.container,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: SPACING.lg,
  },
  header: {
    ...sharedStyles.center,
    marginBottom: SPACING["3xl"],
  },
  logoText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY["5xl"],
    fontFamily: TYPOGRAPHY.bold,
    fontWeight: TYPOGRAPHY.black,
    letterSpacing: 1,
    marginBottom: SPACING.base,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.base,
  },
  logoIcon: {
    height: 40,
    width: 40,
    marginRight: SPACING.sm,
  },
  logoImage: {
    height: 48,
    width: 180,
  },
  subtitle: {
    ...sharedStyles.textSecondary,
    fontSize: TYPOGRAPHY.lg,
    textAlign: "center",
  },
  form: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: RADIUS.md,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  formTitle: {
    fontSize: TYPOGRAPHY["3xl"],
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: SPACING.xl,
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  label: {
    ...sharedStyles.label,
  },
  input: {
    ...sharedStyles.input,
  },
  passwordContainer: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    ...sharedStyles.input,
    paddingRight: 50,
  },
  eyeButton: {
    position: "absolute",
    right: SPACING.md,
    padding: SPACING.xs,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: SPACING.xl,
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
  },
  button: {
    ...sharedStyles.buttonPrimary,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.xl,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...sharedStyles.buttonTextPrimary,
  },
  switchContainer: {
    ...sharedStyles.row,
    justifyContent: "center",
    marginTop: SPACING.md,
  },
  switchText: {
    ...sharedStyles.textSecondary,
    fontSize: TYPOGRAPHY.sm,
  },
  switchLink: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.semibold,
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: SPACING.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    marginHorizontal: SPACING.md,
  },
  socialButtonsContainer: {
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  googleButton: {
    backgroundColor: "hsl(0, 0%, 100%)",
    borderColor: COLORS.border,
  },
  appleButton: {
    backgroundColor: "hsl(0, 0%, 0%)",
    borderColor: "hsl(0, 0%, 100%)",
  },
  debugButton: {
    backgroundColor: "hsl(280, 100%, 50%)", // Purple for debug
    borderColor: "hsl(280, 100%, 50%)",
  },
  socialButtonText: {
    fontSize: TYPOGRAPHY.md,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.semibold,
    color: "hsl(0, 0%, 0%)",
  },
  appleButtonText: {
    color: "hsl(0, 0%, 100%)",
  },
  debugButtonText: {
    color: "hsl(0, 0%, 100%)",
  },
});
