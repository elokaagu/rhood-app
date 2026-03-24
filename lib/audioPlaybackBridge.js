/**
 * Lets imperative code (iOS notification category actions, etc.) reach the live
 * AudioProvider without React context. Populated in useAudioPlayback; null before mount / after teardown.
 */
export const audioPlaybackBridge = {
  actionsRef: null,
  stateRef: null,
};
