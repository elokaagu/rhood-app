/**
 * Shared helpers for Your Likes (display + playback normalization).
 */

import { Platform, ActionSheetIOS, Alert } from "react-native";
import { HapticPatterns } from "./haptics";
import { extractDurationSeconds, formatDurationLabel } from "./listenScreenUtils";
import { resolveMixPlayCount } from "./mixPlayCount";

export { extractDurationSeconds, formatDurationLabel, resolveMixPlayCount };

export function resolveMixImage(mix) {
  if (!mix || typeof mix !== "object") return null;
  return mix.artwork_url || mix.image_url || mix.image || null;
}

export function resolveMixAudioUrl(mix) {
  if (!mix || typeof mix !== "object") return null;
  return mix.audioUrl || mix.file_url || mix.audio_url || null;
}

/** Shape expected by global audio / queue (single place for row + long-press). */
export function normalizeMixForPlayback(mix) {
  if (!mix || typeof mix !== "object") return null;
  return {
    ...mix,
    audioUrl: resolveMixAudioUrl(mix),
    image: resolveMixImage(mix),
    user_id: mix.user_id || mix.user?.id,
    user_image: mix.user_image || mix.user?.profile_image_url,
    user_dj_name: mix.user_dj_name || mix.user?.dj_name,
    user_bio: mix.user_bio || mix.user?.bio,
    user: mix.user,
  };
}

/**
 * Build list row object from raw `mixes` row + optional `user_profiles` row.
 * @returns {object | null}
 */
export function buildLikedMixDisplay(mix, userProfile) {
  if (!mix || typeof mix !== "object") return null;

  let latestArtistName = null;
  if (userProfile) {
    latestArtistName =
      userProfile.dj_name ||
      `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim() ||
      "Unknown Artist";
  }

  const fallbackArtist =
    mix.artist &&
    typeof mix.artist === "string" &&
    mix.artist.trim().length > 0
      ? mix.artist.trim()
      : "Unknown Artist";
  const resolvedArtist = latestArtistName || fallbackArtist;

  const durationSeconds = extractDurationSeconds(mix);
  const durationLabel = formatDurationLabel(durationSeconds);
  const image = resolveMixImage(mix);
  const audioUrl = resolveMixAudioUrl(mix);

  return {
    id: mix.id,
    user_id: mix.user_id,
    title: mix.title,
    artist: resolvedArtist,
    // List fallback when genre missing (product default; use "Unknown" if you prefer neutral copy)
    genre: mix.genre || "Electronic",
    durationSeconds,
    durationFormatted: durationLabel,
    artwork_url: image,
    image,
    audioUrl,
    plays: resolveMixPlayCount(mix),
    created_at: mix.created_at || null,
    user: userProfile || null,
    user_image: userProfile?.profile_image_url,
    user_dj_name: userProfile?.dj_name,
    user_bio: userProfile?.bio,
  };
}

/**
 * Long-press action sheet: queue, play next, move to category.
 * Keeps imperative branching out of the screen component.
 */
export function presentYourLikesLongPressActions({
  mixTitle,
  normalizedMix,
  onAddToQueue,
  onPlayNext,
  onRequestCategoryPicker,
}) {
  if (Platform.OS === "ios") {
    const options = ["Cancel", "Add to Queue", "Play Next", "Move to Category"];
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: 0 },
      (buttonIndex) => {
        if (buttonIndex === 1) {
          onAddToQueue?.(normalizedMix);
          HapticPatterns.success();
        } else if (buttonIndex === 2) {
          onPlayNext?.(normalizedMix);
          HapticPatterns.success();
        } else if (buttonIndex === 3) {
          onRequestCategoryPicker?.();
        }
      }
    );
    return;
  }

  Alert.alert(mixTitle || "Mix", "Choose an option", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Add to Queue",
      onPress: () => {
        onAddToQueue?.(normalizedMix);
        HapticPatterns.success();
      },
    },
    {
      text: "Play Next",
      onPress: () => {
        onPlayNext?.(normalizedMix);
        HapticPatterns.success();
      },
    },
    {
      text: "Move to Category",
      onPress: () => onRequestCategoryPicker?.(),
    },
  ]);
}
