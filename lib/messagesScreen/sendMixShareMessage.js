/**
 * Send a playable mix reference in a direct message (metadata + message_type "mix").
 */
import { supabase, db } from "../supabase";
import {
  normalizeMixForPlayback,
  resolveMixAudioUrl,
  resolveMixImage,
} from "../yourLikesUtils";

/**
 * Minimal JSON-safe payload for metadata.mix (recipient playback).
 * @param {object} track — current player / list track shape
 * @returns {object | null}
 */
export function buildMixPayloadForShare(track) {
  if (!track || typeof track !== "object" || !track.id) return null;
  const normalized = normalizeMixForPlayback(track);
  if (!normalized) return null;
  const audioUrl = resolveMixAudioUrl(normalized);
  if (!audioUrl || typeof audioUrl !== "string" || !audioUrl.trim()) return null;

  const image = resolveMixImage(normalized) || resolveMixImage(track);

  return {
    id: normalized.id,
    title: normalized.title || track.title || "R/HOOD Mix",
    artist: normalized.artist || track.artist || "Unknown Artist",
    artwork_url: image,
    image_url: image,
    file_url: audioUrl.trim(),
    audio_url: audioUrl.trim(),
    user_id: normalized.user_id ?? track.user_id ?? null,
    genre: normalized.genre || track.genre || null,
    duration_millis:
      typeof track.durationMillis === "number" && track.durationMillis > 0
        ? track.durationMillis
        : typeof track.duration_millis === "number" && track.duration_millis > 0
          ? track.duration_millis
          : null,
  };
}

/**
 * @returns {Promise<string>} thread id
 */
export async function sendMixShareMessage(
  senderId,
  receiverId,
  shareMessage,
  mixPayload
) {
  const threadId = await db.findOrCreateIndividualMessageThread(
    senderId,
    receiverId
  );

  const metadata = {
    type: "mix",
    mix: mixPayload,
  };

  const { error } = await supabase.from("messages").insert({
    thread_id: threadId,
    sender_id: senderId,
    content: shareMessage,
    message_type: "mix",
    metadata,
  });

  if (error) throw error;
  return threadId;
}
