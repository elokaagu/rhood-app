/**
 * Canonical track shape for the global player (useAudioPlayback) and lock screen metadata.
 * Call this (or rely on playGlobalAudio’s internal normalize) before onPlayAudio when building
 * tracks from screens so title, artist, artwork, duration, and URL fields stay consistent.
 *
 * Does not apply to ephemeral players (e.g. chat voice notes, upload preview) — those stay local.
 *
 * @param {object} [track]
 * @returns {object} Spread of input plus canonical fields; `isPlayable` is true when a non-empty audio URL exists.
 */
export function normalizeTrackForPlayback(track) {
  const t = track && typeof track === "object" ? track : {};

  let durationMillis = 0;
  if (typeof t.durationMillis === "number" && t.durationMillis > 0) {
    durationMillis = Math.round(t.durationMillis);
  } else {
    const secRaw =
      t.durationSeconds ??
      t.duration_seconds ??
      (typeof t.duration === "number" ? t.duration : null);
    if (secRaw != null && Number.isFinite(Number(secRaw)) && Number(secRaw) > 0) {
      const n = Number(secRaw);
      /** Already-ms heuristic (matches useAudioPlayback trackMetaDurationMs). */
      durationMillis = n > 5_000_000 ? Math.round(n) : Math.round(n * 1000);
    }
  }

  const audioUrl =
    (typeof t.audioUrl === "string" && t.audioUrl.trim()
      ? t.audioUrl.trim()
      : null) ||
    (typeof t.file_url === "string" && t.file_url.trim()
      ? t.file_url.trim()
      : null) ||
    (typeof t.audio_url === "string" && t.audio_url.trim()
      ? t.audio_url.trim()
      : null) ||
    null;

  const image =
    (typeof t.image === "string" && t.image.trim() ? t.image.trim() : null) ||
    (typeof t.artwork_url === "string" && t.artwork_url.trim()
      ? t.artwork_url.trim()
      : null) ||
    (typeof t.image_url === "string" && t.image_url.trim()
      ? t.image_url.trim()
      : null) ||
    (typeof t.cover_url === "string" && t.cover_url.trim()
      ? t.cover_url.trim()
      : null) ||
    null;

  const artist =
    (typeof t.artist === "string" && t.artist.trim()) ||
    (typeof t.user_dj_name === "string" && t.user_dj_name.trim()) ||
    (typeof t.user?.dj_name === "string" && t.user.dj_name.trim()) ||
    "Unknown Artist";

  return {
    ...t,
    id: t.id ?? t.mix_id ?? null,
    title: (typeof t.title === "string" && t.title.trim()) || "R/HOOD Mix",
    artist,
    genre: (typeof t.genre === "string" && t.genre.trim()) || "R/HOOD",
    audioUrl,
    audio_url:
      (typeof t.audio_url === "string" && t.audio_url.trim()
        ? t.audio_url.trim()
        : null) ?? audioUrl,
    file_url:
      (typeof t.file_url === "string" && t.file_url.trim()
        ? t.file_url.trim()
        : null) ?? audioUrl,
    image,
    durationMillis,
    isPlayable: !!audioUrl,
    user_id: t.user_id ?? t.user?.id ?? null,
    user_image: t.user_image ?? t.user?.profile_image_url ?? null,
    user_dj_name: t.user_dj_name ?? t.user?.dj_name ?? null,
    user_bio: t.user_bio ?? t.user?.bio ?? null,
  };
}
