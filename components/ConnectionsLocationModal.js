import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "./ConnectionsScreen.styles";
import { getGooglePlacesApiKey } from "../lib/googlePlacesConfig";
import {
  fetchCityPredictions,
  resolveCityLabelFromPlaceId,
} from "../lib/googlePlacesClient";

function randomSessionToken() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function ConnectionsLocationModal({
  visible,
  onClose,
  newLocationCity,
  setNewLocationCity,
  updatingLocation,
  onUpdateLocation,
  onUseCurrentLocation,
}) {
  const placesKey = getGooglePlacesApiKey();
  const sessionTokenRef = useRef(randomSessionToken());
  const abortRef = useRef(null);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  const [fieldFocused, setFieldFocused] = useState(false);
  const fieldFocusedRef = useRef(false);
  const [predictions, setPredictions] = useState([]);
  const [predictionsLoading, setPredictionsLoading] = useState(false);
  const [resolvingPlaceId, setResolvingPlaceId] = useState(null);

  useEffect(() => {
    fieldFocusedRef.current = fieldFocused;
  }, [fieldFocused]);

  const handleClose = () => {
    if (updatingLocation) return;
    onClose();
  };

  useEffect(() => {
    if (visible) {
      sessionTokenRef.current = randomSessionToken();
      setPredictions([]);
      setFieldFocused(false);
    } else {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      setPredictions([]);
      setPredictionsLoading(false);
      setResolvingPlaceId(null);
    }
  }, [visible]);

  const runAutocomplete = useCallback(
    (query) => {
      if (!placesKey || !fieldFocused) return;
      const q = query.trim();
      if (q.length < 2) {
        setPredictions([]);
        setPredictionsLoading(false);
        return;
      }

      if (abortRef.current) {
        abortRef.current.abort();
      }
      const ac = new AbortController();
      abortRef.current = ac;
      setPredictionsLoading(true);

      fetchCityPredictions(q, placesKey, sessionTokenRef.current, ac.signal)
        .then((list) => {
          if (!ac.signal.aborted && fieldFocusedRef.current) {
            setPredictions(list);
          }
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          if (__DEV__) console.warn("[ConnectionsLocationModal] autocomplete", err);
          if (!ac.signal.aborted && fieldFocusedRef.current) setPredictions([]);
        })
        .finally(() => {
          if (!ac.signal.aborted) {
            setPredictionsLoading(false);
          }
        });
    },
    [placesKey, fieldFocused]
  );

  useEffect(() => {
    if (!visible || !placesKey || !fieldFocused) {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      if (!fieldFocused) {
        setPredictions([]);
        setPredictionsLoading(false);
      }
      return undefined;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runAutocomplete(newLocationCity);
    }, 380);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [newLocationCity, visible, placesKey, fieldFocused, runAutocomplete]);

  const onPickPrediction = useCallback(
    async (item) => {
      if (!placesKey || updatingLocation) return;
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }

      setPredictions([]);
      setPredictionsLoading(false);
      setResolvingPlaceId(item.placeId);
      inputRef.current?.blur();
      setFieldFocused(false);

      try {
        const ac = new AbortController();
        const label = await resolveCityLabelFromPlaceId(
          item.placeId,
          placesKey,
          sessionTokenRef.current,
          ac.signal
        );
        setNewLocationCity(label.slice(0, 100));
        sessionTokenRef.current = randomSessionToken();
      } catch (e) {
        if (__DEV__) console.warn("[ConnectionsLocationModal] place details", e);
        const fallback = (item.description || item.title || "").slice(0, 100);
        if (fallback) setNewLocationCity(fallback);
      } finally {
        setResolvingPlaceId(null);
      }
    },
    [placesKey, updatingLocation, setNewLocationCity]
  );

  const showSuggestions =
    placesKey &&
    fieldFocused &&
    (predictions.length > 0 || predictionsLoading) &&
    newLocationCity.trim().length >= 2;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={styles.locationModalBackdrop}
          onPress={handleClose}
          accessibilityLabel="Dismiss"
          accessibilityRole="button"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.locationModalKeyboardAvoid}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 24}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Location</Text>
              <TouchableOpacity
                onPress={handleClose}
                disabled={updatingLocation}
                accessibilityState={{ disabled: updatingLocation }}
              >
                <Ionicons
                  name="close"
                  size={24}
                  color={
                    updatingLocation
                      ? "hsl(0, 0%, 40%)"
                      : "hsl(0, 0%, 100%)"
                  }
                />
              </TouchableOpacity>
            </View>
            <View style={styles.locationModalBody}>
              <Text style={styles.locationModalDescription}>
                Update your location to see opportunities and DJs near you
              </Text>
              <View style={styles.locationInputContainer}>
                <View style={localStyles.inputWrap}>
                  <TextInput
                    ref={inputRef}
                    style={[
                      styles.locationInput,
                      updatingLocation && localStyles.inputDisabled,
                    ]}
                    placeholder={
                      placesKey
                        ? "Search for a city…"
                        : "Enter city name (e.g., London, New York)"
                    }
                    placeholderTextColor="hsl(0, 0%, 50%)"
                    value={newLocationCity}
                    onChangeText={setNewLocationCity}
                    autoCapitalize="words"
                    maxLength={100}
                    editable={!updatingLocation}
                    onFocus={() => setFieldFocused(true)}
                    onBlur={() => {
                      setTimeout(() => setFieldFocused(false), 200);
                    }}
                  />
                  {placesKey && resolvingPlaceId ? (
                    <View style={localStyles.inputSpinner} pointerEvents="none">
                      <ActivityIndicator
                        size="small"
                        color="hsl(75, 100%, 60%)"
                      />
                    </View>
                  ) : null}
                </View>
                {showSuggestions ? (
                  <View style={localStyles.suggestionsBox}>
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled
                      style={localStyles.suggestionsScroll}
                      showsVerticalScrollIndicator={false}
                    >
                      {predictionsLoading && predictions.length === 0 ? (
                        <View style={localStyles.suggestionLoadingRow}>
                          <ActivityIndicator
                            size="small"
                            color="hsl(75, 100%, 60%)"
                          />
                          <Text style={localStyles.suggestionLoadingText}>
                            Searching…
                          </Text>
                        </View>
                      ) : null}
                      {predictions.map((p) => (
                        <TouchableOpacity
                          key={p.placeId}
                          style={localStyles.suggestionRow}
                          onPress={() => onPickPrediction(p)}
                          activeOpacity={0.65}
                          disabled={!!resolvingPlaceId}
                        >
                          <Ionicons
                            name="location-outline"
                            size={18}
                            color="hsl(75, 100%, 60%)"
                            style={localStyles.suggestionIcon}
                          />
                          <View style={localStyles.suggestionTextCol}>
                            <Text
                              style={localStyles.suggestionTitle}
                              numberOfLines={1}
                            >
                              {p.title}
                            </Text>
                            {p.subtitle ? (
                              <Text
                                style={localStyles.suggestionSubtitle}
                                numberOfLines={2}
                              >
                                {p.subtitle}
                              </Text>
                            ) : null}
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
                <TouchableOpacity
                  style={[
                    styles.useCurrentLocationButton,
                    updatingLocation && localStyles.actionDisabled,
                  ]}
                  onPress={onUseCurrentLocation}
                  activeOpacity={0.7}
                  disabled={updatingLocation}
                  accessibilityState={{ disabled: updatingLocation }}
                >
                  <Ionicons
                    name="locate"
                    size={20}
                    color={
                      updatingLocation
                        ? "hsl(0, 0%, 40%)"
                        : "hsl(75, 100%, 60%)"
                    }
                  />
                  <Text
                    style={[
                      styles.useCurrentLocationText,
                      updatingLocation && localStyles.mutedText,
                    ]}
                  >
                    Use Current
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.locationModalActions}>
                <TouchableOpacity
                  style={[
                    styles.locationModalCancelButton,
                    updatingLocation && localStyles.actionDisabled,
                  ]}
                  onPress={handleClose}
                  disabled={updatingLocation}
                >
                  <Text style={styles.locationModalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.locationModalSaveButton,
                    (!newLocationCity.trim() || updatingLocation) &&
                      styles.locationModalSaveButtonDisabled,
                  ]}
                  onPress={onUpdateLocation}
                  disabled={!newLocationCity.trim() || updatingLocation}
                >
                  {updatingLocation ? (
                    <ActivityIndicator size="small" color="hsl(0, 0%, 0%)" />
                  ) : (
                    <Text style={styles.locationModalSaveText}>Update</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  inputDisabled: {
    opacity: 0.6,
  },
  actionDisabled: {
    opacity: 0.55,
  },
  mutedText: {
    color: "hsl(0, 0%, 40%)",
  },
  inputWrap: {
    position: "relative",
    width: "100%",
  },
  inputSpinner: {
    position: "absolute",
    right: 14,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  suggestionsBox: {
    marginTop: 8,
    maxHeight: 220,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "hsl(0, 0%, 18%)",
    backgroundColor: "hsl(0, 0%, 8%)",
    overflow: "hidden",
  },
  suggestionsScroll: {
    maxHeight: 220,
  },
  suggestionLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  suggestionLoadingText: {
    color: "hsl(0, 0%, 55%)",
    fontSize: 14,
  },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "hsl(0, 0%, 18%)",
  },
  suggestionIcon: {
    marginRight: 10,
  },
  suggestionTextCol: {
    flex: 1,
    minWidth: 0,
  },
  suggestionTitle: {
    color: "hsl(0, 0%, 100%)",
    fontSize: 16,
    fontWeight: "600",
  },
  suggestionSubtitle: {
    color: "hsl(0, 0%, 55%)",
    fontSize: 13,
    marginTop: 2,
  },
});
