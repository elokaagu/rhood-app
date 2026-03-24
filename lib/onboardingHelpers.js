/**
 * Shared helpers for OnboardingForm: profile image storage + social URL normalization.
 * Normalization runs on blur / validation so inputs stay stable while typing.
 * Normalizers format casual input into URLs; they are not strict validators — use URL checks in validateStep.
 */

import { supabase } from "./supabase";

/** TODO: move to a dedicated avatars bucket when storage model is finalized. */
const MIXES_BUCKET = "mixes";
const PROFILE_IMAGE_PREFIX = "profile_images";

function extensionFromUri(uri) {
  if (!uri || typeof uri !== "string") return "jpg";
  const pathPart = uri.split("?")[0].split("#")[0];
  const segment = pathPart.split("/").pop() || "";
  const dot = segment.lastIndexOf(".");
  const ext = dot >= 0 ? segment.slice(dot + 1) : "";
  const cleaned = ext.toLowerCase().replace(/[^a-z0-9]/g, "");
  return cleaned || "jpg";
}

function getImageContentType(ext) {
  const normalized = String(ext || "").toLowerCase();
  if (normalized === "jpg" || normalized === "jpeg" || normalized === "jpe" || normalized === "jfif") {
    return "image/jpeg";
  }
  if (normalized === "png") return "image/png";
  if (normalized === "webp") return "image/webp";
  if (normalized === "heic" || normalized === "heif") return "image/heic";
  if (normalized === "gif") return "image/gif";
  return "image/jpeg";
}

/** Stable file extension for storage keys (aligned with content type). */
function canonicalImageExtension(ext) {
  const n = String(ext || "").toLowerCase();
  if (["jpeg", "jpe", "jfif"].includes(n)) return "jpg";
  if (n === "heif") return "heic";
  if (["jpg", "png", "webp", "heic", "gif"].includes(n)) return n;
  return "jpg";
}

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
 * Uploads a local image URI to Supabase (mixes bucket / profile_images/*).
 * @returns {Promise<{ path: string, publicUrl: string }>}
 */
export async function uploadOnboardingProfileImage(imageUri) {
  const rawExt = extensionFromUri(imageUri);
  const ext = canonicalImageExtension(rawExt);
  const contentType = getImageContentType(rawExt);
  const fileName = `profile_${Date.now()}.${ext}`;
  const intendedPath = `${PROFILE_IMAGE_PREFIX}/${fileName}`;

  const response = await fetch(imageUri);
  const arrayBuffer = await response.arrayBuffer();
  const fileData = new Uint8Array(arrayBuffer);

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(MIXES_BUCKET)
    .upload(intendedPath, fileData, {
      contentType,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const path = uploadData?.path ?? intendedPath;

  const { data: urlData } = supabase.storage.from(MIXES_BUCKET).getPublicUrl(path);

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
