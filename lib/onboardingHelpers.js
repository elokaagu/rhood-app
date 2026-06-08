/**
 * Shared helpers for OnboardingForm: profile image storage + social URL normalization.
 * Normalization runs on blur / validation so inputs stay stable while typing.
 * Normalizers format casual input into URLs; they are not strict validators — use URL checks in validateStep.
 */

import * as FileSystem from "expo-file-system";
import { supabase } from "./supabase";

const AVATARS_BUCKET = "avatars";
const PROFILE_IMAGE_PREFIX = "profile_images";

function trimOrEmpty(text) {
  return (text || "").trim();
}

/** @returns {string} empty, existing http(s) URL, or result of buildRelativeUrl(trimmed). */
function normalizeSocialUrlOnBlur(text, buildRelativeUrl) {
  const raw = trimOrEmpty(text);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return buildRelativeUrl(raw);
}

/**
 * Resolve a stable { ext, contentType } from picker mime + URI fallback.
 * HEIC/HEIF is coerced to JPEG because Expo's image editor outputs JPEG-compatible
 * data and Supabase CDN serves HEIC inconsistently across platforms.
 */
function resolveImageFormat(pickerMimeType, uri) {
  // Prefer the mime type the picker already determined
  const mime = (pickerMimeType || "").toLowerCase();
  if (mime === "image/png") return { ext: "png", contentType: "image/png" };
  if (mime === "image/webp") return { ext: "webp", contentType: "image/webp" };
  if (mime === "image/gif") return { ext: "gif", contentType: "image/gif" };
  // HEIC/HEIF: treat as JPEG — Expo's editor writes JPEG-encoded data even for HEIC originals
  if (mime === "image/heic" || mime === "image/heif") {
    return { ext: "jpg", contentType: "image/jpeg" };
  }
  if (mime === "image/jpeg" || mime === "image/jpg") {
    return { ext: "jpg", contentType: "image/jpeg" };
  }

  // Fallback: infer from file extension in the URI
  const pathPart = (uri || "").split("?")[0].split("#")[0];
  const segment = pathPart.split("/").pop() || "";
  const dot = segment.lastIndexOf(".");
  const rawExt = dot >= 0 ? segment.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  if (rawExt === "png") return { ext: "png", contentType: "image/png" };
  if (rawExt === "webp") return { ext: "webp", contentType: "image/webp" };
  if (rawExt === "gif") return { ext: "gif", contentType: "image/gif" };
  // Default — also catches heic/heif by extension
  return { ext: "jpg", contentType: "image/jpeg" };
}

/**
 * Decode a base64 string to Uint8Array (works in RN where atob is polyfilled).
 */
function base64ToUint8Array(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Uploads a local image URI to Supabase (mixes bucket / profile_images/*).
 *
 * @param {string} imageUri   - Local file URI from Expo ImagePicker
 * @param {string} [mimeType] - MIME type reported by the picker (most reliable source)
 * @returns {Promise<{ path: string, publicUrl: string }>}
 */
export async function uploadOnboardingProfileImage(imageUri, mimeType) {
  const { ext, contentType } = resolveImageFormat(mimeType, imageUri);
  const fileName = `profile_${Date.now()}.${ext}`;
  const intendedPath = `${PROFILE_IMAGE_PREFIX}/${fileName}`;

  // expo-file-system is more reliable than fetch() for local file:// URIs on RN.
  // Reading as base64 avoids ArrayBuffer quirks across iOS/Android versions.
  let fileData;
  try {
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    fileData = base64ToUint8Array(base64);
  } catch (readError) {
    // Fallback to fetch if FileSystem fails (e.g. in certain Expo Go environments)
    console.warn("⚠️ FileSystem read failed, falling back to fetch:", readError.message);
    const response = await fetch(imageUri);
    const arrayBuffer = await response.arrayBuffer();
    fileData = new Uint8Array(arrayBuffer);
  }

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(AVATARS_BUCKET)
    .upload(intendedPath, fileData, {
      contentType,
      cacheControl: "3600",
      upsert: true, // Allow re-upload on retry without 409 conflict
    });

  if (uploadError) {
    // Surface a readable message alongside the raw error
    const reason = uploadError.message || uploadError.error || JSON.stringify(uploadError);
    const err = new Error(`Image upload failed: ${reason}`);
    err.cause = uploadError;
    throw err;
  }

  const path = uploadData?.path ?? intendedPath;
  const { data: urlData } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);

  return {
    path,
    publicUrl: urlData.publicUrl,
  };
}

export function normalizeInstagramOnBlur(text) {
  return normalizeSocialUrlOnBlur(text, (t) =>
    t.startsWith("@")
      ? `https://instagram.com/${t.slice(1)}`
      : `https://instagram.com/${t}`
  );
}

export function normalizeSoundCloudOnBlur(text) {
  return normalizeSocialUrlOnBlur(
    text,
    (t) => `https://soundcloud.com/${t}`
  );
}

export function normalizeTikTokOnBlur(text) {
  return normalizeSocialUrlOnBlur(text, (t) =>
    t.startsWith("@")
      ? `https://www.tiktok.com/${t}`
      : `https://www.tiktok.com/@${t}`
  );
}

export function normalizeYouTubeOnBlur(text) {
  const raw = trimOrEmpty(text);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("@")) {
    return `https://www.youtube.com/${raw}`;
  }
  const lower = raw.toLowerCase();
  if (
    lower.startsWith("youtube.com") ||
    lower.startsWith("www.youtube.com") ||
    lower.startsWith("youtu.be")
  ) {
    return `https://${raw}`;
  }
  return `https://www.youtube.com/@${raw}`;
}

/** Values as stored / shown after blur — use in validateStep for URL-based rules. */
export function normalizedSocialProfileForValidation(profile) {
  return {
    instagram: profile.instagram?.trim()
      ? normalizeInstagramOnBlur(profile.instagram)
      : "",
    soundcloud: profile.soundcloud?.trim()
      ? normalizeSoundCloudOnBlur(profile.soundcloud)
      : "",
    tiktok: profile.tiktok?.trim() ? normalizeTikTokOnBlur(profile.tiktok) : "",
    youtube: profile.youtube?.trim()
      ? normalizeYouTubeOnBlur(profile.youtube)
      : "",
  };
}
