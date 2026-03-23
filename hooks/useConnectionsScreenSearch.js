import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";

const DEBOUNCE_MS = 300;
const MIN_QUERY_LEN = 2;

/**
 * Strip / neutralize characters that break PostgREST `.or(...)` comma-separated clauses
 * or act as ILIKE wildcards (%).
 */
export function sanitizeConnectionSearchQueryForIlike(raw) {
  if (typeof raw !== "string") return "";
  return raw
    .replace(/[%_]/g, " ")
    .replace(/[,()"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Debounced header search + profile suggestions for ConnectionsScreen.
 * Intent-based API (no raw suggestion setters); stale responses ignored.
 */
export function useConnectionsScreenSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);

  const searchTimeoutRef = useRef(null);
  const latestRequestRef = useRef(0);

  const fetchSearchSuggestions = useCallback(async (query) => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery || trimmedQuery.length < MIN_QUERY_LEN) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    const safeFragment = sanitizeConnectionSearchQueryForIlike(trimmedQuery);
    if (!safeFragment || safeFragment.length < MIN_QUERY_LEN) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      setSearchError(null);
      return;
    }

    const requestId = ++latestRequestRef.current;
    setIsSearching(true);
    setSearchError(null);

    try {
      const pattern = `%${safeFragment}%`;
      const { data, error } = await supabase
        .from("user_profiles")
        .select("id, dj_name, full_name, username, city, profile_image_url")
        .or(
          `dj_name.ilike.${pattern},full_name.ilike.${pattern},username.ilike.${pattern},city.ilike.${pattern}`
        )
        .not("dj_name", "is", null)
        .limit(8);

      if (requestId !== latestRequestRef.current) return;

      if (error) {
        if (__DEV__) {
          console.warn("[useConnectionsScreenSearch] suggestions error:", error.message);
        }
        setSearchError(error.message || "Search failed");
        return;
      }

      const mapped = (data || []).map((u) => ({
        id: u.id,
        name: u.dj_name || u.full_name || u.username || "DJ",
        city: u.city || null,
        profileImage: u.profile_image_url || null,
      }));

      setSearchSuggestions(mapped);
      setShowSuggestions(true);
      setSearchError(null);
    } catch (e) {
      if (requestId !== latestRequestRef.current) return;
      if (__DEV__) {
        console.warn("[useConnectionsScreenSearch] suggestions exception:", e);
      }
      setSearchError(e?.message || "Search failed");
    } finally {
      if (requestId === latestRequestRef.current) {
        setIsSearching(false);
      }
    }
  }, []);

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length >= MIN_QUERY_LEN) {
      searchTimeoutRef.current = setTimeout(
        () => fetchSearchSuggestions(trimmedQuery),
        DEBOUNCE_MS
      );
    } else {
      latestRequestRef.current += 1;
      setSearchSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      setSearchError(null);
    }
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, fetchSearchSuggestions]);

  const onSearchChange = useCallback((text) => {
    setSearchQuery(typeof text === "string" ? text : "");
  }, []);

  const clearSearch = useCallback(() => {
    latestRequestRef.current += 1;
    setSearchQuery("");
    setSearchSuggestions([]);
    setShowSuggestions(false);
    setIsSearching(false);
    setSearchError(null);
  }, []);

  /** Hide the dropdown without clearing the query. Avoid wiring to TextInput `onBlur` — it can race suggestion row presses. */
  const hideSuggestions = useCallback(() => {
    setShowSuggestions(false);
  }, []);

  const selectSuggestion = useCallback((suggestion) => {
    const label = (suggestion?.name || "").trim();
    if (label) setSearchQuery(label);
    setShowSuggestions(false);
  }, []);

  return {
    searchQuery,
    searchSuggestions,
    showSuggestions,
    isSearching,
    searchError,
    onSearchChange,
    clearSearch,
    hideSuggestions,
    selectSuggestion,
  };
}
