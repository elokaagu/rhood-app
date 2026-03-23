/**
 * Copy for Tutorial mode — one card per main area (same pattern as Opportunities swipe tutorial).
 * Keys must match {@link APP_TUTORIAL_SCREEN_IDS}.
 */

export const APP_TUTORIAL_SCREEN_IDS = {
  OPPORTUNITIES: "opportunities",
  CONNECTIONS: "connections",
  LISTEN: "listen",
  UPLOAD_MIX: "upload-mix",
  MESSAGES: "messages",
  PROFILE: "profile",
  COMMUNITY: "community",
  NOTIFICATIONS: "notifications",
  SETTINGS: "settings",
};

export const APP_TUTORIAL_CONTENT = {
  [APP_TUTORIAL_SCREEN_IDS.OPPORTUNITIES]: {
    title: "Opportunities",
    rows: [
      {
        icon: "arrow-forward",
        iconColor: "hsl(75, 100%, 60%)",
        title: "Swipe right",
        body: "Apply for a gig. You have a daily limit — check the counter above the cards.",
      },
      {
        icon: "arrow-back",
        iconColor: "hsl(0, 100%, 60%)",
        title: "Swipe left",
        body: "Pass and move to the next opportunity. Tap a card to read full details before you apply.",
      },
      {
        icon: "refresh",
        iconColor: "hsl(75, 100%, 60%)",
        title: "Start over",
        body: "When you’ve seen every card, you can start the deck again from the empty state.",
      },
    ],
  },
  [APP_TUTORIAL_SCREEN_IDS.CONNECTIONS]: {
    title: "Connections",
    rows: [
      {
        icon: "people",
        iconColor: "hsl(75, 100%, 60%)",
        title: "Discover & Connect",
        body: "Use the tabs to switch between Discover (find DJs) and Connections (people you’re linked with).",
      },
      {
        icon: "chatbubbles-outline",
        iconColor: "hsl(75, 100%, 60%)",
        title: "Messages",
        body: "Open a chat from a profile or connection row to message DJs and crews.",
      },
      {
        icon: "location-outline",
        iconColor: "hsl(75, 100%, 60%)",
        title: "Location",
        body: "Set your area so Discover can show relevant people nearby when you allow it.",
      },
    ],
  },
  [APP_TUTORIAL_SCREEN_IDS.LISTEN]: {
    title: "Listen",
    rows: [
      {
        icon: "flame",
        iconColor: "hsl(75, 100%, 60%)",
        title: "Trending",
        body: "Browse what’s hot on R/HOOD. Tap a mix to play; use See all for the full list.",
      },
      {
        icon: "heart-outline",
        iconColor: "hsl(75, 100%, 60%)",
        title: "Your likes & playlists",
        body: "Saved mixes and playlists live here. Search at the top filters mixes and playlists.",
      },
      {
        icon: "play-circle",
        iconColor: "hsl(75, 100%, 60%)",
        title: "Playback",
        body: "Audio keeps playing as you browse. Use the mini player at the bottom to pause or jump back in.",
      },
    ],
  },
  [APP_TUTORIAL_SCREEN_IDS.UPLOAD_MIX]: {
    title: "Create",
    rows: [
      {
        icon: "cloud-upload-outline",
        iconColor: "hsl(75, 100%, 60%)",
        title: "Upload a mix",
        body: "Pick an audio file, add artwork and details, then submit. Progress shows while your file uploads.",
      },
      {
        icon: "musical-notes",
        iconColor: "hsl(75, 100%, 60%)",
        title: "Genres & library",
        body: "Choose genres so listeners can find you. Your library helps you re-use or replace past uploads.",
      },
      {
        icon: "checkmark-circle-outline",
        iconColor: "hsl(75, 100%, 60%)",
        title: "After upload",
        body: "Your mix appears on your profile and in Listen once processing completes.",
      },
    ],
  },
  [APP_TUTORIAL_SCREEN_IDS.MESSAGES]: {
    title: "Messages",
    rows: [
      {
        icon: "images-outline",
        iconColor: "hsl(75, 100%, 60%)",
        title: "Media & links",
        body: "Send photos, videos, and links. Previews appear in the thread when supported.",
      },
      {
        icon: "mic-outline",
        iconColor: "hsl(75, 100%, 60%)",
        title: "Voice & playback",
        body: "Voice notes and mix shares play inline. Tap to play or pause.",
      },
      {
        icon: "chevron-back",
        iconColor: "hsl(75, 100%, 60%)",
        title: "Leave",
        body: "Swipe from the left edge or use back to return to Connections.",
      },
    ],
  },
  [APP_TUTORIAL_SCREEN_IDS.PROFILE]: {
    title: "Profile",
    rows: [
      {
        icon: "person",
        iconColor: "hsl(75, 100%, 60%)",
        title: "Your DJ page",
        body: "Shows your mixes, audio ID, and stats. Tap Edit profile in the menu to update your look and links.",
      },
      {
        icon: "share-social-outline",
        iconColor: "hsl(75, 100%, 60%)",
        title: "Share & invite",
        body: "Share your profile or invite code so other DJs can join and connect.",
      },
      {
        icon: "settings-outline",
        iconColor: "hsl(75, 100%, 60%)",
        title: "Settings",
        body: "Open the menu (top right) for notifications, help, account options, and Tutorial mode.",
      },
    ],
  },
  [APP_TUTORIAL_SCREEN_IDS.COMMUNITY]: {
    title: "Community",
    rows: [
      {
        icon: "people-circle-outline",
        iconColor: "hsl(75, 100%, 60%)",
        title: "Crews & scenes",
        body: "Browse communities, search by name, and filter to find groups that fit your sound.",
      },
      {
        icon: "person-add-outline",
        iconColor: "hsl(75, 100%, 60%)",
        title: "Join",
        body: "Open a community to see details and request to join when membership is open.",
      },
      {
        icon: "refresh",
        iconColor: "hsl(75, 100%, 60%)",
        title: "Stay current",
        body: "Pull down to refresh the list after new communities are added.",
      },
    ],
  },
  [APP_TUTORIAL_SCREEN_IDS.NOTIFICATIONS]: {
    title: "Notifications",
    rows: [
      {
        icon: "notifications-outline",
        iconColor: "hsl(75, 100%, 60%)",
        title: "Stay in the loop",
        body: "Connection requests, messages, and platform updates show up here. Tap an item to act on it.",
      },
      {
        icon: "checkmark-done-outline",
        iconColor: "hsl(75, 100%, 60%)",
        title: "Read state",
        body: "Opening notifications helps clear badges on the menu icon.",
      },
    ],
  },
  [APP_TUTORIAL_SCREEN_IDS.SETTINGS]: {
    title: "Settings",
    rows: [
      {
        icon: "school-outline",
        iconColor: "hsl(75, 100%, 60%)",
        title: "Tutorial mode",
        body: "Turn tips on to see a short guide on each main screen. Use “Show tips again” to reset.",
      },
      {
        icon: "shield-checkmark-outline",
        iconColor: "hsl(75, 100%, 60%)",
        title: "Privacy & account",
        body: "Control email/phone visibility, notifications, and sign out from here.",
      },
    ],
  },
};
