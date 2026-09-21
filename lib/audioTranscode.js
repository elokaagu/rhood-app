/**
 * Converts uncompressed mix audio (WAV/AIFF) to AAC/M4A for iPhone streaming.
 * Native work is AVAssetExportSession — no ffmpeg, streams off disk.
 */

import { NativeModules, NativeEventEmitter, Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import {
  aacPlaybackMimeType,
  needsAacTranscode,
} from "./mixAudioFormat";

const NativeTranscode =
  Platform.OS === "ios" ? NativeModules.AudioTranscodeModule ?? null : null;

function transcodeUnavailableError() {
  const err = new Error(
    "WAV is allowed, but this build can't convert it for streaming. Export an MP3 from your DJ software, or update the app and try the WAV again."
  );
  err.alertTitle = "Can't convert WAV";
  return err;
}

/**
 * @param {string} sourceUri local file:// URI
 * @param {{ onProgress?: (fraction: number) => void }} [opts]
 * @returns {Promise<{ uri: string, size: number, ext: string, mimeType: string }>}
 */
export async function transcodeUncompressedMixToAac(sourceUri, { onProgress } = {}) {
  if (!sourceUri) {
    throw new Error("No audio file to convert.");
  }
  if (!NativeTranscode?.transcodeToAac) {
    throw transcodeUnavailableError();
  }

  let sub;
  if (typeof onProgress === "function") {
    try {
      const emitter = new NativeEventEmitter(NativeTranscode);
      sub = emitter.addListener("AudioTranscodeProgress", (event) => {
        const p = Number(event?.progress);
        if (Number.isFinite(p)) onProgress(Math.max(0, Math.min(1, p)));
      });
    } catch (_e) {
      /* Event emitter optional — export still resolves */
    }
  }

  try {
    const result = await NativeTranscode.transcodeToAac(sourceUri);
    const uri = typeof result?.uri === "string" ? result.uri : "";
    if (!uri) {
      throw new Error("Conversion produced no file.");
    }
    let size = Number(result?.size) || 0;
    if (!size) {
      const info = await FileSystem.getInfoAsync(uri);
      size = info?.size || 0;
    }
    return {
      uri,
      size,
      ext: "m4a",
      mimeType: aacPlaybackMimeType(),
    };
  } catch (error) {
    if (error?.alertTitle) throw error;
    const message = String(error?.message || error || "");
    if (message.includes("Can't convert WAV") || message.includes("WAV is allowed")) {
      throw error;
    }
    const err = new Error(
      message.includes("space") || message.includes("NSFileWriteOutOfSpace")
        ? "Not enough storage on this iPhone to convert the WAV. Free some space and try again."
        : "Couldn't convert this WAV for streaming. Try exporting an MP3 from your DJ software, or pick the WAV again."
    );
    err.alertTitle = "WAV conversion failed";
    throw err;
  } finally {
    sub?.remove?.();
  }
}

/**
 * Returns the local file that should be uploaded and streamed.
 * WAV/AIFF become AAC/M4A; MP3 is passed through.
 *
 * @param {{
 *   fileUri: string,
 *   fileExt: string,
 *   fileSize?: number,
 *   mimeType?: string,
 *   onProgress?: (fraction: number) => void,
 * }} opts
 */
export async function prepareMixAudioForStreaming({
  fileUri,
  fileExt,
  fileSize,
  mimeType,
  onProgress,
}) {
  if (!needsAacTranscode(fileExt)) {
    return {
      uri: fileUri,
      size: fileSize || 0,
      ext: fileExt,
      mimeType: mimeType || "audio/mpeg",
      transcoded: false,
    };
  }

  const out = await transcodeUncompressedMixToAac(fileUri, { onProgress });

  // Only delete the picker *copy*. Never remove the DJ's original in Files/iCloud.
  try {
    if (fileUri && fileUri !== out.uri && isEphemeralPickerCopy(fileUri)) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
  } catch (_e) {
    /* ignore */
  }

  return { ...out, transcoded: true };
}

function isEphemeralPickerCopy(uri) {
  const path = decodeURIComponent(String(uri || "")).toLowerCase();
  return (
    path.includes("/caches/") ||
    path.includes("/tmp/") ||
    path.includes("/temp/") ||
    path.includes("/cache/")
  );
}

export async function deleteLocalAudioFile(uri) {
  if (!uri || typeof uri !== "string" || !uri.startsWith("file:")) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch (_e) {
    /* ignore */
  }
}
