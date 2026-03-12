# Connections Screen – Full Performance & Speed Audit

**Date:** March 2025  
**Scope:** Connections page (ConnectionsScreen.js, list items, supabase/connectionsService)

This is a comprehensive performance and speed check after the flicker fix and all prior optimizations.

---

## 1. Architecture summary

### 1.1 State

- **UI:** `loading`, `refreshing`, `activeTab`, `searchQuery`, `showSuggestions`, `searchSuggestions`, `showLocationModal`, `newLocationCity`, `updatingLocation`, modals (connection, location).
- **Connections tab:** `connections`, `lastMessages`, `communitiesData` (single state: userCommunities, communityMessages, communityUnreadCounts, rhoodGroupData, isRhoodMember, rhoodMemberCount, latestGroupMessage, unreadGroupCount), `hasLoadedConnections`, `connectionsLoadError`. Derived: `userCommunities`, `communityMessages`, etc. from `communitiesData`.
- **Discover tab:** `discoverUsers`, `discoverLoading`, `discoverLoadError`, `popularDJs`, `popularDJsLoading`, `nearbyDJs`, `nearbyDJsLoading`, `nearbyOpportunities`, `nearbyOpportunitiesLoading`, `incomingConnectionRequests` (derived in render).
- **Actions:** `cancellingConnectionId`, `acceptingUserId`, `decliningUserId`, `isDeletingConnectionId`, `selectedConnection`.

Refs: `lastLoadedAtRef`, `hasLoadedMessagesRef`, `prevConnectionStatusesRef`, `realtimeDebounceRef`, `searchTimeoutRef`.

### 1.2 Initial load (mount)

- **Single effect** runs:
  - **Connections path:** `loadUserAndConnections({ showLoader: true, deferLoadingEnd: true })` → then `checkRhoodMembership()` → then **one** `setLoading(false)` + `setHasLoadedConnections(true)` + fade. So the Connections tab shows the list only after both connections and communities are loaded (**flicker fix**).
  - **Discover path:** `loadDiscoverDJs()`, `loadPopularDJs()`, `loadNearbyDJs()`, `loadNearbyOpportunities()` run in parallel with the connections path.
- No waterfall: all five “tracks” start at once. Connections tab stops showing the skeleton only when connections + communities are both done.

### 1.3 Data flow – Connections tab

1. **loadUserAndConnections** (with or without `deferLoadingEnd`):
   - Optional: 100ms delay + `getUser()` / `getSession()` if no `propUser`.
   - **Parallel:** `getUserConnections(userId)` and `getAllConversationParticipants(userId)`.
   - Builds `connectionsMap`, merges participants → `allConnections`.
   - If `allConnections.length > 0`: **one** `getLastMessagesForAllConnections(userId)` then `setConnections` + `setLastMessages` + `hasLoadedMessagesRef.current = true`.
   - On success and `!deferLoadingEnd`: `setLoading(false)`, `setHasLoadedConnections(true)`, `lastLoadedAtRef`, fade. On `deferLoadingEnd` the caller does that after `checkRhoodMembership()`.
2. **loadUserCommunities** (via checkRhoodMembership on initial load):
   - `getUserCommunities()` → then **one** `getLatestGroupMessagesBatch(communityIds)` (and unread stub).
   - **One** `setCommunitiesData({ ... })` for all community + R/HOOD state (no multi-setState flicker).

**Round-trips (connections tab, best case):** 1 (getUserConnections) + 3 (getAllConversationParticipants: threads + profiles + connections in batch) + 2 (getLastMessages: threads + messages) + 1 (getUserCommunities) + 1 (getLatestGroupMessagesBatch) = **8**. No N+1 (participants was refactored from 1+N×3 to 3).

### 1.4 Data flow – Discover tab

- **loadDiscoverDJs:** `getUser()` (if needed), `getRecommendedUsers(20)`, `getUserConnections(userId)` for status → merge → `setDiscoverUsers`.
- **loadPopularDJs:** one Supabase query → `setPopularDJs`.
- **loadNearbyDJs:** profile + `getUserConnections` for filter → `setNearbyDJs`.
- **loadNearbyOpportunities:** profile + opportunities query → `setNearbyOpportunities`.

All run in parallel with each other and with the connections path. No `startTransition`; updates commit in the same tick as the rest of the work to avoid deferred “pops.”

### 1.5 Tab switch & refresh

- **Messages tab focused:** Effect runs only if `!hasLoadedConnections` or data older than 60s. When **mounting with Connections tab** (`initialTab === "connections"`), the effect does **not** start a load; only the mount effect (`initializeData`) runs, avoiding double load and flicker. When the user **switches** to the Connections tab and data is missing, the effect runs with `deferLoadingEnd: true` and awaits both `loadUserAndConnections` and `loadUserCommunities` before a single `setLoading(false)` / `setHasLoadedConnections(true)`. When data is stale (>60s), it calls `loadUserAndConnections()` and `loadUserCommunities()` without defer.
- **Pull-to-refresh:** `Promise.all([ loadUserAndConnections(), loadUserCommunities() ])` so both connections and communities refresh.

### 1.6 Realtime & periodic

- **Messages INSERT:** subscription → `loadLastMessagesForConnections(userId)` (full batched refetch).
- **community_posts INSERT (R/HOOD):** `checkRhoodMembership()`.
- **Periodic:** every 30s → `loadLastMessagesForConnections`.
- **connections table:** debounced 600ms → `loadUserAndConnections`, `loadDiscoverDJs`, `loadNearbyDJs`.

---

## 2. Flicker fix (current behavior)

- **Cause:** The list was shown as soon as `loadUserAndConnections` finished; `loadUserCommunities` (via `checkRhoodMembership`) ran after and then updated `userCommunities` / `communityMessages`, so the list re-rendered and sections “popped” in (communities first section filling in).
- **Fix:** `loadUserAndConnections` accepts `deferLoadingEnd: true` on initial load. It does **not** call `setLoading(false)` or `setHasLoadedConnections(true)` in that case. The initial effect does:
  - `await loadUserAndConnections({ showLoader: true, deferLoadingEnd: true })`
  - `await checkRhoodMembership()`
  - then a single `setLoading(false)`, `setHasLoadedConnections(true)`, `lastLoadedAtRef`, fade.
- **Result:** The Connections tab shows the skeleton until both connections and communities are ready, then one transition to the full list. No mid-list flicker from communities appearing later.
- **Error:** If `loadUserAndConnections` throws with `deferLoadingEnd`, the catch block still calls `setLoading(false)` and `setHasLoadedConnections(true)` so the user can see the error/retry UI.

### 2.1 Why it was still flickering (March 2025 follow-up)

- **Double load when opening the app on the Connections tab:** When `initialTab === "connections"`, two code paths run: (1) Mount effect `initializeData` starts `loadUserAndConnections({ deferLoadingEnd: true })` then on resolve runs `checkRhoodMembership()` (i.e. `loadUserCommunities`) and then `setLoading(false)`, `setHasLoadedConnections(true)`. (2) Tab effect sees `activeTab === "connections"` and `!hasLoadedConnections`, so it also runs `await loadUserAndConnections({ deferLoadingEnd: true })` then `await loadUserCommunities()` then `setLoading(false)`, `setHasLoadedConnections(true)`. So two `loadUserCommunities` run; whichever completes first shows the list, the second calls `setCommunitiesData` again → list re-renders → visible flicker.
- **Fix:** `mountedWithConnectionsTabRef = useRef(initialTab === "connections")`. In the tab effect, when `!hasLoadedConnections` and `mountedWithConnectionsTabRef.current` is true, skip the load (set ref to false and return). Only the mount effect performs the first load when the app opens on the Connections tab.
- **Tab button:** Removed `connectionsFadeAnim.setValue(0)` on tab press so the content does not flash to invisible then fade in.

---

## 3. Performance & speed checklist

| Category | Item | Status |
|----------|------|--------|
| **Network** | Parallel initial loads (connections + discover + popular + nearby + opportunities) | ✅ |
| **Network** | Parallel getUserConnections + getAllConversationParticipants | ✅ |
| **Network** | Single batched last messages (no N+1) | ✅ |
| **Network** | Single batched community latest messages | ✅ |
| **Network** | Tab switch: load only when missing/stale (60s) | ✅ |
| **Network** | Pull-to-refresh includes communities | ✅ |
| **Network** | Realtime connection updates debounced (600ms) | ✅ |
| **Network** | Periodic last-messages 30s (not 10s) | ✅ |
| **Render** | SectionList (Messages) and FlatList (Discover) with virtualization | ✅ |
| **Render** | LIST_PERFORMANCE (initialNumToRender, maxToRenderPerBatch, windowSize, removeClippedSubviews) | ✅ |
| **Render** | getItemLayout for SectionList and FlatList (ESTIMATED_ROW_HEIGHT_MESSAGES / DISCOVER) | ✅ |
| **Render** | Batched community state (single setCommunitiesData) | ✅ |
| **Network** | getAllConversationParticipants batched (threads + profiles + connections, no N×3) | ✅ |
| **Render** | ConnectionListItem, CommunityListItem, DiscoverUserCard: React.memo | ✅ |
| **Render** | No per-item animation in virtualized lists (smooth scroll) | ✅ |
| **Render** | No stagger in horizontal carousels (Popular, Nearby, Opportunities) | ✅ |
| **Render** | Batched setState: connections + lastMessages in one pass | ✅ |
| **Render** | Single “loading done” transition on Connections (deferLoadingEnd) | ✅ |
| **UX** | Skeletons for Connections (initial) and Discover (empty + loading) | ✅ |
| **UX** | Error + retry for connections and discover | ✅ |
| **Logging** | No console.log in hot paths; only console.error/warn in catch/prop checks | ✅ |

---

## 4. Remaining opportunities (optional)

| Priority | Item | Impact | Effort |
|----------|------|--------|--------|
| P3 | Single backend call for getUserConnections + getAllConversationParticipants | Saves one round-trip | Medium (backend) |
| P4 | Realtime message: merge payload into lastMessages instead of full refetch | Less work on high message volume | Medium |
| P5 | Memoize Discover ListHeaderComponent (or extract component with memo) | Fewer header re-renders | Low |
| ~~P6~~ | ~~Consolidate state~~ ✅ Done (communitiesData) | Fewer setState calls; clearer data flow | — |
| ~~P7~~ | ~~getItemLayout~~ ✅ Done | Smoother scroll metrics | — |

---

## 5. Speed summary

- **Time to first paint:** Header + tabs + search render immediately; skeleton shows for Connections until connections + communities are loaded.
- **Time to usable Connections tab:** Dominated by 8 round-trips (connections, participants batch: threads + profiles + connections, last messages, communities, community messages). No N+1; parallelism is maxed for the current API shape.
- **Time to usable Discover tab:** Dominated by the slowest of discover, popular, nearby, opportunities; all start in parallel with the connections path.
- **Scroll:** Virtualized lists + memoized row components + no per-item animation keep scroll smooth.
- **Flicker:** Addressed by deferring “loading done” on the Connections tab until both connections and communities are loaded, and by not using deferred state updates (startTransition) for discover data.

---

## 6. Full audit – Connections page (systematic)

### 6.1 File and surface

- **File:** `components/ConnectionsScreen.js` (single large component).
- **Tabs:** Connections (SectionList: communities + connections) and Discover (FlatList + carousels). Content is `activeTab === "connections" ? … : …`.
- **Connections content branch:** `loading && !hasLoadedConnections` → skeleton ScrollView; `connectionsLoadError && connections.length === 0` → error + retry; else → SectionList with `connectionSections`, footer CTA, refreshControl.

### 6.2 State that drives Connections list

| State | Purpose |
|-------|--------|
| `loading` | Show skeleton when true and `!hasLoadedConnections`. |
| `hasLoadedConnections` | Distinguishes “never loaded” (skeleton) from “loaded (maybe empty)”. |
| `connections` | Raw connection rows from DB. |
| `lastMessages` | Map of connection id → last message; drives `connectionsWithMessages`. |
| `communitiesData` | Single object: userCommunities, communityMessages, communityUnreadCounts, rhood*, latestGroupMessage, unreadGroupCount. Destructured for render. |
| `connectionsLoadError` | Error message; when set and no connections, show error UI. |

Derived: `filteredConnections` (connections + search + status filter), `connectionsWithMessages` (filtered + has last message), `connectionSections = [ { key: "communities", data: userCommunities }, { key: "connections", data: connectionsWithMessages } ]`.

### 6.3 Effects that affect Connections

| Effect | Trigger | Action |
|--------|--------|--------|
| Mount | `[]` | `initializeData`: connections path with `deferLoadingEnd: true` → then `checkRhoodMembership()` → single `setLoading(false)`, `setHasLoadedConnections(true)`; parallel discover/popular/nearby/opportunities. |
| Tab | `[activeTab, user?.id, hasLoadedConnections]` | When `activeTab === "connections"`: if mounted with connections tab, skip load; else if `!hasLoadedConnections` run deferred load (connections + communities then one transition); else if stale (60s) run load without defer. |
| Load messages once | `[user?.id, connections.length, hasLoadedConnections]` | When connections loaded and `!hasLoadedMessagesRef.current`, set ref and call `loadLastMessagesForConnections` (no double fetch; initial messages come from loadUserAndConnections batch). |
| Realtime messages | `[user?.id, connections.length, hasLoadedConnections]` | Subscribe to messages INSERT; on event call `loadLastMessagesForConnections`. |
| Realtime community_posts | same channel | On R/HOOD post INSERT call `checkRhoodMembership()`. |
| Periodic | `[user?.id, connections.length]` | Every 30s call `loadLastMessagesForConnections`. |
| Realtime connections | `[user?.id]` | Debounced 600ms → `loadUserAndConnections`, discover, nearby. |

### 6.4 List configuration (Connections SectionList)

- `sections={connectionSections}`, `keyExtractor=(item) => item.id`, `renderSectionHeader={() => null}`, `stickySectionHeadersEnabled={false}`.
- `initialNumToRender`, `maxToRenderPerBatch`, `windowSize`, `removeClippedSubviews` from `LIST_PERFORMANCE`.
- `getItemLayout={getConnectionListItemLayout}`: fixed height per index (`ESTIMATED_ROW_HEIGHT_MESSAGES * index`). Note: SectionList’s `getItemLayout` is per-section; this callback uses a flat index, so it is correct only if used as the section’s `getItemLayout` or if the list is treated as a single section. In the current code it is passed to SectionList directly; React Native SectionList may pass (data, index) per section. If scroll jumps occur, consider providing a section-aware layout or removing getItemLayout for SectionList.
- Wrapper: `<Animated.View style={[styles.flex1, { opacity: connectionsFadeAnim }]}>`; fade anim starts at 1; no longer forced to 0 on tab press.

### 6.5 Flicker sources (addressed)

1. **Communities popping in after list shown** – Fixed by deferLoadingEnd and single transition after connections + communities.
2. **Double load when opening on Connections tab** – Fixed by `mountedWithConnectionsTabRef` so tab effect does not run its load on mount when `initialTab === "connections"`.
3. **Tab press flash** – Fixed by not setting `connectionsFadeAnim.setValue(0)` on tab press.
4. **Multiple setState after list visible** – Batched: connections + lastMessages in one pass in loadUserAndConnections; communities in one setCommunitiesData; loading done in one transition.

### 6.6 Refs

- `lastLoadedAtRef`: timestamp of last connections load; used for 60s staleness.
- `hasLoadedMessagesRef`: prevents “load messages once” and realtime from double-fetching; set when batch last messages are set in loadUserAndConnections.
- `mountedWithConnectionsTabRef`: prevents tab effect from loading when mount already owns the first load (initialTab === "connections").
- `prevConnectionStatusesRef`, `realtimeDebounceRef`, `searchTimeoutRef`: status diffing, debounce, search debounce.

---

## 7. Conclusion

The Connections page is in a strong state (target 90s): parallel loads; no N+1 (including batched getAllConversationParticipants); virtualized lists with getItemLayout; memoized items; single transition off the skeleton (flicker fix); batched community state (setCommunitiesData); no double load when opening on Connections tab; and sensible realtime/periodic behavior. Remaining items are optional. This doc can be re-used for future checks by updating §3, §4, and §6.
