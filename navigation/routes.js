/**
 * Single source of truth for custom router screen ids (ScreenRouter / App state).
 * Import SCREENS.* instead of raw strings to avoid typos.
 */
export const SCREENS = {
  OPPORTUNITIES: "opportunities",
  MESSAGES: "messages",
  CONNECTIONS: "connections",
  MESSAGES_LIST: "messages-list",
  NOTIFICATIONS: "notifications",
  COMMUNITY: "community",
  PROFILE: "profile",
  SETTINGS: "settings",
  UPLOAD_MIX: "upload-mix",
  RESET_PASSWORD: "reset-password",
  EDIT_PROFILE: "edit-profile",
  USER_PROFILE: "user-profile",
  COMMUNITY_MEMBERS: "community-members",
  CONNECTIONS_LIST: "connections-list",
  ACHIEVEMENTS_LIST: "achievements-list",
  INVITE: "invite",
  ADMIN_APPLICATIONS: "admin-applications",
  BRAND_GIGS_PORTAL: "brand-gigs-portal",
  ABOUT: "about",
  TERMS: "terms",
  PRIVACY: "privacy",
  HELP: "help",
  HELP_CHAT: "help-chat",
  LISTEN: "listen",
  TRENDING_MIXES: "trending-mixes",
  YOUR_LIKES: "your-likes",
  PLAYLIST_DETAIL: "playlist-detail",
  LOGIN: "login",
};

/**
 * AppShell hides the floating tab bar on these full-bleed flows.
 * Add new ids here instead of hardcoding in AppShell.
 */
export const TAB_BAR_HIDDEN_SCREENS = new Set([
  SCREENS.MESSAGES,
  SCREENS.HELP_CHAT,
]);
