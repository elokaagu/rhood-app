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
  Image,
  Modal,
  FlatList,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from "../lib/sharedStyles";
import { HapticPatterns } from "../lib/haptics";
import { MIX_GENRES } from "./upload/UploadMixPerfParts";
import {
  EMPTY_OPPORTUNITY_FORM,
  OPPORTUNITY_CURRENCIES,
  SKILL_LEVELS,
  submitOpportunity,
  uploadOpportunityImage,
  deleteOpportunityImage,
  validateOpportunityForm,
} from "../lib/opportunitySubmission";
import { track, AnalyticsEvents } from "../lib/analytics";
import { db } from "../lib/supabase";
import AppScreenTutorialModal from "./AppScreenTutorialModal";
import { useAppTutorialModal } from "../hooks/useAppTutorialModal";
import { APP_TUTORIAL_SCREEN_IDS } from "../lib/appTutorialContent";

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

const MONTH_OPTIONS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

function daysInMonth(month, year) {
  if (!month || !year) return 31;
  return new Date(Number(year), Number(month), 0).getDate();
}

function dayOptions(month, year) {
  const count = daysInMonth(month, year);
  return Array.from({ length: count }, (_, i) => {
    const day = String(i + 1).padStart(2, "0");
    return { value: day, label: day };
  });
}

/** This year plus next year — opportunities can't be dated in the past. */
function yearOptions() {
  const current = new Date().getFullYear();
  return [current, current + 1].map((y) => ({
    value: String(y),
    label: String(y),
  }));
}

/** 24h time-of-day in 30-minute steps, e.g. "22:00", "22:30". */
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const h = String(Math.floor(i / 2)).padStart(2, "0");
  const m = i % 2 === 0 ? "00" : "30";
  const value = `${h}:${m}`;
  return { value, label: value };
});

/** Start/end time are optional — "" maps to unset rather than a forced pick. */
const TIME_OPTIONS_WITH_UNSET = [{ value: "", label: "Not set" }, ...TIME_OPTIONS];

/**
 * Tap-to-open picker: shows the selected option's label (or placeholder),
 * opens a modal list on tap. Keeps values in the same "YYYY-MM-DD"/"HH:MM"
 * string shapes lib/opportunitySubmission.js already expects — this only
 * changes how the user enters them, not what's stored.
 */
function Dropdown({ value, options, placeholder, onSelect, disabled, error }) {
  const [open, setOpen] = useState(false);
  const selectedOption = options.find((o) => o.value === value);

  return (
    <>
      <TouchableOpacity
        style={[styles.input, styles.dropdownInput, error && styles.inputError]}
        onPress={() => {
          HapticPatterns.buttonPress();
          setOpen(true);
        }}
        disabled={disabled}
        activeOpacity={0.8}
        accessibilityRole="button"
      >
        <Text
          style={
            selectedOption ? styles.dropdownValueText : styles.dropdownPlaceholderText
          }
          numberOfLines={1}
        >
          {selectedOption ? selectedOption.label : placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.textTertiary} />
      </TouchableOpacity>

      {open ? (
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <TouchableOpacity
          style={styles.dropdownOverlay}
          activeOpacity={1}
          onPress={() => setOpen(false)}
        >
          <View style={styles.dropdownSheet}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              initialScrollIndex={
                selectedOption
                  ? Math.max(0, options.findIndex((o) => o.value === value) - 3)
                  : 0
              }
              getItemLayout={(_, index) => ({
                length: 48,
                offset: 48 * index,
                index,
              })}
              renderItem={({ item }) => {
                const active = item.value === value;
                return (
                  <TouchableOpacity
                    style={[
                      styles.dropdownOption,
                      active && styles.dropdownOptionActive,
                    ]}
                    onPress={() => {
                      HapticPatterns.buttonPress();
                      onSelect(item.value);
                      setOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        active && styles.dropdownOptionTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {active ? (
                      <Ionicons
                        name="checkmark"
                        size={18}
                        color={COLORS.primary}
                      />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>
      ) : null}
    </>
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
  const [localImageUri, setLocalImageUri] = useState(null);
  const [pendingImageAsset, setPendingImageAsset] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState(null);
  // Storage path of the currently-uploaded image, so replacing/removing it
  // can clean up the superseded object instead of leaving it orphaned.
  const [uploadedImagePath, setUploadedImagePath] = useState(null);
  // Day/month/year are the UI state; form.eventDate ("YYYY-MM-DD") is
  // derived from them and written on every change, so validation and
  // submission never need to know dropdowns are involved at all.
  const [dateParts, setDateParts] = useState({ day: "", month: "", year: "" });
  const contentFadeAnim = useRef(new Animated.Value(0)).current;
  const { tutorialModalProps } = useAppTutorialModal(
    APP_TUTORIAL_SCREEN_IDS.CREATE_OPPORTUNITY
  );
  // Ref mirror so uploadImage/removeImage always see the latest uploaded
  // path without needing it in their dependency arrays.
  const uploadedImagePathRef = useRef(null);
  useEffect(() => {
    uploadedImagePathRef.current = uploadedImagePath;
  }, [uploadedImagePath]);

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

  const setDatePart = useCallback(
    (part, value) => {
      setDateParts((prev) => {
        const next = { ...prev, [part]: value };
        // Clamp the day if it doesn't exist in the newly picked month/year
        // (e.g. 31st selected, then switching to February).
        const maxDay = daysInMonth(next.month, next.year);
        if (next.day && Number(next.day) > maxDay) {
          next.day = String(maxDay).padStart(2, "0");
        }
        const complete = next.day && next.month && next.year;
        setField(
          "eventDate",
          complete ? `${next.year}-${next.month}-${next.day}` : ""
        );
        return next;
      });
    },
    [setField]
  );

  const canSubmit = useMemo(
    () => validateOpportunityForm(form).valid,
    [form]
  );

  /** Upload a local image URI. Called on first pick or retry — optional field,
   * so a failed upload never blocks submission, just leaves image_url blank. */
  const uploadImage = useCallback(
    async (asset) => {
      setUploadingImage(true);
      setImageUploadError(null);
      try {
        const { path, publicUrl } = await uploadOpportunityImage(asset);
        const previousPath = uploadedImagePathRef.current;
        setField("imageUrl", publicUrl);
        setUploadedImagePath(path);
        // Clean up the object this one replaced, once the new one is
        // confirmed live — never delete before the replacement succeeds.
        if (previousPath && previousPath !== path) {
          deleteOpportunityImage(previousPath);
        }
      } catch (err) {
        console.error("Opportunity image upload failed:", err);
        setImageUploadError(err.message || "Upload failed. Tap retry to try again.");
        setPendingImageAsset(asset);
      } finally {
        setUploadingImage(false);
      }
    },
    [setField]
  );

  const openImagePicker = useCallback(
    async (source) => {
      try {
        let result;
        if (source === "camera") {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            Alert.alert(
              "Permission required",
              "Camera permission is needed to take a photo."
            );
            return;
          }
          result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 5],
            quality: 0.8,
          });
        } else {
          const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            Alert.alert(
              "Permission required",
              "Photo library permission is needed to select an image."
            );
            return;
          }
          result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 5],
            quality: 0.8,
          });
        }

        if (!result.canceled && result.assets?.[0]) {
          const picked = result.assets[0];
          const asset = {
            uri: picked.uri,
            mimeType: picked.mimeType,
            fileName: picked.fileName,
          };
          HapticPatterns.success();
          setLocalImageUri(asset.uri);
          setPendingImageAsset(null);
          setImageUploadError(null);
          // Clear the previous image's URL immediately, not just on success —
          // otherwise a failed replacement upload leaves the old photo's URL
          // (and its "success" badge) showing next to a preview of the new,
          // broken one, and that stale URL is what would actually get saved.
          setField("imageUrl", "");
          uploadImage(asset);
        }
      } catch (err) {
        console.error("Image picker error:", err);
        Alert.alert("Couldn't open picker", "Please try again.");
      }
    },
    [uploadImage, setField]
  );

  const removeImage = useCallback(() => {
    const pathToDelete = uploadedImagePathRef.current;
    setLocalImageUri(null);
    setPendingImageAsset(null);
    setImageUploadError(null);
    setUploadedImagePath(null);
    setField("imageUrl", "");
    if (pathToDelete) deleteOpportunityImage(pathToDelete);
  }, [setField]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    if (uploadingImage) {
      Alert.alert(
        "Image still uploading",
        "Give it a moment to finish, or tap the image and remove it to submit without one."
      );
      return;
    }

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
      setLocalImageUri(null);
      setPendingImageAsset(null);
      setImageUploadError(null);
      // Not deleted — it's now attached to the submitted row. Just stop
      // tracking it locally so a later "replace" in a fresh form session
      // doesn't try to clean up an image that belongs to this submission.
      setUploadedImagePath(null);
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
  }, [form, submitting, uploadingImage, user?.id, organizerFallback, onSubmitted]);

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
                hint="Set, crowd, equipment provided, what you're looking for. At least 20 characters."
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

              <Field label="Event date *" error={fieldErrors.eventDate}>
                <View style={styles.row}>
                  <View style={styles.dateColDay}>
                    <Dropdown
                      value={dateParts.day}
                      options={dayOptions(dateParts.month, dateParts.year)}
                      placeholder="Day"
                      onSelect={(v) => setDatePart("day", v)}
                      disabled={submitting}
                      error={fieldErrors.eventDate}
                    />
                  </View>
                  <View style={styles.dateColMonth}>
                    <Dropdown
                      value={dateParts.month}
                      options={MONTH_OPTIONS}
                      placeholder="Month"
                      onSelect={(v) => setDatePart("month", v)}
                      disabled={submitting}
                      error={fieldErrors.eventDate}
                    />
                  </View>
                  <View style={styles.dateColYear}>
                    <Dropdown
                      value={dateParts.year}
                      options={yearOptions()}
                      placeholder="Year"
                      onSelect={(v) => setDatePart("year", v)}
                      disabled={submitting}
                      error={fieldErrors.eventDate}
                    />
                  </View>
                </View>
              </Field>

              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Field label="Start time" error={fieldErrors.startTime}>
                    <Dropdown
                      value={form.startTime}
                      options={TIME_OPTIONS_WITH_UNSET}
                      placeholder="Not set"
                      onSelect={(v) => setField("startTime", v)}
                      disabled={submitting}
                      error={fieldErrors.startTime}
                    />
                  </Field>
                </View>
                <View style={styles.rowItem}>
                  <Field label="End time" error={fieldErrors.endTime}>
                    <Dropdown
                      value={form.endTime}
                      options={TIME_OPTIONS_WITH_UNSET}
                      placeholder="Not set"
                      onSelect={(v) => setField("endTime", v)}
                      disabled={submitting}
                      error={fieldErrors.endTime}
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

          {/* ── Step 5: cover image (optional) ───────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionCard}>
              <Text style={styles.sectionKicker}>Step 5</Text>
              <Text style={styles.sectionTitle}>Cover Image</Text>
              <Text style={styles.sectionSubtitle} {...androidSubtitleTextProps}>
                Optional — a real photo helps your opportunity stand out in the
                deck. Without one, a genre-themed placeholder is used instead.
              </Text>

              {localImageUri ? (
                <TouchableOpacity
                  style={styles.imagePreviewWrap}
                  onPress={() => openImagePicker("library")}
                  disabled={uploadingImage}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel="Change cover image"
                >
                  <Image
                    source={{ uri: localImageUri }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  {uploadingImage ? (
                    <View style={styles.imageOverlay}>
                      <ActivityIndicator size="small" color={COLORS.primary} />
                      <Text style={styles.imageOverlayText}>Uploading…</Text>
                    </View>
                  ) : form.imageUrl ? (
                    <View style={styles.imageSuccessBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={COLORS.primary}
                      />
                    </View>
                  ) : null}
                  {!uploadingImage && (
                    <TouchableOpacity
                      style={styles.imageRemoveButton}
                      onPress={removeImage}
                      accessibilityRole="button"
                      accessibilityLabel="Remove image"
                    >
                      <Ionicons
                        name="close-circle"
                        size={26}
                        color={COLORS.textPrimary}
                      />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.imagePickerButton}
                    onPress={() => openImagePicker("library")}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Add a cover image"
                  >
                    <Ionicons
                      name="image-outline"
                      size={28}
                      color={COLORS.textTertiary}
                    />
                    <Text style={styles.imagePickerText}>
                      Tap to add a photo
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.imageCameraLink}
                    onPress={() => openImagePicker("camera")}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Take a photo"
                  >
                    <Ionicons
                      name="camera-outline"
                      size={16}
                      color={COLORS.textTertiary}
                    />
                    <Text style={styles.imageCameraLinkText}>
                      Or take a photo
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {imageUploadError ? (
                <>
                  <Text style={styles.errorText}>{imageUploadError}</Text>
                  <TouchableOpacity
                    style={[
                      styles.retryButton,
                      uploadingImage && styles.submitButtonDisabled,
                    ]}
                    onPress={() =>
                      pendingImageAsset && uploadImage(pendingImageAsset)
                    }
                    disabled={uploadingImage}
                    accessibilityRole="button"
                    accessibilityLabel="Retry image upload"
                  >
                    <Ionicons
                      name="refresh"
                      size={16}
                      color={COLORS.background}
                    />
                    <Text style={styles.retryButtonText}>Retry upload</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (submitting || uploadingImage || !canSubmit) &&
                styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={submitting || uploadingImage}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel="Submit opportunity for review"
          >
            <LinearGradient
              colors={
                submitting || uploadingImage || !canSubmit
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

      {tutorialModalProps ? (
        <AppScreenTutorialModal {...tutorialModalProps} />
      ) : null}
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
  dropdownInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownValueText: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.lg,
    fontFamily: TYPOGRAPHY.primary,
  },
  dropdownPlaceholderText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.lg,
    fontFamily: TYPOGRAPHY.primary,
  },
  dropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  dropdownSheet: {
    backgroundColor: COLORS.backgroundSecondary,
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxHeight: 340,
    paddingBottom: SPACING.lg,
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownOptionActive: {
    backgroundColor: "rgba(204, 255, 0, 0.08)",
  },
  dropdownOptionText: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.lg,
    fontFamily: TYPOGRAPHY.primary,
  },
  dropdownOptionTextActive: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.weightBold,
  },
  dateColDay: {
    flex: 1,
  },
  dateColMonth: {
    flex: 1.6,
  },
  dateColYear: {
    flex: 1.2,
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
  imagePickerButton: {
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: COLORS.borderLight,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.backgroundTertiary,
  },
  imagePickerText: {
    color: COLORS.textTertiary,
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
  },
  imageCameraLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  imageCameraLinkText: {
    color: COLORS.textTertiary,
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
    textDecorationLine: "underline",
  },
  imagePreviewWrap: {
    borderRadius: RADIUS.md,
    overflow: "hidden",
    aspectRatio: 4 / 5,
    backgroundColor: COLORS.backgroundTertiary,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
  },
  imageOverlayText: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
  },
  imageSuccessBadge: {
    position: "absolute",
    top: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderRadius: RADIUS.full,
    padding: SPACING.xs,
  },
  imageRemoveButton: {
    position: "absolute",
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    borderRadius: RADIUS.full,
    padding: SPACING.xs,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.base,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.sm,
    alignSelf: "flex-start",
  },
  retryButtonText: {
    color: COLORS.background,
    fontSize: TYPOGRAPHY.sm,
    fontFamily: TYPOGRAPHY.primary,
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
