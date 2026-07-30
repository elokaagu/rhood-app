/**
 * Copy for Tutorial mode — one card per main area (same pattern as Opportunities swipe tutorial).
 * Keys must match {@link APP_TUTORIAL_SCREEN_IDS}.
 */

export const APP_TUTORIAL_SCREEN_IDS = {
  OPPORTUNITIES: "opportunities",
  CONNECTIONS: "connections",
  LISTEN: "listen",
  CREATE_HUB: "create-hub",
  CREATE_OPPORTUNITY: "create-opportunity",
  UPLOAD_MIX: "upload-mix",
  MESSAGES: "messages",
  PROFILE: "profile",
  COMMUNITY: "community",
  NOTIFICATIONS: "notifications",
  SETTINGS: "settings",
};

/**
 * Route-name to tutorial-screen mapping.
 * Keep tutorial identity decoupled from navigation string changes.
 */
export const APP_TUTORIAL_ROUTE_TO_SCREEN_ID = {
  opportunities: APP_TUTORIAL_SCREEN_IDS.OPPORTUNITIES,
  connections: APP_TUTORIAL_SCREEN_IDS.CONNECTIONS,
  listen: APP_TUTORIAL_SCREEN_IDS.LISTEN,
  "create-hub": APP_TUTORIAL_SCREEN_IDS.CREATE_HUB,
  "create-opportunity": APP_TUTORIAL_SCREEN_IDS.CREATE_OPPORTUNITY,
  "upload-mix": APP_TUTORIAL_SCREEN_IDS.UPLOAD_MIX,
  upload_mix: APP_TUTORIAL_SCREEN_IDS.UPLOAD_MIX, // compatibility alias
  messages: APP_TUTORIAL_SCREEN_IDS.MESSAGES,
  profile: APP_TUTORIAL_SCREEN_IDS.PROFILE,
  community: APP_TUTORIAL_SCREEN_IDS.COMMUNITY,
  notifications: APP_TUTORIAL_SCREEN_IDS.NOTIFICATIONS,
  settings: APP_TUTORIAL_SCREEN_IDS.SETTINGS,
};

export function resolveTutorialScreenId(routeOrScreenId) {
  if (!routeOrScreenId) return null;
  const raw = String(routeOrScreenId);
  if (APP_TUTORIAL_CONTENT[raw]) return raw;
  return APP_TUTORIAL_ROUTE_TO_SCREEN_ID[raw] || null;
}

const DEFAULT_ICON_COLOR = "hsl(75, 100%, 60%)";
const row = (icon, title, body, iconColor = DEFAULT_ICON_COLOR) => ({
  icon,
  iconColor,
  title,
  body,
});

export const APP_TUTORIAL_CONTENT = {
  [APP_TUTORIAL_SCREEN_IDS.OPPORTUNITIES]: {
    title: "Opportunities",
    rows: [
      row(
        "arrow-forward",
        "Swipe right",
        "Apply for a gig. You have a daily limit, so check the counter above the cards."
      ),
      row(
        "arrow-back",
        "Swipe left",
        "Pass and move to the next opportunity. Tap a card to read full details before you apply.",
        "hsl(0, 100%, 60%)"
      ),
      row(
        "refresh",
        "Start over",
        "Once you run through every card, use the empty state to restart the deck and browse again."
      ),
    ],
  },
  [APP_TUTORIAL_SCREEN_IDS.CONNECTIONS]: {
    title: "Friends",
    rows: [
      row(
        "people",
        "Discover & Connect",
        "Use the tabs to switch between Discover (find DJs) and Chats (conversations with people you’re linked with)."
      ),
      row(
        "chatbubbles-outline",
        "Messages",
        "Open a chat from a profile or connection row to message DJs and crews."
      ),
      row(
        "location-outline",
        "Location",
        "Set your city so Discover can surface nearby DJs and more relevant local results."
      ),
    ],
  },
  [APP_TUTORIAL_SCREEN_IDS.LISTEN]: {
    title: "Listen",
    rows: [
      row(
        "flame",
        "Trending",
        "Browse what’s hot on R/HOOD. Tap a mix to play and use See all for the full list."
      ),
      row(
        "heart-outline",
        "Your likes & playlists",
        "Saved mixes and playlists live here. Search at the top filters both."
      ),
      row(
        "play-circle",
        "Playback",
        "Audio keeps playing as you browse. Use the mini player at the bottom to pause or jump back in."
      ),
    ],
  },
  [APP_TUTORIAL_SCREEN_IDS.CREATE_HUB]: {
    title: "Create",
    rows: [
      row(
        "cloud-upload-outline",
        "Upload a mix",
        "Share a set with the community. Add artwork and genres so listeners can find it."
      ),
      row(
        "megaphone-outline",
        "Create an opportunity",
        "Got a gig to fill? Submit it here and DJs on R/HOOD can apply."
      ),
      row(
        "shield-checkmark-outline",
        "Reviewed before it goes live",
        "Opportunities are checked by the R/HOOD team first, so the deck stays trustworthy."
      ),
    ],
  },
  [APP_TUTORIAL_SCREEN_IDS.CREATE_OPPORTUNITY]: {
    title: "New Opportunity",
    rows: [
      row(
        "shield-checkmark-outline",
        "Reviewed before it goes live",
        "Every submission is checked by the R/HOOD team before it reaches the deck, so the opportunity feed stays trustworthy for DJs."
      ),
      row(
        "image-outline",
        "Add a photo if you can",
        "Opportunities with a real photo tend to get noticed faster — a flyer or venue shot both work well."
      ),
      row(
        "time-outline",
        "You'll hear back",
        "Once reviewed, your opportunity goes live and DJs can start applying."
      ),
    ],
  },
  [APP_TUTORIAL_SCREEN_IDS.UPLOAD_MIX]: {
    title: "Upload Mix",
    rows: [
      row(
        "cloud-upload-outline",
        "Upload a mix",
        "Pick an audio file, add artwork and details, then submit. Progress shows while your file uploads."
      ),
      row(
        "musical-notes",
        "Genres & library",
        "Choose genres so listeners can find you. Your library helps you reuse or replace past uploads."
      ),
      row(
        "checkmark-circle-outline",
        "After upload",
        "Your mix appears on your profile and in Listen once processing completes."
      ),
    ],
  },
  [APP_TUTORIAL_SCREEN_IDS.MESSAGES]: {
    title: "Messages",
    rows: [
      row(
        "images-outline",
        "Media & links",
        "Send photos, videos, and links. Previews appear in the thread when supported."
      ),
      row(
        "mic-outline",
        "Voice & playback",
        "Voice notes and mix shares play inline. Tap to play or pause."
      ),
      row(
        "chevron-back",
        "Leave",
        "Swipe from the left edge or use back to return to Friends."
      ),
    ],
  },
  [APP_TUTORIAL_SCREEN_IDS.PROFILE]: {
    title: "Profile",
    rows: [
      row(
        "person",
        "Your DJ profile",
        "See your mixes, audio ID, and stats. Tap Edit profile in the menu to update your look and links."
      ),
      row(
        "share-social-outline",
        "Share & invite",
        "Share your profile or invite code so other DJs can join and connect."
      ),
      row(
        "settings-outline",
        "Settings",
        "Open the menu (top right) for notifications, help, account options, and Tutorial mode."
      ),
    ],
  },
  [APP_TUTORIAL_SCREEN_IDS.COMMUNITY]: {
    title: "Community",
    rows: [
      row(
        "people-circle-outline",
        "Crews & scenes",
        "Browse communities, search by name, and filter to find groups that fit your sound."
      ),
      row(
        "person-add-outline",
        "Join",
        "Open a community to view details and request to join when membership is open."
      ),
      row(
        "refresh",
        "Stay current",
        "Pull down to refresh the list after new communities are added."
      ),
    ],
  },
  [APP_TUTORIAL_SCREEN_IDS.NOTIFICATIONS]: {
    title: "Notifications",
    rows: [
      row(
        "notifications-outline",
        "Stay in the loop",
        "Connection requests, messages, and platform updates show up here. Tap an item to act on it."
      ),
      row(
        "checkmark-done-outline",
        "Read state",
        "Opening notifications helps clear badges on the menu icon."
      ),
      row(
        "settings-outline",
        "Notification preferences",
        "Use Settings to control which push and in-app alerts you receive."
      ),
    ],
  },
  [APP_TUTORIAL_SCREEN_IDS.SETTINGS]: {
    title: "Settings",
    rows: [
      row(
        "school-outline",
        "Tutorial mode",
        "Turn tips on to see a short guide on each main screen. Use “Show tips again” to reset."
      ),
      row(
        "shield-checkmark-outline",
        "Privacy & account",
        "Control email/phone visibility, notifications, and sign out from here."
      ),
      row(
        "notifications-outline",
        "App notifications",
        "Review push settings here if you want fewer alerts or to re-enable them."
      ),
    ],
  },
};
