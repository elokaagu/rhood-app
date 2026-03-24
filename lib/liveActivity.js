/**
 * Live Activity Manager for iOS
 * 
 * Manages Live Activities and Lock Screen widgets via native bridge
 * Attempts shared storage updates for widgets when native methods are available
 */

import { NativeModules, Platform } from 'react-native';

const { LiveActivityModule } = NativeModules;

class LiveActivityManager {
  constructor() {
    this.isAvailable = Platform.OS === 'ios' && !!LiveActivityModule;
  }

  normalizeSeconds(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
  }

  buildPayload(state = {}) {
    return {
      title: state.title || 'R/HOOD Mix',
      artist: state.artist || 'Unknown Artist',
      isPlaying: state.isPlaying ?? false,
      position: this.normalizeSeconds(state.position),
      duration: this.normalizeSeconds(state.duration),
      artwork: state.artwork || null,
    };
  }

  /**
   * Start a Live Activity for audio playback
   * @param {Object} state - Current playback state
   * @param {string} state.title - Track title
   * @param {string} state.artist - Artist name
   * @param {boolean} state.isPlaying - Whether audio is playing
   * @param {number} state.position - Current position in seconds
   * @param {number} state.duration - Total duration in seconds
   * @param {string} [state.artwork] - Artwork URL
   */
  async startLiveActivity(state) {
    if (!this.isAvailable) {
      if (__DEV__) console.warn('Live Activity module not available');
      return { success: false, reason: 'module_unavailable' };
    }

    try {
      const result = await LiveActivityModule.startLiveActivity(this.buildPayload(state));

      if (__DEV__) console.log('Live Activity started:', result);
      return result;
    } catch (error) {
      if (__DEV__) console.error('Failed to start Live Activity:', error);
      // Best-effort shared state update for widgets.
      await this.updateSharedState(state);
      return { success: false, error: error?.message || 'unknown_error' };
    }
  }

  /**
   * Update an active Live Activity
   * @param {Object} state - Updated playback state
   */
  async updateLiveActivity(state) {
    if (!this.isAvailable) {
      const fallback = await this.updateSharedState(state);
      return { success: false, reason: 'module_unavailable', fallback };
    }

    try {
      const payload = this.buildPayload(state);
      const result = await LiveActivityModule.updateLiveActivity(payload);

      // Also update shared state for widget surfaces.
      await this.updateSharedState(state);
      return result;
    } catch (error) {
      if (__DEV__) console.error('Failed to update Live Activity:', error);
      // Best-effort shared state update for widgets.
      await this.updateSharedState(state);
      return { success: false, error: error?.message || 'unknown_error' };
    }
  }

  /**
   * End the active Live Activity
   */
  async endLiveActivity() {
    if (!this.isAvailable) {
      return { success: false, reason: 'module_unavailable' };
    }

    try {
      const result = await LiveActivityModule.endLiveActivity();
      if (__DEV__) console.log('Live Activity ended:', result);
      return result;
    } catch (error) {
      if (__DEV__) console.error('Failed to end Live Activity:', error);
      return { success: false, error: error?.message || 'unknown_error' };
    }
  }

  /**
   * Update shared state in App Group UserDefaults
   * This is used by widgets and as a fallback when Live Activities aren't available
   * @param {Object} state - Current playback state
   */
  async updateSharedState(state) {
    if (!this.isAvailable || typeof LiveActivityModule?.updateSharedState !== 'function') {
      return { success: false, reason: 'shared_state_unavailable' };
    }

    try {
      await LiveActivityModule.updateSharedState(this.buildPayload(state));
      return { success: true };
    } catch (error) {
      if (__DEV__) console.error('Failed to update shared state:', error);
      return { success: false, error: error?.message || 'unknown_error' };
    }
  }
}

export default new LiveActivityManager();
