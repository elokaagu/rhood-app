# RhoodApp – App-wide performance assessment

**Date:** March 2025  
**Scope:** List rendering, component size, state/re-renders, images, data fetching, navigation, and startup.

---

## 1. Executive summary

| Area | Status | Notes |
|------|--------|--------|
| **ListenScreen** | ✅ Addressed | Refactored to ~115 lines; SectionList/FlatList with `getItemLayout`, batched fetches, memoized renderers. |
| **ConnectionsScreen** | ✅ Addressed | Extracted to hooks + small UI; SectionList with fixed `getItemLayout`; no gap after first rows. |
| **Discover tab** | ✅ OK | FlatList with `LIST_PERFORMANCE`; `DiscoverTabContent` is thin. |
| **MessagesScreen** | ⚠️ Partial | FlatList + `initialNumToRender`; file still ~3.5k lines; inline `renderItem`; no `getItemLayout`. |
| **NotificationsScreen** | ✅ OK | FlatList with performance props. |
| **YourLikesScreen** | ❌ Needs work | ScrollView + `.map()` over categories/mixes; all items mount at once. |
| **TrendingMixesScreen** | ❌ Needs work | ScrollView + `trendingMixes.map()`; not virtualized. |
| **PlaylistDetailScreen** | ✅ OK | FlatList with `LIST_PERFORMANCE` and batch/window props. |
| **App.js** | ❌ High impact | ~8.5k lines; central state and audio; any state change can re-render large tree. |
| **Images** | ⚠️ Partial | ProgressiveImage used in lists; single-image fade (no double load); consider expo-image for caching. |
| **Audio / global state** | ⚠️ Partial | Audio from hook/context; still passed via props from App → ScreenRouter → screens; screens re-render on any audio update. |

**Priority:** (1) Reduce App.js size and isolate state, (2) Virtualize YourLikesScreen and TrendingMixesScreen, (3) Harden MessagesScreen (memoized row, getItemLayout).

---

## 2. List rendering

### 2.1 Virtualized and tuned

| Screen / component | List type | Config | getItemLayout |
|--------------------|-----------|--------|----------------|
| **ListenScreen** (hooks/useListenMixes) | SectionList / FlatList | LIST_PERFORMANCE, LISTEN_LIST_PERFORMANCE | ✅ Yes (sections + search) |
| **ConnectionsTabContent** | SectionList | CONNECTIONS_LIST_PERFORMANCE | ✅ Yes (fixed; global index) |
| **DiscoverTabContent** | FlatList | LIST_PERFORMANCE | ✅ getDiscoverItemLayout |
| **NotificationsScreen** | FlatList | initialNumToRender, etc. | Not checked |
| **MessagesScreen** (conversation) | FlatList | initialNumToRender | ❌ No |
| **PlaylistDetailScreen** | FlatList | LIST_PERFORMANCE (all four props) | Not checked |

### 2.2 Not virtualized (ScrollView + .map())

| Screen | Issue | Impact |
|--------|--------|--------|
| **YourLikesScreen** | Single ScrollView; `Object.keys(likedMixesByCategory).map()` then `categoryMixes.map(mix => ...)`. All category sections and all mix rows mount at once. | High for users with many liked mixes or categories. |
| **TrendingMixesScreen** | ScrollView; `trendingMixes.map((mix) => ...)`. All trending items mount at once. | Medium; list can be long. |
| **CommunityMembersScreen** | ScrollView (from PERFORMANCE_AUDIT). | Medium if community is large. |
| **ConnectionsListScreen** | ScrollView. | Lower unless list is very long. |

**Recommendation:** Use SectionList for YourLikesScreen (sections = categories; data = mixes). Use FlatList for TrendingMixesScreen with LIST_PERFORMANCE and a simple getItemLayout (e.g. fixed row height).

---

## 3. Component size and structure

### 3.1 Very large files

| File | Lines (approx) | Risk |
|------|----------------|------|
| **App.js** | ~8,539 | Single place for auth, audio, opportunities, modals, full-screen player, gesture handlers. Any state change re-renders App and children. Hard to maintain and reason about. |
| **MessagesScreen.js** | ~3,559 | Large state surface, many handlers, inline renderItem; re-renders and list updates can be costly. |
| **ProfileScreen.js** | ~2,187 | Moderate; could be split (header, stats, lists). |
| **NotificationsScreen.js** | ~1,353 | Acceptable but could be split (list vs. detail). |
| **YourLikesScreen.js** | ~1,182 | Should shrink after virtualizing and extracting list row. |
| **PlaylistDetailScreen.js** | ~1,174 | OK. |

**Recommendation:** Split App.js by concern: e.g. AuthGate, AppShell (tabs + header), a small “app state” layer (or Contexts), and a top-level composer that renders ScreenRouter. Move full-screen player and progress bar into a dedicated component tree so audio state updates don’t force full App re-renders.

### 3.2 Already refactored / thin

- **ListenScreen.js** – ~115 lines; delegates to hooks and subcomponents.
- **ConnectionsScreen.js** – ~181 lines; uses useConnectionsScreen, ConnectionsTabContent, DiscoverTabContent.
- **DiscoverTabContent.js** – ~98 lines; presentational.

---

## 4. State and re-renders

### 4.1 Global state and prop drilling

- **Audio:** `globalAudioState` (and setters) come from a hook in App and are passed into ScreenRouter, then to the active screen. When playback state or progress changes, App re-renders and passes new props; the current screen re-renders even if it only needs a small part of audio state (e.g. “is playing” for a single row).
- **Opportunities, auth, modals:** Similarly live in App; changes trigger App re-renders.

**Recommendation:** Use React Context (or a small store) for audio so only components that subscribe (e.g. mini player, full-screen player, list rows that show “playing”) re-render. Keep navigation/route state minimal and pass only what each screen needs.

### 4.2 Gesture handlers (App.js)

- Full-screen player swipe: PanResponder is created inside `useMemo` with stable refs (`isScrubbingRef`, `skipBackwardRef`, `skipForwardRef`). ✅ No recreation every render.
- Progress bar scrubber: `createProgressBarPanResponder` is `useCallback`; `progressBarPanResponder` and `fullScreenProgressBarPanResponder` are `useMemo`. ✅ Stable.

### 4.3 List item stability

- **ListenScreen (useListenMixes):** renderSectionItem, renderMixRow, renderSearchMixItem are useCallback; sections/keyExtractor/getItemLayout are memoized. ✅ Good.
- **MessagesScreen:** `renderItem` is an inline function; every message row re-renders when the parent re-renders. **Recommendation:** Extract a memoized `MessageRow` and pass stable callbacks (e.g. handleMessageLongPress via useCallback).
- **Connections:** ConnectionListItem / CommunityListItem are separate components; ensure they are memoized if they receive stable props.

---

## 5. Data fetching

- **Listen (useListenMixes):** Batched mix fetch; batched user profiles; batched like counts. Single user-dependent effect for recommendations, hasUserMixes, liked IDs, fetchPlaylists. ✅ Good.
- **Connections (useConnectionsData, loaders):** User + connections + communities loaded in a structured way; realtime subscriptions. ✅ No N+1 observed in reviewed code.
- **Supabase usage:** Fetches are in useEffect or callbacks, not in render. ✅ No systematic over-fetch in render.

**Recommendation:** Keep any new list screens to “one initial fetch + optional refresh/pagination” and avoid per-item fetches; use batched APIs where possible.

---

## 6. Images

- **ProgressiveImage:** Single image with opacity fade (no double decode). Used in Listen (mix rows), Messages (avatars), and elsewhere. ✅ Reasonable.
- **Caching:** Standard React Native Image caching. expo-image is used in some screens (e.g. EditProfile, PlaylistDetail) and can offer better caching and priority; consider using it for list avatars and artwork where beneficial.
- **List artwork:** Listen mix rows use fixed-size containers and ProgressiveImage; reduces layout thrash. ✅ Good.

---

## 7. Navigation and mount behavior

- **ScreenRouter:** Renders one screen at a time based on `screen`; other tabs are not mounted. ✅ Good for memory and initial cost.
- **Lazy tab mounting:** Only the active tab’s content is mounted; switching tabs mounts the new tab. ✅ No “mount all tabs at once” issue.

---

## 8. Startup and bundle

- **Track player:** Loaded lazily (`loadTrackPlayer()`) to avoid crashes when native module isn’t available. ✅ Good.
- **Fonts:** useFonts (expo-font) used for custom fonts; splash/loading can be shown until ready.
- **Heavy screens:** Not preloaded; first visit to Listen/Connections/Messages will mount and run their effects then. Acceptable; could add lightweight “preload next tab” later if needed.

---

## 9. Suggested priority order

1. **High – App.js**
   - Split into smaller modules: e.g. AppShell, FullScreenPlayer, AuthGate, and a top-level composer.
   - Move audio state into Context (or keep in App but expose via Context) so only audio UI re-renders on playback updates.

2. **High – Virtualize remaining long lists**
   - **YourLikesScreen:** SectionList by category; memoized row; getItemLayout if fixed row height.
   - **TrendingMixesScreen:** FlatList with LIST_PERFORMANCE and getItemLayout.

3. **Medium – MessagesScreen**
   - Extract memoized MessageRow component.
   - Add getItemLayout (estimated message height or fixed) for smoother scroll and correct scroll height.
   - Ensure initialNumToRender, maxToRenderPerBatch, windowSize are set (already has initialNumToRender).

4. **Medium – Images**
   - Consider expo-image for list avatars and artwork where caching/priority matters.
   - Keep ProgressiveImage for fade-in where desired.

5. **Low – Smaller cleanups**
   - CommunityMembersScreen, ConnectionsListScreen: switch to FlatList if lists can grow large.
   - ProfileScreen: optional split into header / stats / list sections for clarity and smaller re-render scope.

---

## 10. References

- `PERFORMANCE_AUDIT.md` – Original list/size/state findings.
- `docs/LISTEN_SCREEN_PERFORMANCE_AUDIT.md` – Listen refactor and tuning.
- `docs/CONNECTIONS_SCREEN_PERFORMANCE_*.md` – Connections refactor and getItemLayout fix.
- `lib/performanceConstants.js` – LIST_PERFORMANCE, CONNECTIONS_LIST_PERFORMANCE, LISTEN_LIST_PERFORMANCE, animation config.
