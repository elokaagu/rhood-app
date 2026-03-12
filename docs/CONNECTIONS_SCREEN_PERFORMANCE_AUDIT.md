# Connections Screen – Performance Audit

## Summary

The Connections tab loads slowly and feels janky because:

1. **Data loads in a long waterfall** – Several big requests run one after another instead of in parallel.
2. **N+1-style queries** – Last messages and community data are loaded with one request per thread/community.
3. **Many separate state updates** – Each fetch updates state on its own, so the UI re-renders in stages and content “pops in” over time.
4. **No list virtualization** – The main content is in a single `ScrollView` with `.map()`; everything is mounted at once.
5. **Heavy work and logging** – Console logs and work on the JS thread add cost, especially during initial load.

---

## 1. Waterfall loading (main cause of slow load)

**Where:** `useEffect` around lines 482–495.

**What happens:**

```javascript
const initializeData = async () => {
  await loadUserAndConnections({ showLoader: true });  // ① Waits to finish
  await loadDiscoverDJs();                              // ② Then runs
  await loadPopularDJs();                               // ③ Then runs
  await loadNearbyDJs();                                // ④ Then runs
  await checkRhoodMembership();                         // ⑤ Then runs (calls loadUserCommunities)
};
initializeData();
```

Each step waits for the previous one. So total time is roughly:

**T_total ≈ T_connections + T_discover + T_popular + T_nearby + T_communities**

If each step is 200–800 ms (network + DB), the screen can take **several seconds** before everything is ready.

**Fix:** Load in parallel where possible, and show the UI as data arrives:

- Run `loadPopularDJs()`, `loadNearbyDJs()`, `loadNearbyOpportunities()` in parallel (e.g. `Promise.all`).
- Run `loadUserAndConnections()` and `loadDiscoverDJs()` in parallel if they don’t depend on each other.
- Defer non-critical data (e.g. popular DJs, nearby) until after the first paint or after connections/discover have started loading.

---

## 2. N+1 queries

### 2a. Last messages for connections

**Where:** `lib/supabase.js` – `getLastMessagesForAllConnections(userId)` (around 2276).

**What happens:**

1. One call: `getAllUserMessageThreads(userId)`.
2. Then **one Supabase query per thread** inside `threads.map(...)` to get the last message for that thread.

So for 20 threads you get **1 + 20 = 21** round-trips. Each round-trip has latency, so this can add **hundreds of ms to over a second**.

**Fix:**

- Prefer a **single query** that returns the latest message per thread (e.g. lateral join, window function, or a DB function that returns `thread_id -> last_message` in one go).
- Or at least **batch** (e.g. get last message for many `thread_id`s in one request) instead of one request per thread.

### 2b. Community latest message and unread (per community)

**Where:** `ConnectionsScreen.js` – `loadUserCommunities()` (around 911–965).

**What happens:**

```javascript
for (const community of communities) {
  const latestMessage = await db.getLatestGroupMessage(community.id);  // 1 query per community
  const unreadCount = await db.getUnreadGroupMessageCount(community.id, user.id);  // 1 per community
}
```

For 5 communities that’s **5 + 5 = 10** extra round-trips after `getUserCommunities()`. (`getUnreadGroupMessageCount` currently returns 0, but the loop pattern is still N+1 for latest message.)

**Fix:**

- Add a **single API/DB function** that returns, for the current user, all communities with their latest message (and unread count if you implement it) in one call.
- Call that once and then `setUserCommunities`, `setCommunityMessages`, `setCommunityUnreadCounts` from the result.

---

## 3. Duplicate and redundant work on mount / tab switch

**Where:** Multiple `useEffect`s and tab press handler.

**What happens:**

- On mount, `initializeData()` runs the full waterfall.
- When the user switches to the **Messages** tab, `useEffect` (498–504) runs `loadUserAndConnections()` and `loadUserCommunities()` again if `!hasLoadedConnections`.
- Tapping the Messages tab (2035–2056) also calls `loadUserAndConnections()` every time.

So you can get **repeated full reloads** of connections and communities when switching tabs, which makes the tab feel slow and can cause flicker.

**Fix:**

- Use a single source of truth for “connections/communities loaded” and avoid calling `loadUserAndConnections` / `loadUserCommunities` again on every tab switch if data was just loaded.
- Optionally debounce or guard so that rapid tab switches don’t trigger multiple full reloads.

---

## 4. Janky, staged appearance (many state updates)

**Where:** Entire screen; each `set*` after a fetch triggers a re-render.

**What happens:**

- `setLoading(false)` after connections load → re-render.
- `setPopularDJs(...)` → re-render → “Popular DJs” section appears.
- `setNearbyDJs(...)` → re-render → “DJs Near You” appears.
- `setDiscoverUsers(...)` → re-render → discover list appears.
- `setUserCommunities(...)` / `setCommunityMessages(...)` → re-render → Messages list updates.
- `setLastMessages(...)` → re-render → message previews appear.

So the UI updates in **several distinct steps**. Combined with the waterfall, that’s why different parts of the screen load at different times and feel janky.

**Fix:**

- Load data in parallel so more of it is ready in one or two “waves” instead of five.
- Optionally **batch state updates** (e.g. one state object or reducer) so you can do a single `setState` for “connections + communities + last messages” where possible, reducing the number of re-renders and “pop-in” steps.

---

## 5. No list virtualization (ScrollView + .map)

**Where:** Main content (around 1972–2695): one `ScrollView` containing:

- Communities: `(userCommunities || []).map(...)`
- Connections: `(connectionsWithMessages || []).map(...)` (with `ConnectionListItem`)
- Popular DJs: horizontal `ScrollView` + `popularDJs.map(...)`
- Nearby DJs: horizontal `ScrollView` + `nearbyDJs.map(...)`
- Nearby opportunities: horizontal `ScrollView` + `nearbyOpportunities.map(...)`
- Incoming requests: `incomingConnectionRequests.map(...)`
- Discover list: `filteredDiscoverUsers.map(...)`

**What happens:**

- Every row/card is mounted at once. With many connections and discover users, that’s a lot of components and layout work on first load.
- Scroll can drop frames when many items are in the tree and images/placeholders are loading.

**Fix:**

- For the **main vertical list** (connections + discover list), use **FlatList** (or SectionList if you need sections) with:
  - `initialNumToRender` (e.g. 10–15)
  - `windowSize` / `maxToRenderPerBatch` from your existing `LIST_PERFORMANCE` constants
- Keep horizontal carousels as they are (they’re small); focus virtualization on the long vertical list(s).

---

## 6. Console logging in hot paths

**Where:** Multiple places in `ConnectionsScreen.js` and `lib/supabase.js`.

**Examples:**

- `loadUserAndConnections`: logs raw connections, conversation participants, per-connection debug.
- `loadLastMessagesForConnections`: logs user id, connections, last messages, keys.
- `getLastMessageContent` / `getLastMessageSender`: log per connection when rendering list items.
- `loadDiscoverDJs`: logs existing connections, connection data, status map.
- `getLastMessagesForAllConnections`: logs thread count.

**What happens:**

- In development, logging objects and arrays is expensive and runs on the JS thread. When it happens for every connection or every list item render, it can add noticeable delay and contribute to jank.

**Fix:**

- Remove or guard with `__DEV__` and/or a debug flag so production and normal dev builds don’t pay the cost.
- Avoid logging inside list `renderItem` / per-item callbacks; at most log once per load (e.g. “loaded N connections”).

---

## 7. Extra work inside loadUserAndConnections

**Where:** `loadUserAndConnections` (505–789).

**What happens:**

- If `propUser` is missing: 100 ms delay, then `getUser()`, then possibly `getSession()`.
- Then: `getUserConnections()`, `getAllConversationParticipants()`, then `loadLastMessagesForConnections()` (which does the N+1 last-message queries).
- A lot of work and state updates (connections map, last messages, modals) happen in one long function, so the “connections” tab stays loading until all of it finishes.

**Fix:**

- Ensure the parent passes `user` so you don’t need the delay + dual auth fetch on this screen.
- Run “connections + participants” and “last messages” in parallel if the UI can show connections first and fill in last message text in a second step; or reduce last-message cost by fixing the N+1 (see §2a).

---

## 8. Periodic and real-time refresh

**Where:** useEffects around 865–875 (periodic refresh) and 816–863 (realtime subscription).

**What happens:**

- Every **10 seconds**, `loadLastMessagesForConnections(user.id, connections)` runs again. That re-runs the N+1 last-message logic and triggers another full state update and re-render.
- Realtime subscription on connection changes calls `loadUserAndConnections()`, `loadDiscoverDJs()`, `loadNearbyDJs()` on every event, which can cause bursts of load and re-renders.

**Fix:**

- For periodic refresh: consider a lighter-weight “only new messages” or “only updated threads” API so you’re not re-fetching all last messages every 10 s.
- For realtime: update only the affected connection or discover user in state instead of refetching the entire lists when possible.

---

## 9. AnimatedListItem stagger

**Where:** Popular DJs, nearby DJs, opportunities, discover list use `AnimatedListItem` with a delay (e.g. 50–80 ms per item).

**What happens:**

- Staggered animation spreads mount and animation work over time. With many items, that can make the list feel like it’s “loading” for a long time and can interact badly with many re-renders from sequential state updates.

**Fix:**

- Reduce delay (e.g. 20–30 ms) or use a single fade for the whole block instead of per-item stagger for long lists.
- Prefer applying animation to the container (e.g. one `Animated.View` for the section) so you don’t pay per-item animation cost on large lists.

---

## Recommended priority

| Priority | Issue | Impact | Effort |
|----------|--------|--------|--------|
| P0 | Run initial loads in parallel; defer non-critical (popular, nearby) | Big reduction in time to first meaningful content | Medium |
| P0 | Fix N+1 in `getLastMessagesForAllConnections` (single or batched query) | Large reduction in connections-tab load time | Medium |
| P1 | Fix N+1 in `loadUserCommunities` (one API for communities + latest message) | Faster Messages tab and less jank | Low–Medium |
| P1 | Virtualize main list (FlatList/SectionList) with LIST_PERFORMANCE | Smoother scroll and faster first paint | Medium |
| P2 | Avoid refetching on every Messages tab switch; guard realtime/periodic refresh | Fewer redundant requests and re-renders | Low |
| P2 | Remove or gate console logs in hot paths and list render | Less JS work, smoother UI in dev | Low |
| P3 | Batch state updates where possible; reduce AnimatedListItem stagger on long lists | Fewer re-renders and less “pop-in” | Low–Medium |

---

## Quick wins you can do first

1. **Parallelize initial load:** Replace the sequential `await` chain in `initializeData` with `Promise.all([loadUserAndConnections(...), loadDiscoverDJs()])` and then `Promise.all([loadPopularDJs(), loadNearbyDJs(), loadNearbyOpportunities()])` (and optionally run the second group after the first, or after a short delay, so the screen shows connections/discover first).
2. **Don’t call `loadUserAndConnections()` on every Messages tab press** – only when `!hasLoadedConnections` or on explicit pull-to-refresh.
3. **Wrap or remove `console.log`** in `loadUserAndConnections`, `loadLastMessagesForConnections`, `getLastMessageContent`, `getLastMessageSender`, and `loadDiscoverDJs` (e.g. `if (__DEV__ && DEBUG_CONNECTIONS) console.log(...)`).
4. **Reduce AnimatedListItem delay** for discover list (e.g. from 80 to 30 ms) or use a single fade for the section.

Implementing P0 and the quick wins should already make the Connections tab feel much faster and less janky; then you can tackle N+1 and virtualization for further gains.
