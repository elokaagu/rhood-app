import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Animated,
  Alert,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "../lib/sharedStyles";
import { HapticPatterns } from "../lib/haptics";
import { MIX_GENRES } from "./upload/UploadMixPerfParts";
import {
  EMPTY_OPPORTUNITY_FORM,
  OPPORTUNITY_CURRENCIES,
  SKILL_LEVELS,
  submitOpportunity,
  validateOpportunityForm,
} from "../lib/opportunitySubmission";
import { track, AnalyticsEvents } from "../lib/analytics";
import { db } from "../lib/supabase";

const androidSubtitleTextProps =
  Platform.OS === "android" ? { includeFontPadding: false } : {};

/** Label + input + inline error. Keeps each field's markup to one line at the call site. */
function Field({
  label,
  error,
  hint,
  children,
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {hint && !error ? (
        <Text style={styles.hint} {...androidSubtitleTextProps}>
          {hint}
        </Text>
      ) : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function ChipRow({ options, selected, onSelect, disabled }) {
  return (
    <View style={styles.chipWrap}>
      {options.map(({ value, label }) => {
        const active = selected === value;
        return (
          <TouchableOpacity
            key={value}
            style={[styles.chip, active && styles.chipSelected]}
            onPress={() => {
              HapticPatterns.buttonPress();
              onSelect(value);
            }}
            disabled={disabled}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.chipText, active && styles.chipTextSelected]}>
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/**
 * Submits a gig into the opportunity deck. Submissions are held for review
 * (see lib/opportunitySubmission.js) — they don't appear to other DJs until
 * an admin approves them.
 */
export default function CreateOpportunityScreen({ user, onBack, onSubmitted }) {
  const [form, setForm] = useState(EMPTY_OPPORTUNITY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [organizerFallback, setOrganizerFallback] = useState("");
  const contentFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(contentFadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [contentFadeAnim]);

  // The session user only carries dj_name if Edit Profile was saved this
  // session, so read the profile for the organiser fallback we promise below.
  useEffect(() => {
    let cancelled = false;
    const fromSession = user?.user_metadata?.dj_name;
    if (fromSession) {
      setOrganizerFallback(fromSession);
      return undefined;
    }
    if (!user?.id) return undefined;
    db.getUserProfile(user.id)
      .then((profile) => {
        if (!cancelled) setOrganizerFallback(profile?.dj_name || "");
      })
      .catch(() => {
        /* fallback stays blank — organizer_name just posts as null */
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.user_metadata?.dj_name]);

  const setField = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const canSubmit = useMemo(
    () => validateOpportunityForm(form).valid,
    [form]
  );

  const handleSubmit = useCallback(async () => {
    if (submitting) return;

    const { valid, errors } = validateOpportunityForm(form);
    if (!valid) {
      setFieldErrors(errors);
      HapticPatterns.error();
      Alert.alert("Check the form", Object.values(errors)[0]);
      return;
    }

    setSubmitting(true);
    HapticPatterns.primaryButtonPress();
    // Never mutate React state inside the submit pipeline.
    const snapshot = { ...form };

    try {
      const record = await submitOpportunity(
        snapshot,
        user?.id,
        organizerFallback
      );
      HapticPatterns.success();
      // Not awaited: analytics must not delay the confirmation.
      void track(AnalyticsEvents.OPPORTUNITY_SUBMITTED, {
        genre: snapshot.genre,
        city: snapshot.city,
        skill_level: snapshot.skillLevel,
        has_fee: Boolean(snapshot.payment),
      });
      // Clear before the alert: Alert.alert is non-blocking, so the form must
      // not sit re-enabled holding the values we just submitted.
      setForm(EMPTY_OPPORTUNITY_FORM);
      setFieldErrors({});
      Alert.alert(
        "Submitted for review",
        "Thanks! Our team will review your opportunity and publish it to the deck shortly. You'll be notified once it's live.",
        [
          { text: "OK", onPress: () => onSubmitted?.(record) },
        ]
      );
    } catch (error) {
      console.error("Opportunity submission failed:", error);
      HapticPatterns.error();
      if (error.fieldErrors) setFieldErrors(error.fieldErrors);
      Alert.alert(
        error.alertTitle || "Submission failed",
        error.message || "Could not submit the opportunity. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }, [form, submitting, user?.id, organizerFallback, onSubmitted]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>New Opportunity</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Animated.View style={{ opacity: contentFadeAnim }}>
          <View style={styles.reviewNotice}>
            <Ionicons
              name="shield-checkmark-outline"
              size={18}
              color={COLORS.primary}
            />
            <Text style={styles.reviewNoticeText} {...androidSubtitleTextProps}>
              Every submission is reviewed by the R/HOOD team before it reaches
              the deck. This keeps the opportunity feed trustworthy for DJs.
            </Text>
          </View>

          {/* ── Step 1: basics ───────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionKicker}>Step 1</Text>
              <Text style={styles.sectionTitle}>The Basics</Text>
              <Text style={styles.sectionSubtitle} {...androidSubtitleTextProps}>
                Title and description are what DJs see on the swipe card.
              </Text>

              <Field label="Title *" error={fieldErrors.title}>
                <TextInput
                  style={[styles.input, fieldErrors.title && styles.inputError]}
                  placeholder="e.g. Friday Night Resident DJ"
                  placeholderTextColor={COLORS.textMuted}
                  value={form.title}
                  onChangeText={(text) => setField("title", text)}
                  editable={!submitting}
                  maxLength={120}
                />
              </Field>

              <Field
                label="Description *"
                error={fieldErrors.description}
                hint="Set, crowd, equipment provided, what you're looking for."
              >
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    fieldErrors.description && styles.inputError,
                  ]}
                  placeholder="Tell DJs about the night..."
                  placeholderTextColor={COLORS.textMuted}
                  value={form.description}
                  onChangeText={(text) => setField("description", text)}
                  multiline
                  numberOfLines={5}
                  editable={!submitting}
                  maxLength={2000}
                />
              </Field>

              <Field
                label="Organiser / promoter name"
                hint={
                  organizerFallback
                    ? `Shown on the opportunity. Leave blank to post as ${organizerFallback}.`
                    : "Shown on the opportunity. Optional."
                }
              >
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Sub Club Presents"
                  placeholderTextColor={COLORS.textMuted}
                  value={form.organizerName}
                  onChangeText={(text) => setField("organizerName", text)}
                  editable={!submitting}
                />
              </Field>
            </View>
          </View>

          {/* ── Step 2: when ─────────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionKicker}>Step 2</Text>
              <Text style={styles.sectionTitle}>When</Text>
              <Text style={styles.sectionSubtitle} {...androidSubtitleTextProps}>
                Set times are optional, but they help DJs check availability.
              </Text>

              <Field
                label="Event date *"
                error={fieldErrors.eventDate}
                hint="Format: YYYY-MM-DD"
              >
                <TextInput
                  style={[
                    styles.input,
                    fieldErrors.eventDate && styles.inputError,
                  ]}
                  placeholder="2026-08-14"
                  placeholderTextColor={COLORS.textMuted}
                  value={form.eventDate}
                  onChangeText={(text) => setField("eventDate", text)}
                  editable={!submitting}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />
              </Field>

              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Field label="Start time" error={fieldErrors.startTime}>
                    <TextInput
                      style={[
                        styles.input,
                        fieldErrors.startTime && styles.inputError,
                      ]}
                      placeholder="22:00"
                      placeholderTextColor={COLORS.textMuted}
                      value={form.startTime}
                      onChangeText={(text) => setField("startTime", text)}
                      editable={!submitting}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                  </Field>
                </View>
                <View style={styles.rowItem}>
                  <Field label="End time" error={fieldErrors.endTime}>
                    <TextInput
                      style={[
                        styles.input,
                        fieldErrors.endTime && styles.inputError,
                      ]}
                      placeholder="03:00"
                      placeholderTextColor={COLORS.textMuted}
                      value={form.endTime}
                      onChangeText={(text) => setField("endTime", text)}
                      editable={!submitting}
                      keyboardType="numbers-and-punctuation"
                      maxLength={5}
                    />
                  </Field>
                </View>
              </View>
            </View>
          </View>

          {/* ── Step 3: where ────────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionKicker}>Step 3</Text>
              <Text style={styles.sectionTitle}>Where</Text>
              <Text style={styles.sectionSubtitle} {...androidSubtitleTextProps}>
                City is used to surface the gig to nearby DJs.
              </Text>

              <Field label="Venue *" error={fieldErrors.venue}>
                <TextInput
                  style={[styles.input, fieldErrors.venue && styles.inputError]}
                  placeholder="e.g. Corsica Studios"
                  placeholderTextColor={COLORS.textMuted}
                  value={form.venue}
                  onChangeText={(text) => setField("venue", text)}
                  editable={!submitting}
                />
              </Field>

              <Field label="City *" error={fieldErrors.city}>
                <TextInput
                  style={[styles.input, fieldErrors.city && styles.inputError]}
                  placeholder="e.g. London"
                  placeholderTextColor={COLORS.textMuted}
                  value={form.city}
                  onChangeText={(text) => setField("city", text)}
                  editable={!submitting}
                />
              </Field>

              <Field
                label="Area / address"
                hint="Optional. Defaults to the city if left blank."
              >
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Elephant & Castle"
                  placeholderTextColor={COLORS.textMuted}
                  value={form.location}
                  onChangeText={(text) => setField("location", text)}
                  editable={!submitting}
                />
              </Field>
            </View>
          </View>

          {/* ── Step 4: details ──────────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionKicker}>Step 4</Text>
              <Text style={styles.sectionTitle}>The Details</Text>
              <Text style={styles.sectionSubtitle} {...androidSubtitleTextProps}>
                Genre and fee drive how well this matches DJs on the platform.
              </Text>

              <Text style={styles.label}>Genre *</Text>
              <ChipRow
                options={MIX_GENRES.map((g) => ({ value: g, label: g }))}
                selected={form.genre}
                onSelect={(value) => setField("genre", value)}
                disabled={submitting}
              />
              {fieldErrors.genre ? (
                <Text style={styles.errorText}>{fieldErrors.genre}</Text>
              ) : null}

              <Text style={[styles.label, styles.labelSpaced]}>
                Experience level
              </Text>
              <ChipRow
                options={SKILL_LEVELS}
                selected={form.skillLevel}
                onSelect={(value) => setField("skillLevel", value)}
                disabled={submitting}
              />

              <View style={styles.labelSpaced}>
                <Field
                  label="Fee"
                  error={fieldErrors.payment}
                  hint="Leave blank if this is unpaid or negotiable."
                >
                  <TextInput
                    style={[
                      styles.input,
                      fieldErrors.payment && styles.inputError,
                    ]}
                    placeholder="e.g. 250"
                    placeholderTextColor={COLORS.textMuted}
                    value={form.payment}
                    onChangeText={(text) => setField("payment", text)}
                    editable={!submitting}
                    keyboardType="numeric"
                  />
                </Field>
              </View>

              <Text style={styles.label}>Currency</Text>
              <ChipRow
                options={OPPORTUNITY_CURRENCIES.map((c) => ({
                  value: c,
                  label: c,
                }))}
                selected={form.paymentCurrency}
                onSelect={(value) => setField("paymentCurrency", value)}
                disabled={submitting}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (submitting || !canSubmit) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting || !canSubmit}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Submit opportunity for review"
          >
            <LinearGradient
              colors={
                submitting || !canSubmit
                  ? [COLORS.borderLight, COLORS.borderDark]
                  : [COLORS.primary, COLORS.primaryDark]
              }
              style={styles.submitButtonGradient}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={COLORS.background} />
              ) : (
                <>
                  <Ionicons
                    name="megaphone"
                    size={22}
                    color={COLORS.background}
                  />
                  <Text style={styles.submitButtonText}>Submit for review</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    padding: SPACING.xs,
  },
  headerContent: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.xl,
    fontFamily: TYPOGRAPHY.bold,
    color: COLORS.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: 120,
  },
  reviewNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    backgroundColor: "rgba(204, 255, 0, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(204, 255, 0, 0.35)",
    borderRadius: RADIUS.md,
    padding: SPACING.base,
    marginBottom: SPACING.lg,
  },
  reviewNoticeText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    lineHeight: 20,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionCard: {
    backgroundColor: COLORS.backgroundSecondary,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionKicker: {
    fontSize: TYPOGRAPHY.xs,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.semibold,
    color: COLORS.textTertiary,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: SPACING.xs,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.lg,
    fontFamily: TYPOGRAPHY.bold,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sm,
    marginBottom: SPACING.base,
    fontFamily: TYPOGRAPHY.primary,
    lineHeight: 22,
    paddingVertical: 2,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.semibold,
    marginBottom: SPACING.sm,
    fontFamily: TYPOGRAPHY.primary,
  },
  labelSpaced: {
    marginTop: SPACING.base,
  },
  input: {
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: RADIUS.base,
    padding: SPACING.base,
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontFamily: TYPOGRAPHY.primary,
  },
  inputError: {
    borderColor: COLORS.error,
  },
  textArea: {
    minHeight: 110,
    textAlignVertical: "top",
  },
  hint: {
    color: COLORS.textTertiary,
    fontSize: TYPOGRAPHY.xs,
    fontFamily: TYPOGRAPHY.primary,
    marginTop: SPACING.xs,
    lineHeight: 16,
  },
  errorText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.xs,
    fontFamily: TYPOGRAPHY.primary,
    marginTop: SPACING.xs,
  },
  row: {
    flexDirection: "row",
    gap: SPACING.base,
  },
  rowItem: {
    flex: 1,
  },
  chipWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  chip: {
    backgroundColor: COLORS.backgroundTertiary,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: "rgba(204, 255, 0, 0.12)",
    borderColor: COLORS.primary,
    borderWidth: 1.5,
  },
  chipText: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sm,
    fontWeight: TYPOGRAPHY.medium,
    fontFamily: TYPOGRAPHY.primary,
  },
  chipTextSelected: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.weightBold,
  },
  submitButton: {
    borderRadius: RADIUS.md,
    overflow: "hidden",
    marginTop: SPACING.sm,
    minHeight: 56,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.55,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.base,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
    minHeight: 56,
  },
  submitButtonText: {
    color: COLORS.background,
    fontSize: TYPOGRAPHY.lg,
    fontFamily: TYPOGRAPHY.primary,
    fontWeight: TYPOGRAPHY.weightBold,
  },
});
