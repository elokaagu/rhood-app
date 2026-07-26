import React, { useState } from "react";
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
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, supabase } from "../lib/supabase";
import RhoodModal from "./RhoodModal";
import { getLoginErrorMessage } from "../lib/errorMessages";
import {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
  sharedStyles,
} from "../lib/sharedStyles";

export default function LoginScreen({ onLoginSuccess, onSwitchToSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState({
    visible: false,
    title: "",
    message: "",
    secondaryButtonText: undefined,
    onSecondaryPress: undefined,
  });
  const [successModal, setSuccessModal] = useState({
    visible: false,
    message: "",
  });

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorModal({ visible: true, title: "Error", message: "Please fill in all fields" });
      return;
    }

    try {
      setLoading(true);

      // First, find the correct email case from the database
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("email")
        .ilike("email", email) // Case-insensitive search
        .single();

      let emailToUse = email; // Default to original email

      if (profile && !profileError) {
        emailToUse = profile.email; // Use the exact case from database
        console.log(`📧 Found email in database: ${emailToUse}`);
      } else {
        console.log(
          `📧 Email not found in profiles, trying original: ${email}`
        );
      }

      // Now try to sign in with the correct email case
      const { user } = await auth.signIn(emailToUse, password);

      if (user) {
        onLoginSuccess(user);
      }
    } catch (error) {
      console.error("Login error:", error);

      // Handle specific error cases
      if (error.message?.includes("Email not confirmed")) {
        setErrorModal({ 
          visible: true, 
          title: "Email Not Confirmed", 
          message: "Please check your email and click the confirmation link before signing in.",
          secondaryButtonText: "Resend Confirmation",
          onSecondaryPress: () => {
            setErrorModal({ visible: false, title: "", message: "" });
            handleResendConfirmation(email);
          }
        });
      } else {
        // Use user-friendly error message utility for all other errors
        const errorMessage = getLoginErrorMessage(error);
        setErrorModal({ 
          visible: true, 
          title: "Login Failed", 
          message: errorMessage 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async (emailAddress) => {
    try {
      // First, find the correct email case from the database
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("email")
        .ilike("email", emailAddress) // Case-insensitive search
        .single();

      let emailToUse = emailAddress; // Default to original email

      if (profile && !profileError) {
        emailToUse = profile.email; // Use the exact case from database
        console.log(`📧 Using email from database: ${emailToUse}`);
      }

      const { error } = await supabase.auth.resend({
        type: "signup",
        email: emailToUse,
      });

      if (error) throw error;

      setSuccessModal({ visible: true, message: "Confirmation Email Sent\n\nPlease check your email and click the confirmation link." });
    } catch (error) {
      console.error("Resend confirmation error:", error);
      setErrorModal({ visible: true, title: "Error", message: "Failed to resend confirmation email" });
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setErrorModal({ visible: true, title: "Email Required", message: "Please enter your email address first" });
      return;
    }

    try {
      // First, find the correct email case from the database
      const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("email")
        .ilike("email", email) // Case-insensitive search
        .single();

      let emailToUse = email; // Default to original email

      if (profile && !profileError) {
        emailToUse = profile.email; // Use the exact case from database
        console.log(`📧 Using email from database: ${emailToUse}`);
      }

      await auth.resetPassword(emailToUse);
      setSuccessModal({ visible: true, message: "Password Reset Sent\n\nCheck your email for password reset instructions" });
    } catch (error) {
      console.error("Password reset error:", error);

      // Handle specific error cases
      if (error.message?.includes("rate limit")) {
        setErrorModal({ 
          visible: true, 
          title: "Error", 
          message: "Too many password reset attempts. Please wait before trying again." 
        });
      } else if (error.message?.includes("not found")) {
        setErrorModal({ visible: true, title: "Error", message: "No account found with this email address." });
      } else {
        setErrorModal({ 
          visible: true, 
          title: "Error", 
          message: "Failed to send password reset email. Please try again." 
        });
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
                <Text style={[styles.socialButtonText, styles.appleButtonText]}>
                  Sign in with Apple
                </Text>
              </TouchableOpacity>
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

      {/* Error Modal */}
      <RhoodModal
        visible={errorModal.visible}
        onClose={() => setErrorModal({ visible: false, title: "", message: "" })}
        title={errorModal.title}
        message={errorModal.message}
        type="error"
        primaryButtonText="OK"
        secondaryButtonText={errorModal.secondaryButtonText}
        onPrimaryPress={() => setErrorModal({ visible: false, title: "", message: "" })}
        onSecondaryPress={errorModal.onSecondaryPress}
      />

      {/* Success Modal */}
      <RhoodModal
        visible={successModal.visible}
        onClose={() => setSuccessModal({ visible: false, message: "" })}
        title="Success"
        message={successModal.message}
        type="success"
        primaryButtonText="OK"
        onPrimaryPress={() => setSuccessModal({ visible: false, message: "" })}
      />
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
    fontWeight: TYPOGRAPHY.weightBold,
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
  socialButtonText: {
    fontSize: TYPOGRAPHY.md,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.semibold,
    color: "hsl(0, 0%, 0%)",
  },
  appleButtonText: {
    color: "hsl(0, 0%, 100%)",
  },
});
