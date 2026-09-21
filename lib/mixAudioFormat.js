/**
 * Mix audio formats that iOS can stream reliably vs ones that must be
 * converted first. DJs can still pick WAV; playback uses AAC/M4A.
 */

export const STREAMABLE_MIX_EXTS = ["mp3", "m4a", "aac", "mp4"];
export const UNCOMPRESSED_MIX_EXTS = ["wav", "wave", "aiff", "aif"];

export function normalizeAudioExt(ext) {
  return String(ext || "")
    .trim()
    .replace(/^\./, "")
    .toLowerCase();
}

export function needsAacTranscode(ext) {
  return UNCOMPRESSED_MIX_EXTS.includes(normalizeAudioExt(ext));
}

export function extensionFromAudioUrl(url) {
  if (!url || typeof url !== "string") return "";
  const path = url.split("?")[0];
  const last = path.split("/").pop() || "";
  const dot = last.lastIndexOf(".");
  if (dot < 0) return "";
  return normalizeAudioExt(last.slice(dot + 1));
}

export function isUncompressedRemoteAudio(url) {
  return needsAacTranscode(extensionFromAudioUrl(url));
}

export function aacPlaybackMimeType() {
  return "audio/mp4";
}
