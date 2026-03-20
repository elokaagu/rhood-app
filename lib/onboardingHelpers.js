/**
 * Shared helpers for OnboardingForm: profile image storage + social URL normalization.
 * Normalization runs on blur / validation so inputs stay stable while typing.
 */

import { supabase } from "./supabase";

const MIXES_BUCKET = "mixes";
const PROFILE_IMAGE_PREFIX = "profile_images";

/**
 * Uploads a local image URI to Supabase (mixes bucket / profile_images/*).
 * TODO: move to a dedicated avatars bucket when storage model is finalized.
 */
export async function uploadOnboardingProfileImage(imageUri) {
  const fileExt = imageUri.split(".").pop() || "jpg";
  const fileName = `profile_${Date.now()}.${fileExt}`;

  const response = await fetch(imageUri);
  const arrayBuffer = await response.arrayBuffer();
  const fileData = new Uint8Array(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from(MIXES_BUCKET)
    .upload(`${PROFILE_IMAGE_PREFIX}/${fileName}`, fileData, {
      contentType: `image/${fileExt}`,
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw uploadError;
  }

  const { data: urlData } = supabase.storage
    .from(MIXES_BUCKET)
    .getPublicUrl(`${PROFILE_IMAGE_PREFIX}/${fileName}`);

  return urlData.publicUrl;
}

export function normalizeInstagramOnBlur(text) {
  const raw = (text || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("@")) return `https://instagram.com/${raw.slice(1)}`;
  return `https://instagram.com/${raw}`;
}

export function normalizeSoundCloudOnBlur(text) {
  const raw = (text || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://soundcloud.com/${raw}`;
}

export function normalizeTikTokOnBlur(text) {
  const raw = (text || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("@")) return `https://www.tiktok.com/${raw}`;
  return `https://www.tiktok.com/@${raw}`;
}

export function normalizeYouTubeOnBlur(text) {
  const raw = (text || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("@")) return `https://www.youtube.com/${raw}`;
  if (raw.startsWith("youtube.com") || raw.startsWith("youtu.be")) {
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
