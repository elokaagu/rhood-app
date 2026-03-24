// Central tuning for animations, FlatList/SectionList behavior, image loading, and a few app limits.
// Split into animationConstants / listPerformanceConstants / appLimits if this grows further.

// Application limits
export const APPLICATION_LIMITS = {
  DAILY_LIMIT: 5,
};

export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 250,
  SLOW: 350,
  VERY_SLOW: 500,
};

export const NATIVE_ANIMATION_CONFIG = {
  duration: ANIMATION_DURATION.NORMAL,
  useNativeDriver: true,
};

export const SPRING_CONFIG = {
  tension: 100,
  friction: 8,
  useNativeDriver: true,
};

export const BOUNCE_CONFIG = {
  tension: 300,
  friction: 8,
  useNativeDriver: true,
};

/**
 * Typical starting `style` snapshots for Animated sequences (not full transition configs).
 * Pair with Animated.timing/spring to the desired end state.
 */
export const ANIMATION_PRESETS = {
  SLIDE_UP_INITIAL: {
    transform: [{ translateY: 300 }],
    opacity: 0,
  },
  SLIDE_DOWN_INITIAL: {
    transform: [{ translateY: -300 }],
    opacity: 0,
  },
  FADE_HIDDEN: {
    opacity: 0,
  },
  /** Full opacity — common start before animating out to 0 */
  FADE_VISIBLE: {
    opacity: 1,
  },
  SCALE_SMALL_INITIAL: {
    transform: [{ scale: 0.8 }],
    opacity: 0,
  },
  SCALE_LARGE_INITIAL: {
    transform: [{ scale: 1.2 }],
    opacity: 0,
  },
};

// Performance thresholds
export const PERFORMANCE_THRESHOLDS = {
  SWIPE_THRESHOLD: 50,
  VELOCITY_THRESHOLD: 0.5,
  LONG_PRESS_DURATION: 500,
  DEBOUNCE_DELAY: 300,
};

// List performance settings
export const LIST_PERFORMANCE = {
  INITIAL_NUM_TO_RENDER: 10,
  MAX_TO_RENDER_PER_BATCH: 5,
  WINDOW_SIZE: 10,
  REMOVE_CLIPPED_SUBVIEWS: true,
  GET_ITEM_LAYOUT: null, // To be set per list
  ESTIMATED_ROW_HEIGHT_MESSAGES: 88, // ConnectionListItem / CommunityListItem
  ESTIMATED_ROW_HEIGHT_DISCOVER: 220, // DiscoverUserCard
};

// Listen screen list row heights for getItemLayout (smoother scroll, fewer layout passes)
export const LISTEN_LIST_PERFORMANCE = {
  ESTIMATED_MIX_ROW_HEIGHT: 80,
  ESTIMATED_PLAYLIST_ROW_HEIGHT: 72,
  ESTIMATED_HORIZONTAL_SECTION_HEIGHT: 220,
  /** Section title + spacing; tune if Listen headers change layout */
  ESTIMATED_SECTION_HEADER_HEIGHT: 80,
};

/**
 * Listen SectionList/FlatList: slightly larger window/batch than default lists — long mixed feed,
 * horizontal rows; extra buffer reduces blanking while scrolling fast.
 */
export const LISTEN_SECTION_LIST_PERFORMANCE = {
  INITIAL_NUM_TO_RENDER: 12,
  MAX_TO_RENDER_PER_BATCH: 8,
  /** How many screen-heights of content to keep mounted (trade memory vs scroll smoothness) */
  WINDOW_SIZE: 15,
  REMOVE_CLIPPED_SUBVIEWS: true,
};

/**
 * Connections tab: many uniform rows; higher initial + batch fills viewport quickly on open.
 */
export const CONNECTIONS_LIST_PERFORMANCE = {
  INITIAL_NUM_TO_RENDER: 20,
  MAX_TO_RENDER_PER_BATCH: 10,
  WINDOW_SIZE: 15,
  REMOVE_CLIPPED_SUBVIEWS: true,
  ESTIMATED_ROW_HEIGHT_MESSAGES: 88,
};

/**
 * Your Likes: section headers + mix rows; same window/batch idea as Connections.
 */
export const YOUR_LIKES_LIST_PERFORMANCE = {
  INITIAL_NUM_TO_RENDER: 20,
  MAX_TO_RENDER_PER_BATCH: 10,
  WINDOW_SIZE: 15,
  REMOVE_CLIPPED_SUBVIEWS: true,
  ESTIMATED_ROW_HEIGHT: 96, // popularRow ~72 + padding
  ESTIMATED_SECTION_HEADER_HEIGHT: 80,
};

// Image loading settings
export const IMAGE_LOADING = {
  CACHE_SIZE: 50,
  PREFETCH_DISTANCE: 3,
  PLACEHOLDER_BLUR_RADIUS: 1,
};
