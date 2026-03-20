/**
 * Shared helpers for Your Likes (display + playback normalization).
 */

export function extractDurationSeconds(mix) {
  if (!mix || typeof mix !== "object") return null;

  const metadataSources = [
    mix.duration,
    mix.duration_seconds,
    mix.durationSeconds,
    mix.duration_secs,
    mix.metadata?.duration,
    mix.metadata?.duration_seconds,
    mix.audio_metadata?.duration,
    mix.audio_metadata?.duration_seconds,
  ];

  for (const source of metadataSources) {
    if (source == null || source === undefined) continue;
    if (typeof source === "number" && Number.isFinite(source) && source > 0) {
      return Math.round(source);
    }
    if (typeof source === "string" && source.trim()) {
      const trimmed = source.trim();
      if (trimmed === "0" || trimmed === "0:00") continue;
      const colonParts = trimmed.split(":").map((part) => part.trim());
      if (colonParts.length >= 2 && colonParts.length <= 3) {
        const numbers = colonParts.map((part) => Number(part));
        if (numbers.every((num) => Number.isFinite(num) && num >= 0)) {
          if (numbers.length === 3) {
            const [hours, minutes, seconds] = numbers;
            const totalSeconds = hours * 3600 + minutes * 60 + seconds;
            return totalSeconds > 0 ? totalSeconds : null;
          }
          const [minutes, seconds] = numbers;
          const totalSeconds = minutes * 60 + seconds;
          return totalSeconds > 0 ? totalSeconds : null;
        }
      }
    }
  }

  return null;
}

export function formatDurationLabel(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }
  const totalSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/** Shape expected by global audio / queue (single place for row + long-press). */
export function normalizeMixForPlayback(mix) {
  if (!mix) return null;
  const audioUrl =
    mix.audioUrl || mix.file_url || mix.audio_url || null;
  return {
    ...mix,
    audioUrl,
    image: mix.artwork_url || mix.image_url || mix.image || null,
    user_id: mix.user_id || mix.user?.id,
    user_image: mix.user_image || mix.user?.profile_image_url,
    user_dj_name: mix.user_dj_name || mix.user?.dj_name,
    user_bio: mix.user_bio || mix.user?.bio,
    user: mix.user,
  };
}

/**
 * Build list row object from raw `mixes` row + optional `user_profiles` row.
 */
export function buildLikedMixDisplay(mix, userProfile) {
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

  return {
    id: mix.id,
    user_id: mix.user_id,
    title: mix.title,
    artist: resolvedArtist,
    genre: mix.genre || "Electronic",
    durationSeconds,
    durationFormatted: durationLabel,
    artwork_url: mix.artwork_url || mix.image_url || mix.image || null,
    image: mix.artwork_url || mix.image_url || mix.image || null,
    audioUrl: mix.file_url,
    plays: mix.plays || mix.play_count || 0,
    created_at: mix.created_at || null,
    user: userProfile || null,
    user_image: userProfile?.profile_image_url,
    user_dj_name: userProfile?.dj_name,
    user_bio: userProfile?.bio,
  };
}
