import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";

/**
 * Debounced header search + profile suggestions for ConnectionsScreen.
 */
export function useConnectionsScreenSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef(null);

  const fetchSearchSuggestions = useCallback(async (query) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < 2) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, dj_name, full_name, username, city, profile_image_url")
        .or(
          `dj_name.ilike.%${trimmedQuery}%,full_name.ilike.%${trimmedQuery}%,username.ilike.%${trimmedQuery}%,city.ilike.%${trimmedQuery}%`
        )
        .not("dj_name", "is", null)
        .limit(8);
      if (error) {
        setSearchSuggestions([]);
        setShowSuggestions(false);
        return;
      }
      setSearchSuggestions(
        (data || []).map((u) => ({
          id: u.id,
          name: u.dj_name || u.full_name || u.username || "DJ",
          city: u.city || null,
          profileImage: u.profile_image_url || null,
        }))
      );
      setShowSuggestions(true);
    } catch {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length >= 2) {
      searchTimeoutRef.current = setTimeout(
        () => fetchSearchSuggestions(trimmedQuery),
        300
      );
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, fetchSearchSuggestions]);

  return {
    searchQuery,
    setSearchQuery,
    searchSuggestions,
    setSearchSuggestions,
    showSuggestions,
    setShowSuggestions,
  };
}
