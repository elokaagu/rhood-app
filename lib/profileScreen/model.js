/** Pure profile helpers — kept out of ProfileScreen so the UI file stays presentational. */

export function normalizeGenres(g) {
  if (Array.isArray(g)) return g.filter((x) => x != null && String(x).trim() !== "");
  if (typeof g === "string" && g.trim()) return [g.trim()];
  return [];
}

export function normalizeSocialLinks(raw) {
  const base = {
    instagram: null,
    soundcloud: null,
    tiktok: null,
    youtube: null,
    portfolio_url: null,
  };
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...base, ...raw };
  }
  return base;
}

export function normalizeProfileForUI(p) {
  if (!p || typeof p !== "object") return p;
  return {
    ...p,
    genres: normalizeGenres(p.genres),
    socialLinks: normalizeSocialLinks(p.socialLinks),
  };
}

export function parseDurationSeconds(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }
  if (typeof value === "string") {
    if (value.includes(":")) {
      const [minutes, seconds] = value.split(":");
      const mins = Number(minutes);
      const secs = Number(seconds);
      if (
        Number.isFinite(mins) &&
        Number.isFinite(secs) &&
        mins >= 0 &&
        secs >= 0
      ) {
        return mins * 60 + secs;
      }
    }
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric >= 0) {
      return numeric;
    }
  }
  return 0;
}

export function parseDurationString(str) {
  if (typeof str !== "string") return null;
  const parts = str.split(":").map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  if (parts.length === 3) {
    const [h, m, s] = parts;
    return h * 3600 + m * 60 + s;
  }
  if (parts.length === 2) {
    const [m, s] = parts;
    return m * 60 + s;
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return null;
}

export function extractDurationSeconds(mix) {
  if (!mix) return null;
  const durationSecondsCandidates = [
    mix.durationSeconds,
    mix.duration_seconds,
    mix.duration,
    mix.metadata?.duration,
    mix.metadata?.duration_seconds,
    mix.audio_metadata?.duration,
    mix.audio_metadata?.duration_seconds,
    mix.audioMetadata?.duration,
    mix.audioMetadata?.duration_seconds,
  ];

  for (const cand of durationSecondsCandidates) {
    const secs = parseDurationSeconds(cand);
    if (secs && Number.isFinite(secs) && secs > 0) return secs;
  }

  const durationMillisCandidates = [
    mix.durationMillis,
    mix.duration_millis,
    mix.metadata?.durationMillis,
    mix.metadata?.duration_millis,
    mix.audio_metadata?.durationMillis,
    mix.audio_metadata?.duration_millis,
    mix.audioMetadata?.durationMillis,
    mix.audioMetadata?.duration_millis,
  ];
  for (const cand of durationMillisCandidates) {
    if (Number.isFinite(cand) && cand > 0) return Math.round(cand / 1000);
  }

  const formattedCandidates = [
    mix.duration_formatted,
    mix.durationFormatted,
    mix.durationLabel,
  ];
  for (const cand of formattedCandidates) {
    const secs = parseDurationString(cand);
    if (secs && Number.isFinite(secs) && secs > 0) return secs;
  }

  return null;
}

export function formatSecondsToLabel(seconds) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

export function getOrdinalSuffix(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export function formatDateWithOrdinal(dateString) {
  if (!dateString) return "TBD";
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "TBD";
    const day = date.getDate();
    const month = date.toLocaleDateString("en-GB", { month: "long" });
    const year = date.getFullYear();
    return `${day}${getOrdinalSuffix(day)} ${month} ${year}`;
  } catch (_error) {
    return "TBD";
  }
}

export function mapGigsForProfile(gigsData) {
  if (!gigsData?.length) return [];
  return gigsData.slice(0, 5).map((gig) => ({
    id: gig.id,
    name: gig.name,
    venue: gig.venue,
    date: formatDateWithOrdinal(gig.event_date),
    price: gig.payment ? `£${gig.payment.toFixed(0)}` : "£0",
    rating: gig.dj_rating || 0,
  }));
}

export function getDisplayName(userProfile) {
  if (userProfile?.dj_name) return userProfile.dj_name;
  if (userProfile?.full_name) return userProfile.full_name;
  if (userProfile?.username) {
    return (
      userProfile.username.charAt(0).toUpperCase() +
      userProfile.username.slice(1)
    );
  }
  return "DJ";
}

export function formatRatingDisplay(userProfile) {
  const raw =
    userProfile?.average_rating ?? userProfile?.rating ?? userProfile?.dj_rating;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n.toFixed(1) : null;
}

export function artistNameFromProfile(userProfile, mixData) {
  return (
    userProfile?.dj_name ||
    userProfile?.full_name ||
    `${userProfile?.first_name || ""} ${userProfile?.last_name || ""}`.trim() ||
    (typeof mixData?.artist === "string" && mixData.artist.trim().length > 0
      ? mixData.artist.trim()
      : null) ||
    "Unknown Artist"
  );
}

export function mixToAudioId(mixData, userProfile, waveform) {
  const durationSeconds = extractDurationSeconds(mixData);
  return {
    id: mixData.id,
    user_id: mixData.user_id,
    title: mixData.title || "Audio ID",
    artist: artistNameFromProfile(userProfile, mixData),
    genre: mixData.genre || "Electronic",
    duration: durationSeconds,
    durationSeconds,
    durationMillis: durationSeconds ? durationSeconds * 1000 : null,
    audioUrl: mixData.file_url,
    file_url: mixData.file_url,
    artwork_url: mixData.artwork_url || null,
    image: mixData.artwork_url || userProfile.profile_image_url || null,
    description: mixData.description || "",
    waveform,
    created_at: mixData.created_at || null,
    user: {
      id: userProfile.id,
      dj_name: userProfile.dj_name,
      full_name: userProfile.full_name,
      first_name: userProfile.first_name,
      last_name: userProfile.last_name,
      bio: userProfile.bio,
      profile_image_url: userProfile.profile_image_url,
      username: userProfile.username,
      status_message: userProfile.status_message,
    },
  };
}

export function buildProfileViewModel({
  userProfile,
  recentGigs,
  achievements,
  achievementsStats,
  creditsValue,
  primaryMix,
}) {
  const username = userProfile.username
    ? `@${userProfile.username}`
    : `@${(userProfile.dj_name || userProfile.full_name || "dj")
        .toLowerCase()
        .replace(/\s+/g, "")}`;

  return normalizeProfileForUI({
    id: userProfile.id,
    name: getDisplayName(userProfile),
    username,
    gigsCompleted: userProfile.gigs_completed || 0,
    credits: Number.isFinite(creditsValue) ? creditsValue : 0,
    bio: userProfile.bio || "",
    statusMessage: userProfile.status_message || "",
    location: userProfile.city || "Location not set",
    genres: normalizeGenres(userProfile.genres),
    profileImage: userProfile.profile_image_url
      ? { uri: userProfile.profile_image_url }
      : null,
    socialLinks: {
      instagram: userProfile.instagram || null,
      soundcloud: userProfile.soundcloud || null,
      tiktok: userProfile.tiktok || null,
      youtube: userProfile.youtube || null,
      portfolio_url: userProfile.portfolio_url || null,
    },
    audioId: primaryMix || null,
    isVerified: userProfile.is_verified || false,
    joinDate: userProfile.join_date || userProfile.created_at || "Unknown",
    recentGigs,
    achievements,
    achievementsStats,
    ratingDisplay: formatRatingDisplay(userProfile),
  });
}

export function computeAudioIdProgress({
  profile,
  currentTrackId,
  positionMillis,
  durationMillis,
}) {
  if (!profile?.audioId) {
    return { positionMs: 0, durationMs: 0, progressPct: 0 };
  }
  const tid = profile.audioId.id || (profile.id ? `audio-id-${profile.id}` : null);
  const match = !!tid && currentTrackId === tid;

  let metaMs =
    profile.audioId.durationMillis ??
    (Number.isFinite(profile.audioId.durationSeconds)
      ? profile.audioId.durationSeconds * 1000
      : null);
  if (!metaMs || metaMs <= 0) {
    const sec = parseDurationSeconds(
      profile.audioId.duration ?? profile.audioId.durationSeconds ?? 0
    );
    metaMs = sec > 0 ? sec * 1000 : 0;
  }

  const durationMs =
    match && Number(durationMillis) > 0 ? durationMillis : metaMs;
  const positionMs =
    match && Number.isFinite(positionMillis)
      ? Math.max(0, positionMillis)
      : 0;
  const progressPct =
    durationMs > 0
      ? Math.min(100, Math.max(0, (positionMs / durationMs) * 100))
      : 0;

  return { positionMs, durationMs, progressPct };
}

export function getReferralLink(inviteCode) {
  if (!inviteCode) return null;
  return `https://rhood.io/invite/${inviteCode}`;
}

export function getReferralShareMessage(inviteCode) {
  if (!inviteCode) return "";
  return `Join R/HOOD - The DJ Community!\n\nUse my invite code when you sign up: ${inviteCode}\n\nYou'll help me earn credits and I'll help you get started!\n\nDownload R/HOOD app: https://rhood.io/download`;
}

export function formatPlaybackClock(milliseconds) {
  const totalSeconds = Math.floor((milliseconds || 0) / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatMixDuration(duration) {
  if (duration == null) return "";
  if (typeof duration === "string") return duration;
  return formatSecondsToLabel(duration);
}
