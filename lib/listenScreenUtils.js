/**
 * Listen screen utilities: duration parsing, search normalization, audio format hints.
 */

export function getAudioOptimization(audioUrl) {
  const fileName = String(audioUrl || "").toLowerCase();
  const isWav = fileName.includes(".wav");
  const isMp3 = fileName.includes(".mp3");
  const isM4a = fileName.includes(".m4a");

  return {
    isWav,
    isMp3,
    isM4a,
    recommendedFormat: isWav ? "MP3" : "Current format is likely fine",
    compressionTip: isWav
      ? "WAV files are larger and may load more slowly. Consider converting to MP3 for better streaming performance."
      : null,
  };
}

export function parseDurationString(value) {
  if (value == null) return null;

  if (typeof value === "number") {
    if (Number.isFinite(value) && value > 0) return value;
    return null;
  }

  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed || trimmed === "0" || trimmed === "0:00") return null;

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

  const asNumber = Number(trimmed);
  return Number.isFinite(asNumber) && asNumber > 0 ? asNumber : null;
}

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
    mix.audioMetadata?.duration,
    mix.audioMetadata?.duration_seconds,
    mix.audio_features?.duration,
    mix.audio_features?.duration_seconds,
  ];

  for (const source of metadataSources) {
    if (source == null) continue;
    if (typeof source === "number" && Number.isFinite(source) && source > 0) {
      return Math.round(source);
    }
    if (typeof source === "string" && source.trim()) {
      const parsed = parseDurationString(source);
      if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed);
    }
  }

  const millisecondSources = [
    mix.duration_millis,
    mix.durationMillis,
    mix.duration_ms,
    mix.metadata?.duration_millis,
    mix.metadata?.durationMillis,
    mix.audio_metadata?.duration_millis,
    mix.audio_metadata?.durationMillis,
    mix.audioMetadata?.duration_millis,
    mix.audioMetadata?.durationMillis,
  ];

  for (const source of millisecondSources) {
    if (source == null) continue;
    const numeric = Number(source);
    if (Number.isFinite(numeric) && numeric > 0) {
      return Math.round(numeric / 1000);
    }
  }

  if (typeof mix.duration_formatted === "string") {
    const parsed = parseDurationString(mix.duration_formatted);
    if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed);
  }

  return null;
}

export function formatDurationLabel(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const totalSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function normalizeSearchValue(value) {
  if (value === null || value === undefined) return "";
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
