// Performance and Animation Constants
// Centralized configuration for consistent, smooth animations

export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 250,
  SLOW: 350,
  VERY_SLOW: 500,
};

export const ANIMATION_EASING = {
  EASE_IN: 'ease-in',
  EASE_OUT: 'ease-out',
  EASE_IN_OUT: 'ease-in-out',
  LINEAR: 'linear',
};

// Native driver animations for better performance
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

// Transition styles
export const TRANSITION_STYLES = {
  SLIDE_UP: {
    transform: [{ translateY: 300 }],
    opacity: 0,
  },
  SLIDE_DOWN: {
    transform: [{ translateY: -300 }],
    opacity: 0,
  },
  FADE_IN: {
    opacity: 0,
  },
  FADE_OUT: {
    opacity: 1,
  },
  SCALE_IN: {
    transform: [{ scale: 0.8 }],
    opacity: 0,
  },
  SCALE_OUT: {
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
};

// Image loading settings
export const IMAGE_LOADING = {
  CACHE_SIZE: 50,
  PREFETCH_DISTANCE: 3,
  PLACEHOLDER_BLUR_RADIUS: 1,
};

// Haptic feedback patterns
export const HAPTIC_PATTERNS = {
  LIGHT: 'light',
  MEDIUM: 'medium',
  HEAVY: 'heavy',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  SELECTION: 'selection',
};
