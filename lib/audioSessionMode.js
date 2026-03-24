/**
 * Centralized expo-av audio session configuration.
 * Message previews use a restrictive mode; mix playback uses background-capable mode.
 * Restoring mix mode after chat audio avoids "stuck" background behavior.
 */
import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from "expo-av";

export async function applyMixPlaybackAudioMode() {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  } catch (e) {
    if (__DEV__) {
      console.warn("[audioSession] applyMixPlaybackAudioMode:", e?.message || e);
    }
  }
}

/** Short in-app clips (e.g. message voice notes) — not intended to keep the session alive in background. */
export async function applyMessageAttachmentPlaybackAudioMode() {
  try {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
    });
  } catch (e) {
    if (__DEV__) {
      console.warn(
        "[audioSession] applyMessageAttachmentPlaybackAudioMode:",
        e?.message || e
      );
    }
  }
}
