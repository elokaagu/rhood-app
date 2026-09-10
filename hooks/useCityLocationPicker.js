import { useCallback, useState } from "react";
import { Alert } from "react-native";
import { resolveCurrentCityLabel } from "../lib/locationService";

/**
 * Shared city picker state for Edit Profile and onboarding.
 * Update commits locally (caller persists with the rest of the profile).
 */
export function useCityLocationPicker(currentCity, onCommitCity) {
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState("");
  const [updating, setUpdating] = useState(false);

  const open = useCallback(() => {
    setDraft(typeof currentCity === "string" ? currentCity : "");
    setVisible(true);
  }, [currentCity]);

  const close = useCallback(() => {
    if (updating) return;
    setVisible(false);
  }, [updating]);

  const save = useCallback(() => {
    const city = draft.trim();
    if (!city || updating) return;
    onCommitCity?.(city);
    setVisible(false);
  }, [draft, updating, onCommitCity]);

  const useCurrent = useCallback(async () => {
    if (updating) return;
    try {
      setUpdating(true);
      const city = await resolveCurrentCityLabel();
      if (!city) {
        Alert.alert(
          "Location Unavailable",
          "Could not determine your city. Please search for it instead."
        );
        return;
      }
      setDraft(city);
    } catch (error) {
      console.error("Error getting current city:", error);
      Alert.alert(
        "Error",
        "Failed to get your location. Please search for your city instead."
      );
    } finally {
      setUpdating(false);
    }
  }, [updating]);

  return {
    visible,
    draft,
    setDraft,
    updating,
    open,
    close,
    save,
    useCurrent,
  };
}
