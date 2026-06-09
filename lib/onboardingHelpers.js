/**
 * Shared helpers for OnboardingForm: profile image storage + social URL normalization.
 * Normalization runs on blur / validation so inputs stay stable while typing.
 * Normalizers format casual input into URLs; they are not strict validators — use URL checks in validateStep.
 */

import { supabase } from "./supabase";
import { uploadFileStreaming, withRetry, guardFileSizeBytes } from "./uploadUtils";

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
 * Uploads a local image URI to Supabase (avatars bucket / profile_images/*).
 *
 * Uses streaming upload — the file is never loaded into RAM, making it safe
 * for images of any size. Retries up to 3 times on transient network errors.
 *
 * @param {string} imageUri   - Local file URI from Expo ImagePicker
 * @param {string} [mimeType] - MIME type reported by the picker (most reliable source)
 * @returns {Promise<{ path: string, publicUrl: string }>}
 */
export async function uploadOnboardingProfileImage(imageUri, mimeType) {
  const { ext, contentType } = resolveImageFormat(mimeType, imageUri);
  const fileName = `profile_${Date.now()}.${ext}`;
  const storagePath = `${PROFILE_IMAGE_PREFIX}/${fileName}`;

  // Guard: file must still exist (temp files can be evicted between pick and upload)
  await guardFileSizeBytes(imageUri, 20 * 1024 * 1024, "Profile photo");

  // Stream directly from disk — never allocates the full image in memory.
  // upsert: true means retries won't hit a 409 conflict error.
  const publicUrl = await withRetry(() =>
    uploadFileStreaming({
      bucket: AVATARS_BUCKET,
      path: storagePath,
      fileUri: imageUri,
      contentType,
      upsert: true,
    })
  );

  return { path: storagePath, publicUrl };
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
