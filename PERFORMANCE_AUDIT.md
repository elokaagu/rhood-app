# RhoodApp Performance Audit

This document summarizes findings from a comprehensive performance review of the app. It covers list rendering, component size, state management, images, and animation patterns.

---

## Executive summary

- **Main issues:** Very large single-file components (App.js ~9k lines, ListenScreen ~3.4k, ConnectionsScreen ~4.3k, MessagesScreen ~3.5k), heavy use of `ScrollView` + `.map()` instead of virtualized lists, and global state in App causing broad re-renders.
- **Quick wins:** Use `FlatList` (with `initialNumToRender` / `windowSize`) for long lists, memoize gesture handlers and list callbacks, and apply existing `LIST_PERFORMANCE` constants where `FlatList` is already used.
- **Medium-term:** Split App.js into smaller components and move audio/navigation state into Context or a small state layer so only affected screens re-render.

---

## 1. List rendering (high impact)

### 1.1 ScrollView + .map() instead of FlatList

| Screen / File | Issue | Recommendation |
|---------------|--------|----------------|
| **ListenScreen.js** | Single `ScrollView` renders header + playlists + `trendingMixes.map()` + `userLikedMixes.map()` + `recommendedMixes.map()` + `playlists.map()` + `filteredMixes.map()`. All items mount at once. | Use `FlatList` with `ListHeaderComponent` for the header, or use `SectionList` for “Trending”, “Your likes”, “You may like”, etc. so only visible rows are mounted. |
| **MessagesScreen.js** | `messages.map((message) => ...)` inside `ScrollView`. All messages in a conversation are rendered. | Use `FlatList` with `inverted={true}` and `keyExtractor`, `initialNumToRender` (e.g. 20), `maxToRenderPerBatch`, `windowSize` for chat-style scrolling. |
| **ConnectionsScreen.js** | Multiple `ScrollView`s with connection lists and discover lists rendered via `.map()`. | Use `FlatList` for “connections” and “discover” user lists; keep header/tabs in `ListHeaderComponent`. |
| **NotificationsScreen.js** | `sortedNotifications.map(...)` inside `ScrollView`. | Use `FlatList` with `initialNumToRender` (e.g. 15) and `windowSize`; reuse `AnimatedListItem` in `renderItem`. |
| **YourLikesScreen.js** | ScrollView with categories and mix lists rendered by `.map()`. | Use `FlatList` or `SectionList` for “categories” and “mixes” so long lists are virtualized. |
| **ConnectionsListScreen.js** | ScrollView with list content. | If the list can grow (e.g. many connections), switch to `FlatList`. |
| **CommunityMembersScreen.js** | ScrollView with members. | Prefer `FlatList` if member count can be large. |
| **TrendingMixesScreen.js** | ScrollView with mixes. | Use `FlatList` for the mix list. |

### 1.2 FlatList already used but not tuned

| File | Issue | Recommendation |
|------|--------|----------------|
| **PlaylistDetailScreen.js** | `FlatList` for `availableMixes` has no `initialNumToRender`, `windowSize`, or `maxToRenderPerBatch`. | Import `LIST_PERFORMANCE` from `lib/performanceConstants.js` and set e.g. `initialNumToRender={LIST_PERFORMANCE.INITIAL_NUM_TO_RENDER}`, `windowSize={LIST_PERFORMANCE.WINDOW_SIZE}`, `maxToRenderPerBatch={LIST_PERFORMANCE.MAX_TO_RENDER_PER_BATCH}`. |

---

## 2. Component size and structure (high impact)

### 2.1 Monolithic components

| File | Approx. size | Impact |
|------|----------------|--------|
| **App.js** | ~9,364 lines | Holds 50+ `useState` hooks, auth, audio, opportunities, UI modals, and all screen rendering. Any state change can re-render the whole tree and all children. |
| **ConnectionsScreen.js** | ~4,289 lines | Many `useState` and effects; large render tree and many inline handlers. |
| **ListenScreen.js** | ~3,394 lines | Many sections and lists in one component; re-renders are expensive. |
| **MessagesScreen.js** | ~3,557 lines | Large state and render tree; message list not virtualized. |

**Recommendations:**

- **App.js:** Split by concern: e.g. `AuthGate`, `AppShell` (tabs + header), and one wrapper that composes them. Move global audio state (and optionally navigation state) into a React Context or a small state library so only consumers (e.g. mini player, full-screen player, screens that show “now playing”) re-render when audio changes.
- **ConnectionsScreen / ListenScreen / MessagesScreen:** Extract list rows into separate components wrapped in `React.memo`, and/or split screen into smaller components (e.g. header, list, modals) to limit re-render scope.

### 2.2 Navigation and screen mounting

- **Current:** Single `renderScreen()` switch that mounts one screen at a time. This is good and avoids mounting every tab at once.
- **Issue:** All screen props (e.g. `globalAudioState`, `onPlayAudio`, `onPauseAudio`, …) are passed from App. When `globalAudioState` (or other App state) updates, the currently mounted screen re-renders even if it doesn’t use audio. Moving audio (and other global state) into Context with selective subscription reduces unnecessary re-renders.

---

## 3. State and re-renders (medium impact)

### 3.1 Gesture handler recreated every render (App.js)

- **Location:** `createGestureHandlers()` is defined in App and called in render: `{...createGestureHandlers()}` (around line 6315).
- **Issue:** Creates a new `PanResponder` and new handler object on every App render, which can cause unnecessary reconciliation and touch handler churn.
- **Fix:** Build the pan responder once and store handlers in a ref, or wrap in `useMemo` with a stable dependency array (e.g. `[isScrubbing]` if that’s the only changing dependency). Expose the stable `panHandlers` object to the view.

### 3.2 Inline handlers and list items

- Many list `renderItem` or `.map()` callbacks use inline functions, e.g. `onPress={() => setShowUploadModal(false)}` or `onPress={() => handleNotificationPress(notification)}`. New function references every render can prevent `React.memo` from skipping re-renders.
- **Recommendation:** For list item components, use `useCallback` for handlers (with stable deps) and pass primitive or stable props where possible. Wrap list row components in `React.memo` so they only re-render when their props change.

### 3.3 useMemo / useCallback usage

- **ConnectionsScreen, ListenScreen, MessagesScreen:** Already use some `useMemo`/`useCallback`; expanding their use for list callbacks and derived data (e.g. filtered/sorted lists) will help, especially once lists are virtualized with `FlatList`.

---

## 4. Images (medium impact)

### 4.1 Image components

- **ProgressiveImage.js:** Uses two `Image` components (one visible, one “hidden”) for the same URI to drive fade-in. That can double network/cache load for a single asset. Consider a single image with opacity animation, or ensure the hidden image is not actually decoding at full size.
- **Usage:** Many screens use React Native’s `Image`; a few use `expo-image` (e.g. EditProfileScreen, OnboardingForm, UploadMixScreen, PlaylistDetailScreen). `expo-image` generally offers better caching and performance.
- **Recommendation:** Prefer `expo-image` (e.g. `Image` from `expo-image`) for remote artwork and avatars, especially in lists. Use a single-image approach in `ProgressiveImage` if possible.

### 4.2 List item images

- In virtualized lists, ensure images in list items use a consistent size (e.g. `style` with fixed width/height or `resizeMode`) to reduce layout thrash. Reuse `LIST_PERFORMANCE` / `IMAGE_LOADING` from `lib/performanceConstants.js` for `FlatList` and image prefetch/cache hints if you add them.

---

## 5. Animation and native driver

- **performanceConstants.js** already defines `useNativeDriver: true` and animation timings. This is good.
- **AutoScrollText (App.js):** Uses `Animated` with `useNativeDriver: true`. Keep animations that affect opacity/transform on the native driver where possible.
- **ListenScreen:** Uses `removeClippedSubviews={true}` and `scrollEventThrottle={16}` on `ScrollView`; once you switch to `FlatList`, keep similar options (`removeClippedSubviews`, `windowSize`) for better scroll performance.

---

## 6. Data fetching and effects

- No systematic issue found with Supabase calls running on every render; they appear to be inside `useEffect` or event handlers. Keep any fetch or subscription that depends on props/state in `useEffect` with correct dependencies to avoid over-fetching and unnecessary re-renders.
- **ConnectionsScreen:** Multiple loading states and effects; ensure effects don’t depend on unstable references (e.g. inline objects) so they don’t re-run unnecessarily.

---

## 7. Suggested priority order

1. **High (do first)**  
   - **ListenScreen:** Replace the main ScrollView content with `SectionList` or `FlatList` + `ListHeaderComponent` so mix lists are virtualized.  
   - **MessagesScreen:** Replace `messages.map()` in ScrollView with `FlatList` (inverted) and memoized message row component.  
   - **App.js:** Memoize or ref the full-screen player gesture handlers so `createGestureHandlers()` is not called on every render.

2. **High (next)**  
   - **ConnectionsScreen:** Use `FlatList` for connection and discover lists.  
   - **NotificationsScreen / YourLikesScreen / TrendingMixesScreen:** Use `FlatList` (or `SectionList`) for long lists.  
   - **PlaylistDetailScreen:** Add `initialNumToRender`, `windowSize`, `maxToRenderPerBatch` from `LIST_PERFORMANCE`.

3. **Medium**  
   - Move global audio state (and optionally navigation) from App.js into Context so only audio-related UI re-renders on audio updates.  
   - Extract large screens (Connections, Listen, Messages) into smaller subcomponents and wrap list rows in `React.memo` with stable callbacks.  
   - Prefer `expo-image` for list avatars and artwork; simplify `ProgressiveImage` to avoid double-loading the same URI.

4. **Lower**  
   - Gradually split App.js into `AuthGate`, `AppShell`, and screen-specific containers.  
   - Add `getItemLayout` to any `FlatList` with fixed-height rows to avoid layout jumps and improve scroll performance.

---

## 8. How to run the automated check

From the project root:

```bash
node scripts/performance-check.js
```

This script scans the codebase for common performance patterns and prints a short report. It does not modify any files.
