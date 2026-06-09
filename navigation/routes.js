/**
 * Single source of truth for custom router screen ids (ScreenRouter / App state).
 * Import SCREENS.* instead of raw strings to avoid typos.
 */

export const SCREENS = Object.freeze({
  // Core tabs / primary hubs
  OPPORTUNITIES: "opportunities",
  LISTEN: "listen",
  MESSAGES_LIST: "messages-list",
  NOTIFICATIONS: "notifications",
  COMMUNITY: "community",
  TIPS: "tips",
  PROFILE: "profile",

  // Messaging / social (thread vs list)
  MESSAGES: "messages",
  CONNECTIONS: "connections",
  CONNECTIONS_LIST: "connections-list",
  USER_PROFILE: "user-profile",
  COMMUNITY_MEMBERS: "community-members",

  // Mixes / audio
  UPLOAD_MIX: "upload-mix",
  TRENDING_MIXES: "trending-mixes",
  YOUR_LIKES: "your-likes",
  PLAYLIST_DETAIL: "playlist-detail",

  // Account / auth
  SETTINGS: "settings",
  EDIT_PROFILE: "edit-profile",
  RESET_PASSWORD: "reset-password",
  LOGIN: "login",

  // Utility / legal / help
  ABOUT: "about",
  TERMS: "terms",
  PRIVACY: "privacy",
  HELP: "help",
  HELP_CHAT: "help-chat",
  TUTORIAL_MODE: "tutorial-mode",
  PRODUCT_FEEDBACK: "product-feedback",
  INVITE: "invite",
  ACHIEVEMENTS_LIST: "achievements-list",

  // Admin / brand
  ADMIN_APPLICATIONS: "admin-applications",
  BRAND_GIGS_PORTAL: "brand-gigs-portal",
});

/**
 * AppShell hides the floating tab bar on these full-bleed flows.
 * Frozen tuple — use `.includes(screenId)` (do not mutate).
 */
export const TAB_BAR_HIDDEN_SCREEN_IDS = Object.freeze([
  SCREENS.MESSAGES,
  SCREENS.HELP_CHAT,
]);

/** Inner height of anchored tab row (icon + label + vertical padding); safe area added in AppShell. */
export const ANCHORED_TAB_BAR_CONTENT_HEIGHT = 56;

/**
 * Gap between anchored tab bar and mini player (matches GlobalAudioPlayerUI).
 */
export const MINI_PLAYER_GAP_ABOVE_TAB_BAR = 8;

/**
 * Total height of mini player card (main row + progress) — keep aligned with MiniPlayerBar layout.
 * If the player UI changes, update here and verify GlobalAudioPlayerUI stacking.
 */
export const MINI_PLAYER_APPROX_TOTAL_HEIGHT = 66;
