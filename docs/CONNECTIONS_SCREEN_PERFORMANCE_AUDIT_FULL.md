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

- **Messages tab focused:** Effect runs only if `!hasLoadedConnections` or data older than 60s; calls `loadUserAndConnections()` and `loadUserCommunities()` (no `deferLoadingEnd`).
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

## 6. Conclusion

The Connections page is in a strong state (target 90s): parallel loads; no N+1 (including batched getAllConversationParticipants); virtualized lists with getItemLayout; memoized items; single transition off the skeleton (flicker fix); batched community state (setCommunitiesData); and sensible realtime/periodic behavior. Remaining items are optional. This doc can be re-used for future checks by updating §3 and §4.
