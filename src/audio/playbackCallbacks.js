// src/audio/playbackCallbacks.js
// Global callback registry for connecting remote controls to App.js audio functions

class PlaybackCallbacks {
  constructor() {
    this.callbacks = {
      onPlay: null,
      onPause: null,
      onResume: null,
      onStop: null,
      onNext: null,
      onPrevious: null,
      onSeek: null,
      onJumpForward: null,
      onJumpBackward: null,
    };
  }

  /**
   * Register callbacks from App.js
   */
  register(callbacks) {
    Object.keys(callbacks).forEach((key) => {
      if (this.callbacks.hasOwnProperty(key) && callbacks[key]) {
        this.callbacks[key] = callbacks[key];
        console.log(`✅ [CALLBACKS] Registered callback: ${key}`);
      }
    });
  }

  /**
   * Unregister all callbacks
   */
  unregister() {
    Object.keys(this.callbacks).forEach((key) => {
      this.callbacks[key] = null;
    });
    console.log("🧹 [CALLBACKS] All callbacks unregistered");
  }

  /**
   * Call a registered callback
   */
  async call(key, ...args) {
    const callback = this.callbacks[key];
    if (callback && typeof callback === "function") {
      try {
        await callback(...args);
        console.log(`✅ [CALLBACKS] Called callback: ${key}`);
        return true;
      } catch (error) {
        console.error(`❌ [CALLBACKS] Error calling callback ${key}:`, error);
        return false;
      }
    } else {
      console.warn(`⚠️ [CALLBACKS] Callback ${key} not registered`);
      return false;
    }
  }
}

// Export singleton instance
const playbackCallbacks = new PlaybackCallbacks();
module.exports = playbackCallbacks;


