/**
 * Location modal state + update handlers for Connections screen.
 * Split from useConnectionsActions so location changes don't couple to connection mutations.
 *
 * Nearby list reloads live on discoverData (same source as useDiscoverData / discoverLoaders).
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { Alert } from "react-native";
import { db } from "../lib/supabase";
import { HapticPatterns } from "../lib/haptics";

export function useConnectionsLocationActions(connectionsData, discoverData) {
  const user = connectionsData?.user;
  const setUser = connectionsData?.setUser;
  const loadNearbyDJs = discoverData?.loadNearbyDJs;
  const loadNearbyOpportunities = discoverData?.loadNearbyOpportunities;

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newLocationCity, setNewLocationCity] = useState("");
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [showLocationSuccessModal, setShowLocationSuccessModal] = useState(false);

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleOpenLocationModal = useCallback(() => {
    setNewLocationCity(user?.city || "");
    setShowLocationModal(true);
  }, [user?.city]);

  const handleUpdateLocation = useCallback(async () => {
    const city = newLocationCity?.trim();
    if (!city || !user?.id) return;

    try {
      setUpdatingLocation(true);

      await db.updateUserProfile(user.id, { city });

      if (!mountedRef.current) return;
      setUser?.((prev) => (prev ? { ...prev, city } : prev));

      // Best-effort: DB update already succeeded; don’t fail the UX if a list refresh rejects.
      await Promise.allSettled([
        loadNearbyDJs?.(),
        loadNearbyOpportunities?.(),
      ]);

      if (!mountedRef.current) return;
      setShowLocationModal(false);
      setNewLocationCity("");
      HapticPatterns.success();
      setShowLocationSuccessModal(true);
    } catch (error) {
      console.error("Error updating location:", error);
      if (mountedRef.current) {
        Alert.alert("Error", "Failed to update location. Please try again.");
      }
    } finally {
      if (mountedRef.current) {
        setUpdatingLocation(false);
      }
    }
  }, [newLocationCity, user?.id, setUser, loadNearbyDJs, loadNearbyOpportunities]);

  const handleUseCurrentLocation = useCallback(async () => {
    if (updatingLocation) return;
    try {
      const { getCurrentLocation, reverseGeocode } = await import(
        "../lib/locationService"
      );
      const { getGooglePlacesApiKey } = await import("../lib/googlePlacesConfig");
      const { reverseGeocodeLatLngWithGoogle } = await import(
        "../lib/googlePlacesClient"
      );

      const location = await getCurrentLocation();
      if (!location) {
        Alert.alert(
          "Location Unavailable",
          "Could not get your current location. Please enter your city manually."
        );
        return;
      }

      const apiKey = getGooglePlacesApiKey();
      let city = null;
      if (apiKey) {
        try {
          city = await reverseGeocodeLatLngWithGoogle(
            location.latitude,
            location.longitude,
            apiKey
          );
        } catch (geocodeErr) {
          if (__DEV__) {
            console.warn("[useConnectionsLocationActions] Google geocode:", geocodeErr);
          }
        }
      }

      if (!city) {
        city = await reverseGeocode(location.latitude, location.longitude);
      }

      if (!city) {
        Alert.alert(
          "Location Unavailable",
          "Could not determine your city. Please enter it manually."
        );
        return;
      }
      if (mountedRef.current) {
        setNewLocationCity(city);
      }
    } catch (error) {
      console.error("Error getting current location:", error);
      Alert.alert(
        "Error",
        "Failed to get your location. Please enter your city manually."
      );
    }
  }, [updatingLocation]);

  return {
    showLocationModal,
    setShowLocationModal,
    newLocationCity,
    setNewLocationCity,
    updatingLocation,
    showLocationSuccessModal,
    setShowLocationSuccessModal,
    handleOpenLocationModal,
    handleUpdateLocation,
    handleUseCurrentLocation,
  };
}
