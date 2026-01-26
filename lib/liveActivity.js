/**
 * Live Activity Manager for iOS
 * 
 * Manages Live Activities and Lock Screen widgets via native bridge
 * Falls back to shared storage updates for widgets when Live Activities aren't available
 */

import { NativeModules, Platform } from 'react-native';

const { LiveActivityModule } = NativeModules;

class LiveActivityManager {
  constructor() {
    this.isAvailable = Platform.OS === 'ios' && LiveActivityModule !== null;
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
      console.warn('⚠️ Live Activity module not available');
      return { success: false };
    }

    try {
      const result = await LiveActivityModule.startLiveActivity({
        title: state.title || 'R/HOOD Mix',
        artist: state.artist || 'Unknown Artist',
        isPlaying: state.isPlaying ?? false,
        position: state.position || 0,
        duration: state.duration || 0,
        artwork: state.artwork || null,
      });

      console.log('✅ Live Activity started:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to start Live Activity:', error);
      // Fallback to shared state update
      await this.updateSharedState(state);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update an active Live Activity
   * @param {Object} state - Updated playback state
   */
  async updateLiveActivity(state) {
    if (!this.isAvailable) {
      // Fallback to shared state update
      await this.updateSharedState(state);
      return { success: true };
    }

    try {
      const result = await LiveActivityModule.updateLiveActivity({
        title: state.title || 'R/HOOD Mix',
        artist: state.artist || 'Unknown Artist',
        isPlaying: state.isPlaying ?? false,
        position: state.position || 0,
        duration: state.duration || 0,
        artwork: state.artwork || null,
      });

      // Also update shared state for widget fallback
      await this.updateSharedState(state);
      return result;
    } catch (error) {
      console.error('❌ Failed to update Live Activity:', error);
      // Fallback to shared state update
      await this.updateSharedState(state);
      return { success: false, error: error.message };
    }
  }

  /**
   * End the active Live Activity
   */
  async endLiveActivity() {
    if (!this.isAvailable) {
      return { success: true };
    }

    try {
      const result = await LiveActivityModule.endLiveActivity();
      console.log('✅ Live Activity ended:', result);
      return result;
    } catch (error) {
      console.error('❌ Failed to end Live Activity:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update shared state in App Group UserDefaults
   * This is used by widgets and as a fallback when Live Activities aren't available
   * @param {Object} state - Current playback state
   */
  async updateSharedState(state) {
    if (!this.isAvailable) {
      console.warn('⚠️ Live Activity module not available, cannot update shared state');
      return;
    }

    try {
      await LiveActivityModule.updateSharedState({
        title: state.title || 'R/HOOD Mix',
        artist: state.artist || 'Unknown Artist',
        isPlaying: state.isPlaying ?? false,
        position: state.position || 0,
        duration: state.duration || 0,
        artwork: state.artwork || null,
      });
    } catch (error) {
      console.error('❌ Failed to update shared state:', error);
    }
  }
}

export default new LiveActivityManager();
