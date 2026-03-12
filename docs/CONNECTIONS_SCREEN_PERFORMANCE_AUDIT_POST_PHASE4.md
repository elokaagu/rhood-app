# Connections Screen – Performance Audit (Post P0–Phase 4)

**Date:** March 2025  
**Scope:** `ConnectionsScreen.js`, `lib/supabase.js`, `lib/connectionsService.js`, `AnimatedListItem.js`

This audit reflects the **current state** after P0 through Phase 4 improvements. It summarizes what was fixed and what (if anything) remains.

---

## 1. Current state summary

| Area | Status | Notes |
|------|--------|--------|
| Initial load | ✅ Fixed | Wave 1 (connections + Rhood), then Wave 2 (discover, popular, nearby, opportunities) in parallel |
| Tab switch | ✅ Fixed | Load only when data missing or stale (60s); full reload on pull-to-refresh |
| Last messages | ✅ Fixed | Single batched query in `getLastMessagesForAllConnections` (no N+1) |
| Communities | ✅ Fixed | `getLatestGroupMessagesBatch(communityIds)` — one query for all communities |
| List rendering | ✅ Fixed | SectionList (Messages), FlatList (Discover) with virtualization |
| State updates | ✅ Improved | Connections + lastMessages set in one pass in `loadUserAndConnections` |
| Logging | ✅ Fixed | Hot-path `console.log` removed; only `console.error`/`console.warn` in catch paths |
| Animation | ✅ Fixed | AnimatedListItem: maxStaggerIndex=6, lower delay/duration, stagger cap |
| Loading UX | ✅ Fixed | Skeletons for Connections (initial) and Discover (empty + loading) |
| Error handling | ✅ Added | Error state + retry for connections and discover; pull-to-refresh on error view |
| Periodic refresh | ✅ Tuned | 30s interval (was 10s); batched last-messages API |
| Realtime | ✅ Tuned | Connection-update handler debounced (600ms); cleanup on unmount |
| List config | ✅ Applied | `LIST_PERFORMANCE`: initialNumToRender, maxToRenderPerBatch, windowSize, removeClippedSubviews |

---

## 2. Data flow (current)

### 2.1 Initial load (mount)

1. **Wave 1 (critical):**  
   `loadUserAndConnections({ showLoader: true })` → then `checkRhoodMembership()` (which calls `loadUserCommunities()`).
2. **Wave 2 (non-critical):**  
   `Promise.all([ loadDiscoverDJs(), loadPopularDJs(), loadNearbyDJs(), loadNearbyOpportunities() ])`.

Screen becomes usable after Wave 1; Wave 2 hydrates discover/popular/nearby/opportunities.

### 2.2 loadUserAndConnections (critical path)

- Clears `connectionsLoadError`.
- If no `propUser`, tries `getUser()` then `getSession()` (with 100ms delay).
- **Two sequential DB calls:** `getUserConnections(userId)`, `getAllConversationParticipants(userId)`.
- Builds `connectionsMap`, merges participants, then `allConnections`.
- If `allConnections.length > 0`: **one batched call** `getLastMessagesForAllConnections(userId)`, then `setConnections(allConnections)` and `setLastMessages(lastMessagesData)` in one pass.
- Sets `loading`, `hasLoadedConnections`, `lastLoadedAtRef`, runs fade animation.

No N+1 on last messages; connections and last messages updated together.

### 2.3 Tab switch (Messages)

- Effect runs when `activeTab === "connections"` and `user?.id` present.
- If `!hasLoadedConnections`: calls `loadUserAndConnections()` and `loadUserCommunities()`.
- If data is stale (`Date.now() - lastLoadedAtRef > 60_000`): soft refresh (no loader) for both.
- No full reload on every tab switch.

### 2.4 Realtime and periodic

- **Messages INSERT:** subscription calls `loadLastMessagesForConnections(user.id, connections)` (full batched refetch).
- **Community post INSERT (R/HOOD):** calls `checkRhoodMembership()`.
- **Periodic:** `setInterval(..., 30_000)` calls `loadLastMessagesForConnections`.
- **Connections table changes:** debounced 600ms then `loadUserAndConnections`, `loadDiscoverDJs`, `loadNearbyDJs`.

---

## 3. Remaining issues and low-priority improvements

### 3.1 Double fetch of last messages on first load (minor)

**Where:** Initial load when user has connections.

**What happens:**  
`loadUserAndConnections` already fetches last messages and calls `setLastMessages(lastMessagesData)`. It does **not** set `hasLoadedMessagesRef.current = true`. The effect that runs when `connections.length > 0` and `hasLoadedConnections` then sees `!hasLoadedMessagesRef.current` and calls `loadLastMessagesForConnections` again.

**Impact:** One extra batched request on first load (same data).

**Fix:** When `loadUserAndConnections` sets last messages (when `allConnections.length > 0`), set `hasLoadedMessagesRef.current = true` so the “load messages once” effect does not run.

---

### 3.2 Pull-to-refresh does not refresh communities

**Where:** `handleRefresh` only calls `loadUserAndConnections()`.

**What happens:** Communities (and R/HOOD membership) are not refetched on pull-to-refresh on the Messages tab.

**Impact:** After joining/leaving a community, user may need to switch tab or wait for stale refresh.

**Fix:** In `handleRefresh`, also call `loadUserCommunities()` (e.g. `await Promise.all([loadUserAndConnections(), loadUserCommunities()])` or sequential if order matters).  
**Status:** ✅ Implemented.

---

### 3.3 Two sequential calls in loadUserAndConnections

**Where:** `getUserConnections(currentUser.id)` then `getAllConversationParticipants(currentUser.id)`.

**What happens:** Two round-trips before building the connections list.

**Impact:** Adds one round-trip of latency (tens to low hundreds of ms).

**Fix (optional):** Single backend RPC or combined query that returns both connections and conversation participants in one call.

---

### 3.4 Realtime message INSERT: full refetch

**Where:** Messages subscription callback calls `loadLastMessagesForConnections(user.id, connections)`.

**What happens:** Every new message triggers a full batched last-messages refetch.

**Impact:** Acceptable for typical usage; batched API is cheap. For very high message frequency, could merge the new message into `lastMessages` in state instead of refetching.

**Fix (optional):** Use `payload.new` to update `lastMessages` for the affected thread only and skip refetch for that event.

---

### 3.5 Discover ListHeaderComponent recreated every render

**Where:** `ListHeaderComponent={() => ( <View>...</View> )}` on the Discover FlatList.

**What happens:** New function and new React element every render. FlatList may still avoid re-rendering header content unnecessarily depending on implementation.

**Impact:** Low; header is not huge.

**Fix (optional):** Memoize the header (e.g. `useMemo` or stable callback + `React.memo` wrapper) if profiling shows cost.

---

### 3.6 Large number of useState (30+)

**Where:** Entire component.

**What happens:** Many small state slices; every `set*` can trigger a re-render (React 18 batches in events/effects).

**Impact:** Maintainability more than raw performance; batching already limits re-renders.

**Fix (optional):** Consolidate related state (e.g. “connections screen data”) into one or two state objects or `useReducer` for clearer data flow.

---

## 4. Logging and errors

- **Hot paths:** No `console.log` in render or in the main load loops; only `console.error` in catch blocks and `console.warn` for invalid props/user.
- **Supabase:** `getLastMessagesForAllConnections` and `getLatestGroupMessagesBatch` use `console.error` only on failure.
- **connectionsService:** No debug logs in the recommend path.

---

## 5. Recommendations summary

| Priority | Item | Effort | Impact |
|----------|------|--------|--------|
| P1 | ~~Set `hasLoadedMessagesRef.current = true` in `loadUserAndConnections`~~ ✅ Done | Low | Removes one redundant request |
| P2 | ~~Include `loadUserCommunities()` in `handleRefresh`~~ ✅ Done | Low | Correctness / UX |
| P3 | Combine `getUserConnections` + `getAllConversationParticipants` into one backend call (if feasible) | Medium | Saves one round-trip |
| P4 | Optional: merge new message from realtime payload into `lastMessages` instead of full refetch | Medium | Less work on high message volume |
| P5 | Optional: memoize Discover `ListHeaderComponent` if profiling shows need | Low | Minor render cost |
| P6 | Optional: consolidate related state for maintainability | Medium | Code clarity |

---

## 6. Conclusion

The Connections screen has been brought in line with the original audit goals: parallel critical/non-critical load, no N+1 for last messages or communities, virtualized lists, batched state updates, fewer logs, lighter animation, skeletons, error/retry, and tuned periodic/realtime behavior. **§3.1** (avoid double last-messages fetch) and **§3.2** (refresh communities on pull-to-refresh) have been implemented. Remaining items (P3–P6) are optional optimizations.
