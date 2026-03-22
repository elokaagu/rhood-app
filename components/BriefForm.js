import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

const SCROLL_BOTTOM_PADDING = 32;

export default function BriefForm({
  opportunity,
  onClose,
  onSubmit,
  isLoading = false,
}) {
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    experience: "",
    availability: "",
    equipment: "",
    rate: "",
    message: "",
    portfolio: "",
  });

  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};

    if (!formData.experience.trim()) {
      newErrors.experience = "Please describe your experience";
    }

    if (!formData.availability.trim()) {
      newErrors.availability = "Please specify your availability";
    }

    if (!formData.message.trim()) {
      newErrors.message = "Please provide a message to the organizer";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await onSubmit({
        opportunityId: opportunity.id,
        briefData: formData,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to submit application. Please try again.");
    }
  };

  const updateField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const headerTopPadding = insets.top + 12;
  const busy = isLoading || submitting;

  if (!opportunity?.id) {
    return (
      <View style={[styles.container, styles.invalidContainer]}>
        <View style={[styles.header, { paddingTop: headerTopPadding }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
          >
            <Ionicons name="close" size={24} color="hsl(0, 0%, 70%)" />
          </TouchableOpacity>
          <Text style={styles.invalidTitle}>Opportunity unavailable</Text>
        </View>
        <View style={styles.invalidBody}>
          <Text style={styles.invalidText}>
            This listing could not be loaded. Please go back and try again.
          </Text>
          <TouchableOpacity style={styles.submitButton} onPress={onClose}>
            <Text style={styles.submitButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.header, { paddingTop: headerTopPadding }]}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onClose();
          }}
        >
          <Ionicons name="close" size={24} color="hsl(0, 0%, 70%)" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text
            style={styles.headerTitle}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            Apply to {opportunity.title || "Opportunity"}
          </Text>
          <Text style={styles.headerSubtitle}>
            Fill out this brief to submit your application
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.formContainer}
        contentContainerStyle={{
          paddingBottom: SCROLL_BOTTOM_PADDING + insets.bottom,
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Experience & Background</Text>
          <TextInput
            style={[styles.textArea, errors.experience && styles.inputError]}
            placeholder="Tell us about your DJ experience, genres you specialize in, and notable gigs..."
            placeholderTextColor="hsl(0, 0%, 50%)"
            value={formData.experience}
            onChangeText={(value) => updateField("experience", value)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          {errors.experience && (
            <Text style={styles.errorText}>{errors.experience}</Text>
          )}
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Availability</Text>
          <TextInput
            style={[styles.textInput, errors.availability && styles.inputError]}
            placeholder="When are you available for this event?"
            placeholderTextColor="hsl(0, 0%, 50%)"
            value={formData.availability}
            onChangeText={(value) => updateField("availability", value)}
          />
          {errors.availability && (
            <Text style={styles.errorText}>{errors.availability}</Text>
          )}
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Equipment & Setup</Text>
          <TextInput
            style={styles.textArea}
            placeholder="What equipment do you bring? Any special requirements?"
            placeholderTextColor="hsl(0, 0%, 50%)"
            value={formData.equipment}
            onChangeText={(value) => updateField("equipment", value)}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Rate & Payment</Text>
          <TextInput
            style={styles.textInput}
            placeholder="e.g. £250, 250–300, negotiable (optional)"
            placeholderTextColor="hsl(0, 0%, 50%)"
            value={formData.rate}
            onChangeText={(value) => updateField("rate", value)}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Portfolio Links</Text>
          <TextInput
            style={styles.textInput}
            placeholder="SoundCloud, Mixcloud, or other portfolio links (optional)"
            placeholderTextColor="hsl(0, 0%, 50%)"
            value={formData.portfolio}
            onChangeText={(value) => updateField("portfolio", value)}
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Message to Organizer</Text>
          <TextInput
            style={[styles.textArea, errors.message && styles.inputError]}
            placeholder="Why are you perfect for this opportunity? What makes you stand out?"
            placeholderTextColor="hsl(0, 0%, 50%)"
            value={formData.message}
            onChangeText={(value) => updateField("message", value)}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          {errors.message && (
            <Text style={styles.errorText}>{errors.message}</Text>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            busy && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={busy}
        >
          <Text style={styles.submitButtonText}>
            {busy ? "Submitting..." : "Submit Application"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "hsl(0, 0%, 8%)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "hsl(0, 0%, 15%)",
  },
  closeButton: {
    padding: 8,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
    marginBottom: 4,
    flexShrink: 1,
  },
  invalidContainer: {
    justifyContent: "flex-start",
  },
  invalidBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    justifyContent: "center",
  },
  invalidTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 100%)",
  },
  invalidText: {
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 70%)",
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  formSection: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    color: "hsl(75, 100%, 60%)",
    marginBottom: 12,
  },
  textInput: {
    backgroundColor: "hsl(0, 0%, 12%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
    minHeight: 50,
  },
  textArea: {
    backgroundColor: "hsl(0, 0%, 12%)",
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 20%)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 0%, 100%)",
    minHeight: 100,
  },
  inputError: {
    borderColor: "hsl(0, 100%, 50%)",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Helvetica Neue",
    color: "hsl(0, 100%, 50%)",
    marginTop: 8,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "hsl(0, 0%, 15%)",
  },
  submitButton: {
    backgroundColor: "hsl(75, 100%, 60%)",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitButtonDisabled: {
    backgroundColor: "hsl(0, 0%, 30%)",
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: "TS Block Bold",
    color: "hsl(0, 0%, 8%)",
  },
});
