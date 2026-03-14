# Listen Screen – Full Performance Audit (Post–P0/P1/P2)

**Date:** March 2025 (updated after P0, P1, P2 fixes)  
**Scope:** `components/ListenScreen.js` (~3,739 lines), data loading, lists, state, re-renders, images, and related libs.  
**Previous audit:** Pre-fix rating ~55/100. This document reflects the current state after all applied optimizations.

---

## Executive Summary

| Area | Rating | Notes |
|------|--------|--------|
| **Data loading** | ✅ Strong | Batched user profiles (no N+1); batched playlist mix counts; single user-dependent effect with `Promise.all`. |
| **List performance** | ✅ Strong | Virtualized FlatList/SectionList with `getItemLayout`, `LISTEN_LIST_PERFORMANCE` constants; memoized header/footer and render callbacks. |
| **Re-renders** | ✅ Good | `fetchMixes`, `handleRefresh`, `refreshControl`, `renderHeader`, `renderFooter`, `handleMixPress`, `handleMixLongPress` memoized; list props stable. |
| **Images** | ✅ Good | `ProgressiveImage` with placeholders used for mix artwork in all list rows and horizontal cards; reduces layout shift and perceived load. |
| **Realtime** | ➖ N/A | No Supabase realtime for mixes; pull-to-refresh only. Acceptable for current product. |
| **Code structure** | ⚠️ Moderate | Single ~3.7k-line file; logic is organized but extraction into hooks/UI would improve maintainability. |
| **Logging** | ✅ Good | Hot-path and debug logs guarded with `__DEV__` in fetchMixes and `hasUserUploadedMixes`; error logs retained for production. |

**Overall: ~82/100** – Solid for production. Major bottlenecks removed; optional improvements remain (structure, a few unmemoized handlers, refresh scope).

---

## 1. Data Loading

### 1.1 fetchMixes – Batched profiles (P0 fixed)

**Current flow:**

1. One query: `supabase.from("mixes").select("*").order("created_at", { ascending: false })`.
2. One batched query: `mix_likes` with `.in("mix_id", mixIds)` → like counts per mix.
3. **One batched query:** Collect distinct `user_id` from mixes → `supabase.from("user_profiles").select("id, dj_name, first_name, last_name, bio, profile_image_url, username, status_message").in("id", userIds)`.
4. Synchronous transform: `data.map((mix) => { ... })` using `profilesById[mix.user_id]` (no per-mix await).

**Result:** Initial load is **3 requests** (mixes + like counts + profiles) regardless of mix count. No N+1.

**Additional:** `fetchMixes` is wrapped in `useCallback` with `[]` deps so it is stable for `handleRefresh` and mount effect.

---

### 1.2 fetchPlaylists – Batched mix counts (P1 fixed)

**Current flow:**

1. One query: `supabase.from("playlists").select("*").eq("user_id", user.id).order(...)`.
2. **One batched query:** `supabase.from("playlist_mixes").select("playlist_id").in("playlist_id", playlistIds)`.
3. In JS: `mixRows.reduce(...)` to build `mixCountByPlaylistId`; then `playlistsList.map((p) => ({ ...p, mixCount: mixCountByPlaylistId[p.id] ?? 0 }))`.

**Result:** **2 requests** for playlists + counts instead of 1 + N. No N+1.

---

### 1.3 User-dependent loads – Single effect (P2 fixed)

**Current flow:**

- One `useEffect` with deps `[user?.id, fetchPlaylists]`:
  - If `!user?.id`: reset `likedMixIds` and `hasUserMixes`, return.
  - Otherwise run in parallel: `loadRecommendedMixes()`, hasUserUploadedMixes check, liked mixes fetch (inline supabase `mix_likes`), `fetchPlaylists()`.

**Result:** No duplicate or overlapping effects when user becomes available; one coordinated load.

---

### 1.4 Other data loads

- **Like counts:** Batched in fetchMixes → good.
- **Liked mix IDs:** Single `mix_likes` by `user_id` in the coalesced effect → good.
- **Recommended mixes:** `getRecommendedMixes(user.id, 10)` – single call → good.
- **User mixes check:** `db.hasUserUploadedMixes(user.id)` – single query; logs guarded with `__DEV__` → good.
- **User mixes (manage modal):** `db.getUserMixes(user.id)` – single query → good.

**Verdict:** Data loading is in good shape; no remaining N+1 or redundant round-trips.

---

## 2. List Performance

### 2.1 Virtualization and tuning

- **FlatList (search):** `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, `removeClippedSubviews` from `LIST_PERFORMANCE`; **getItemLayout** = `getSearchItemLayout` (estimated mix row height from `LISTEN_LIST_PERFORMANCE.ESTIMATED_MIX_ROW_HEIGHT`).
- **SectionList (home):** Same tuning; **getItemLayout** = `getSectionItemLayout` (section-aware: playlist row, mix row, or horizontal section height from `LISTEN_LIST_PERFORMANCE`).

**Constants** (`lib/performanceConstants.js`):

- `LISTEN_LIST_PERFORMANCE.ESTIMATED_MIX_ROW_HEIGHT`: 80  
- `LISTEN_LIST_PERFORMANCE.ESTIMATED_PLAYLIST_ROW_HEIGHT`: 72  
- `LISTEN_LIST_PERFORMANCE.ESTIMATED_HORIZONTAL_SECTION_HEIGHT`: 220  

**Result:** Lists avoid per-item measurement when scrolling; scroll position and layout are predictable.

---

### 2.2 Header, footer, and render callbacks

- **ListHeaderComponent:** `renderHeader` is `useCallback` with deps `[searchQuery, selectedGenre, refreshing, availableGenres]`.
- **ListFooterComponent:** `renderFooter` is `useCallback` with deps `[hasUserMixes, handleUploadMix]`.
- **renderSectionHeader:** `useCallback` with `[]` (uses `section` from argument).
- **renderSectionItem:** `useCallback` with deps including `renderMixRow`, `handleMixPress`, `handleMixLongPress`, `handleToggleLike`, etc.
- **renderMixRow:** `useCallback` with deps `[playingMixId, globalAudioState.isPlaying, handleMixPress, handleMixLongPress, handleToggleLike, likeLoadingMap, likedMixIds]`.
- **keyExtractor:** Stable `useCallback` with `[]`.

**Result:** List receives stable references for header, footer, and item rendering when only unrelated state changes, reducing re-renders and churn.

---

### 2.3 Refresh and pull-to-refresh

- **refreshControl:** `useMemo` with deps `[refreshing, handleRefresh]`.
- **handleRefresh:** `useCallback` with deps `[fetchMixes]`; calls `fetchMixes()` and toggles `refreshing`.

**Result:** Refresh control and handler are stable; list does not see a new `RefreshControl` every render.

**Verdict:** List performance is strong; virtualization, getItemLayout, and memoization are in place.

---

## 3. Re-renders and References

### 3.1 Memoized handlers and loaders

- **fetchMixes:** `useCallback` with `[]`.
- **handleRefresh:** `useCallback` with `[fetchMixes]`.
- **handleMixPress:** `useCallback` with `[playingMixId, globalAudioState.isPlaying, onPauseAudio, onResumeAudio, onPlayAudio]`.
- **handleMixLongPress:** `useCallback` with `[user?.id, onAddToQueue, onPlayNext, handleSaveToPlaylist, handleDeleteMix]`.
- **fetchPlaylists:** `useCallback` with `[user?.id]`.
- **handleSaveToPlaylist,** **handleCreatePlaylist,** **handleAddMixToPlaylist,** **handleSelectPlaylist:** Already or effectively memoized where used.

### 3.2 Unmemoized handlers (optional future work)

- **handleDeleteMix,** **handleUploadMix,** **handleAddToQueue,** **handleToggleLike:** Plain functions. They are used in list rows or modals; memoizing them would further stabilize `renderSectionItem` / `renderMixRow` if they were passed as deps. Current impact is limited because the main list callbacks are already memoized with the right deps.
- **handleArtistPress:** Plain function; used in limited contexts.

**Verdict:** Re-render behavior is under control; critical paths are memoized. Remaining unmemoized handlers are a low-priority polish.

---

## 4. Images

- **ProgressiveImage** is used for mix artwork in:
  - **renderMixRow** (SectionList and FlatList search rows).
  - **renderSectionItem** horizontal “You may like” cards.
  - **renderTrending** (trending list).
  - **renderYourLikes** (your likes list).
  - **renderYouMayLike** horizontal cards.
  - Search results list (filtered mixes).

- Placeholder: Dark background + musical-notes icon when `source` is null or while loading.
- **Manage Mixes modal** and **Save to Playlist modal** still use plain `Image` for playlist/mix thumbnails; acceptable for modal UI and not in the main scroll path.

**Verdict:** List and discovery surfaces use ProgressiveImage; perceived performance and layout stability are good.

---

## 5. Realtime and Refresh

- **Realtime:** No Supabase channel or `postgres_changes` subscription for mixes. Updates happen on pull-to-refresh or after user actions (like, delete, etc.). Acceptable if live mix list updates are not a product requirement.
- **Pull-to-refresh:** Currently calls only `fetchMixes()`. It does not refetch recommendations, liked IDs, or playlists. Extending refresh to a small set of loaders (e.g. fetchMixes + liked IDs + optional recommendations) would make “pull to refresh” a full data refresh; optional enhancement.

**Verdict:** Realtime is out of scope; refresh behavior is clear and can be extended later if needed.

---

## 6. Logging and Debug

- **fetchMixes:** Success and “no mixes” logs wrapped in `__DEV__`; duration warning for mixes with no duration in `__DEV__`. No per-mix verbose logs in production.
- **hasUserUploadedMixes** (`lib/supabase.js`): All debug and info logs wrapped in `__DEV__`; only real errors logged in production.
- **fetchPlaylists:** “Playlists table doesn’t exist” and batch-fetch warning guarded with `__DEV__`.
- **Remaining:** A number of `console.error` and a few `console.log` remain in error paths or one-off actions (e.g. delete mix). These are acceptable for debugging production issues; optional to guard with `__DEV__` where not needed in prod.

**Verdict:** Hot paths and noisy debug logs are guarded; logging is in good shape.

---

## 7. Code Structure and Maintainability

- **File size:** ~3,739 lines in a single component. State, effects, handlers, and UI (header, footer, SectionList, FlatList, modals, manage mixes, save to playlist) all live in `ListenScreen.js`.
- **Benefits of current state:** All P0/P1/P2 optimizations applied without introducing new files; behavior is consistent and testable in one place.
- **Trade-off:** Future changes (e.g. new sections, new modals, tuning load order) would benefit from extraction:
  - **Hooks:** e.g. `useListenMixes` (mixes, fetchMixes, like counts, liked IDs, trending, filtered, search), `useListenPlaylists` (playlists, fetchPlaylists, add/create), `useListenRecommendations` (recommended mixes, load).
  - **UI:** Modals (Upload, Manage Mixes, Save to Playlist) and/or a shared `MixRow` component.
  - **Utils:** Duration/format and search helpers already live at top of file; could move to `lib/listenScreenUtils.js` or similar for reuse.

**Verdict:** Structure is acceptable and performant; extraction is optional for long-term maintainability and future tuning.

---

## 8. Dependency and Constants

- **LIST_PERFORMANCE:** Used for list tuning (initialNumToRender 10, maxToRenderPerBatch 5, windowSize 10, removeClippedSubviews). Appropriate for Listen.
- **LISTEN_LIST_PERFORMANCE:** Used for getItemLayout (mix row 80, playlist row 72, horizontal section 220). Centralized and easy to tune.
- **getRecommendedMixes:** Single RPC or fallback; no N+1 in this screen.
- **db.getUserMixes / hasUserUploadedMixes:** Single-query; no issues.

**Verdict:** No concerns; constants and dependencies are used consistently.

---

## 9. Summary of Applied Fixes

| Priority | Item | Status |
|----------|------|--------|
| **P0** | Remove N+1 in fetchMixes (batched user_profiles) | ✅ Done |
| **P1** | Remove N+1 in fetchPlaylists (batched mix counts) | ✅ Done |
| **P1** | Add getItemLayout to FlatList and SectionList | ✅ Done |
| **P1** | Memoize renderHeader and renderFooter | ✅ Done |
| **P1** | Memoize handleMixPress and handleMixLongPress | ✅ Done |
| **P1** | Guard console in fetchMixes and hasUserUploadedMixes | ✅ Done |
| **P2** | Memoize refreshControl and handleRefresh; stable fetchMixes | ✅ Done |
| **P2** | Coalesce user-dependent effects into one | ✅ Done |
| **P2** | Use ProgressiveImage for mix artwork in lists | ✅ Done |

---

## 10. Optional Future Improvements

| Item | Impact | Effort | Notes |
|------|--------|--------|--------|
| Memoize handleDeleteMix, handleUploadMix, handleAddToQueue, handleToggleLike | Low | Low | Reduces list callback churn if passed as deps. |
| Extend pull-to-refresh to also refetch liked IDs and/or recommendations | Low | Low | Makes “refresh” a full data refresh. |
| Extract hooks (useListenMixes, useListenPlaylists, useListenRecommendations) | Maintainability | High | Simplifies testing and future changes. |
| Extract modals and/or MixRow into separate components | Maintainability | Medium | Shrinks main file and clarifies UI boundaries. |
| Guard remaining console.log in delete/success paths with __DEV__ | Low | Low | Reduces log volume in production if desired. |
| Consider Supabase realtime for mixes (e.g. new mix, like count) | Feature | Medium | Only if product requires live updates. |

---

## 11. Conclusion

- **Data loading:** Batched profiles and playlist counts; single user-dependent effect. No N+1; load time and backend load are in a good state.
- **Lists:** Virtualized with getItemLayout and tuned constants; header, footer, and render callbacks memoized; refreshControl and handleRefresh stable.
- **Re-renders:** Core handlers and loaders memoized; list and refresh behavior stable.
- **Images:** ProgressiveImage with placeholders used for mix artwork in all main list and discovery surfaces.
- **Logging:** Hot paths and debug logs guarded; error reporting retained.

**Overall performance rating: ~82/100.** The Listen screen is in solid shape for production. The remaining optional work (structure, a few handlers, refresh scope, realtime) can be prioritized based on product and maintainability needs.
