# Connections Screen – Performance Assessment

**Date:** Post-refactor (orchestrator + useConnectionsData, useDiscoverData, useConnectionsActions)  
**Scope:** Hooks, data loading, lists, re-renders, and UX.

---

## Summary

| Area | Rating | Notes |
|------|--------|--------|
| **Data loading** | ✅ Strong | Single backend path for connections + last messages; parallel mount load; no N+1. |
| **List performance** | ✅ Strong | Virtualized SectionList/FlatList, getItemLayout, tuned batch/window, FadeInView (no blur). |
| **Re-renders** | ✅ Good | Memoized tab content and list items; stable loaders; some object ref churn (low impact). |
| **Realtime** | ✅ Good | Merge-on-insert for messages; debounced connections table; 30s periodic refresh. |
| **Code structure** | ✅ Strong | Split hooks keep orchestrator small; clear separation of data vs actions. |

**Overall: ~90/100** – Solid for production; a few small optimizations possible.

---

## 1. Data loading

- **Single backend path:** Initial connections load uses `getConnectionsParticipantsAndLastMessages(userId)`, which returns connections, participants, and last messages in one flow. No separate round-trip for “last message per connection” on first load.
- **Mount load:** One orchestrated effect runs `loadUserAndConnections({ deferLoadingEnd: true })` then `checkRhoodMembership()`, then in parallel: `loadDiscoverDJs`, `loadPopularDJs`, `loadNearbyDJs`, `loadNearbyOpportunities`. No redundant or duplicated full reloads.
- **Messages after load:** `loadLastMessagesForConnections(userId)` is used only for: (1) the one-off “load messages once” after connections exist, (2) realtime merge, (3) 30s periodic refresh. So there is no N+1 on initial load.
- **Stale handling:** Tab effect in `useConnectionsData` only runs a full reload when data is older than 60s (`STALE_MS`), avoiding unnecessary refetches when switching tabs.

**Verdict:** No meaningful waste; initial load and refresh strategy are efficient.

---

## 2. List performance

- **Virtualization:** Connections tab uses `SectionList` with:
  - `initialNumToRender={20}`, `maxToRenderPerBatch={10}`, `windowSize={15}`, `removeClippedSubviews={true}` (`CONNECTIONS_LIST_PERFORMANCE`).
  - `getItemLayout` (section-aware) so scroll position and measurement are predictable without measuring every row.
- **Discover tab:** Uses `FlatList` with `LIST_PERFORMANCE` and `getDiscoverItemLayout` for stable scroll and fewer layout passes.
- **Row components:** `ConnectionListItem` and `CommunityListItem` use `memo`; list items use `FadeInView` (opacity-only, 280ms) instead of blur, which is cheap and avoids heavy blur cost.
- **Keys:** Both lists use `keyExtractor={(item) => item.id}`, giving stable keys for reconciliation.

**Verdict:** Lists are configured for good scroll performance and low overdraw.

---

## 3. Re-renders and references

**Good:**

- **Tab content:** `ConnectionsTabContent` and `DiscoverTabContent` are wrapped in `memo`, so discover-only or connection-only updates don’t force the other tab to re-render.
- **Loaders:** `loadUserAndConnections`, `loadUserCommunities`, `loadDiscoverDJs`, `loadNearbyDJs`, etc. are created with `useCallback` and empty (or stable) deps, so they don’t change every render and don’t cause unnecessary effect re-runs.
- **Derived data:** `filteredConnections`, `connectionsWithMessages`, `connectionSections`, `filteredDiscoverUsers` are in `useMemo` with correct deps, so filtering/sectioning doesn’t recompute every render.
- **Refs for async:** `connectionsLoaderCtxRef` and `discoverCtxRef` are updated on each render so async loaders always see latest state, without putting that state in effect dependency arrays.

**Minor churn (acceptable):**

- **modalCtx / modalState:** New object references every time in `useConnectionsScreen`. They are passed into `useConnectionsData` and `useConnectionsActions`. No effect in those hooks depends on the *object* identity; only the ref/state inside is used. So this doesn’t trigger extra effect runs. Handlers that depend on modal state correctly update when that state changes.
- **discoverLoaders:** `{ loadDiscoverDJs, loadNearbyDJs }` is recreated each render. The functions inside are stable (from `useDiscoverData`), and the effects in `useConnectionsData` depend on those function refs, not the wrapper object, so behavior is correct and impact is small.
- **Inline keyExtractor:** `(item) => item.id` is recreated each render. Impact is small; if desired, a stable `keyExtractor` could be passed from the hook.

**Verdict:** Re-render behavior is under control; memoization and stable callbacks are used where it matters. Remaining ref churn is minor and could be refined later (e.g. `useMemo` for `modalCtx`/`modalState`/`discoverLoaders`) if profiling shows need.

---

## 4. Realtime and periodic

- **Messages INSERT:** Subscription merges the new message into `lastMessages` by sender instead of calling `loadLastMessagesForConnections` again. Avoids full refetch and list flicker.
- **Connections table:** Subscription is debounced (600ms) and then runs `loadUserAndConnections`, `loadDiscoverDJs`, `loadNearbyDJs`. Prevents storm of updates from multiple rapid events.
- **Periodic:** `loadLastMessagesForConnections` runs every 30s when there are connections and messages have been loaded at least once. Interval is reasonable and not aggressive.
- **Community posts:** Subscription only triggers `checkRhoodMembership()` when the post is for the R/HOOD community, with safe optional chaining on payload.

**Verdict:** Realtime and periodic behavior are tuned to avoid redundant work and UI thrash.

---

## 5. Search and suggestions

- **Debounce:** Search suggestions run after 300ms of no change (`searchTimeoutRef`), so we don’t hit the API on every keystroke.
- **Guard:** Suggestions only run when trimmed query length ≥ 2.
- **fetchSearchSuggestions:** Wrapped in `useCallback` with `[]` deps, so the effect that clears/sets the timeout has a stable dependency.

**Verdict:** Search is efficient and won’t cause noticeable performance issues.

---

## 6. Hook structure and maintainability

- **Orchestrator (~248 lines):** Holds UI state (search, tab, modal), composes sub-hooks, runs mount and search effects, builds `renderConnectionSectionItem` and wires `useDiscoverRenderItem`. No business logic duplication.
- **useConnectionsData (~322 lines):** All connections-tab state, loaders, realtime, and derived list data. Single place for connections + messages + communities logic.
- **useDiscoverData (~131 lines):** Discover state and loaders; `useDiscoverRenderItem` keeps discover row rendering in one place.
- **useConnectionsActions (~472 lines):** All user actions and location/modal state; no data-fetch logic.

Splitting keeps the main hook under 500 lines, avoids one giant dependency blob, and makes it easier to reason about and tune each area (e.g. list tuning in data hooks, action behavior in actions hook).

---

## 7. Optional improvements (if profiling justifies)

1. **Stable context objects (low priority)**  
   - `modalCtx` and `modalState`: wrap in `useMemo(..., [deps])` so object identity only changes when modal-related state actually changes.  
   - `discoverLoaders`: `useMemo(() => ({ loadDiscoverDJs: discoverData.loadDiscoverDJs, loadNearbyDJs: discoverData.loadNearbyDJs }), [discoverData.loadDiscoverDJs, discoverData.loadNearbyDJs])`.  
   Reduces reference churn; current impact is small.

2. **Stable keyExtractor (low priority)**  
   - Define `const keyExtractor = useCallback((item) => item.id, [])` in the hook and pass it to the list. Avoids creating a new function every render for the list.

3. **Render callbacks (only if lists feel heavy)**  
   - If profiling shows list re-renders as hot, consider passing handlers via refs for non-critical paths so `renderConnectionSectionItem` / `renderDiscoverItem` don’t get new references on every modal/action state change. This is a larger change and only worth it if proven by profiling.

---

## 8. Conclusion

- **Data loading:** Single backend path, parallel mount load, no N+1, sensible stale and refresh behavior.  
- **Lists:** Virtualized, with getItemLayout, tuned batching, and light animations (FadeInView).  
- **Re-renders:** Memoized tabs and items, stable loaders and derived data; some new object refs each render with limited impact.  
- **Realtime/periodic:** Merge-on-insert for messages, debounced connections updates, 30s periodic refresh.

Overall performance is **strong (~90/100)**. The refactor did not introduce new bottlenecks; the split into orchestrator + data + discover + actions improves clarity and keeps the main hook under 500 lines without sacrificing performance.
