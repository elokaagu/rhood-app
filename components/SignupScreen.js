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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../lib/supabase";
import RhoodModal from "./RhoodModal";
import { getSignupErrorMessage } from "../lib/errorMessages";

export default function SignupScreen({ onSignupSuccess, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    djName: "",
    firstName: "",
    lastName: "",
    city: "",
    inviteCode: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorModal, setErrorModal] = useState({ visible: false, title: "", message: "" });
  const [pendingEmail, setPendingEmail] = useState(null); // set when email confirmation is required
  const [resendCooldown, setResendCooldown] = useState(0);

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
      setErrorModal({ visible: true, title: "Error", message: "Please fill in all fields" });
      return false;
    }

    if (password !== confirmPassword) {
      setErrorModal({ visible: true, title: "Error", message: "Passwords do not match" });
      return false;
    }

    if (password.length < 6) {
      setErrorModal({ visible: true, title: "Error", message: "Password must be at least 6 characters" });
      return false;
    }

    return true;
  };

  const handleSignup = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      const { user, needsEmailConfirmation } = await auth.signUp(
        formData.email,
        formData.password
      );

      if (user) {
        if (!needsEmailConfirmation) {
          // Auto-confirmed (email confirmation disabled in Supabase) — proceed immediately
          const profileData = {
            id: user.id,
            email: formData.email,
            dj_name: formData.djName,
            first_name: formData.firstName,
            last_name: formData.lastName,
            city: formData.city,
            genres: [],
            bio: `DJ from ${formData.city}`,
            profile_image_url: null,
          };

          await db.createUserProfile(profileData);

          if (formData.inviteCode && formData.inviteCode.trim()) {
            try {
              await db.processReferral(formData.inviteCode.trim(), user.id);
            } catch (referralError) {
              console.warn("⚠️ Referral processing failed:", referralError);
            }
          }

          onSignupSuccess(user, {
            dj_name: formData.djName,
            first_name: formData.firstName,
            last_name: formData.lastName,
            city: formData.city,
          });
        } else {
          // Email confirmation required — show the pending screen
          setPendingEmail(formData.email);
          startResendCooldown();
        }
      }
    } catch (error) {
      console.error("Signup error:", error);
      const errorMessage = getSignupErrorMessage(error);
      setErrorModal({ visible: true, title: "Signup Failed", message: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendEmail = async () => {
    if (!pendingEmail || resendCooldown > 0) return;
    try {
      setLoading(true);
      await auth.resendConfirmationEmail(pendingEmail);
      startResendCooldown();
    } catch (error) {
      setErrorModal({ visible: true, title: "Error", message: "Couldn't resend the email. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const sessionData = await auth.signInWithGoogle(true); // Pass true for signup flow
      console.log("✅ Google Sign-Up returned sessionData:", !!sessionData);
      console.log("✅ User from sessionData:", sessionData?.user?.email);

      if (sessionData?.user) {
        console.log(
          "📞 Calling onSignupSuccess with user:",
          sessionData.user.id
        );
        onSignupSuccess(sessionData.user, {
          dj_name: sessionData.user.user_metadata?.full_name || "",
          first_name: sessionData.user.user_metadata?.given_name || "",
          last_name: sessionData.user.user_metadata?.family_name || "",
          city: "",
        });
      } else {
        console.error("❌ No user in sessionData");
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
        onSignupSuccess(user, {
          dj_name: profileData.dj_name,
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          city: profileData.city,
        });
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

  // Email confirmation pending screen
  if (pendingEmail) {
    return (
      <View style={styles.container}>
        <View style={styles.pendingContainer}>
          <View style={styles.pendingIconCircle}>
            <Ionicons name="mail-outline" size={40} color="hsl(75, 100%, 60%)" />
          </View>
          <Text style={styles.pendingTitle}>Check your inbox</Text>
          <Text style={styles.pendingBody}>
            We sent a confirmation link to{"\n"}
            <Text style={styles.pendingEmail}>{pendingEmail}</Text>
          </Text>
          <Text style={styles.pendingHint}>
            Tap the link in the email to activate your account, then come back and sign in.
          </Text>

          <TouchableOpacity
            style={[styles.button, resendCooldown > 0 && styles.buttonDisabled]}
            onPress={handleResendEmail}
            disabled={resendCooldown > 0 || loading}
          >
            {loading ? (
              <ActivityIndicator color="hsl(0, 0%, 0%)" />
            ) : (
              <Text style={styles.buttonText}>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend email"}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.switchContainer} onPress={onSwitchToLogin}>
            <Text style={styles.switchText}>Already confirmed? </Text>
            <Text style={styles.switchLink}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <RhoodModal
          visible={errorModal.visible}
          onClose={() => setErrorModal({ visible: false, title: "", message: "" })}
          title={errorModal.title}
          message={errorModal.message}
          type="error"
          primaryButtonText="OK"
          onPrimaryPress={() => setErrorModal({ visible: false, title: "", message: "" })}
        />
      </View>
    );
  }

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

          {/* Invite Code Input (Optional) */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Invite Code (Optional)</Text>
            <Text style={styles.helperText}>
              Enter a friend's invite code to earn them credits
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Enter invite code"
              placeholderTextColor="hsl(0, 0%, 50%)"
              value={formData.inviteCode}
              onChangeText={(value) =>
                updateFormData("inviteCode", value.toUpperCase())
              }
              autoCapitalize="characters"
              autoCorrect={false}
            />
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
              <Text style={styles.socialButtonText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Apple Sign-In - Temporarily Hidden */}
            {false && Platform.OS === "ios" && (
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
    fontFamily: "TS Block Bold",
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 10,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  logoIcon: {
    height: 40,
    width: 40,
    marginRight: 8,
  },
  logoImage: {
    height: 48,
    width: 180,
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
  helperText: {
    color: "hsl(0, 0%, 60%)",
    fontSize: 12,
    fontFamily: "Helvetica Neue",
    marginBottom: 8,
  },
  // Email confirmation pending
  pendingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  pendingIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "hsl(0, 0%, 8%)",
    borderWidth: 1,
    borderColor: "hsl(75, 100%, 60%)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 28,
  },
  pendingTitle: {
    color: "hsl(0, 0%, 100%)",
    fontSize: 26,
    fontFamily: "Helvetica Neue",
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  pendingBody: {
    color: "hsl(0, 0%, 70%)",
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 24,
  },
  pendingEmail: {
    color: "hsl(0, 0%, 100%)",
    fontWeight: "600",
  },
  pendingHint: {
    color: "hsl(0, 0%, 50%)",
    fontSize: 13,
    fontFamily: "Helvetica Neue",
    textAlign: "center",
    marginBottom: 36,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
});
