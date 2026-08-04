/**
 * User-submitted opportunities: validation + insert.
 *
 * Screens don't inline Supabase writes for submissions (same split as
 * mixUploadService) — the screen owns form state, this owns the rules.
 *
 * Submissions always land unpublished (`is_active = false`,
 * `moderation_status = 'pending'`) and only appear in the swipe deck once a
 * reviewer approves them. The deck filters on `is_active = true`, so pending
 * rows are invisible to other DJs without any change to the fetch path.
 */

import { supabase } from "./supabase";
import { uploadFileStreaming, withRetry, guardFileSizeBytes } from "./uploadUtils";

const OPPORTUNITY_IMAGES_BUCKET = "opportunity-images";
const MAX_OPPORTUNITY_IMAGE_BYTES = 8 * 1024 * 1024;

export const OPPORTUNITY_CURRENCIES = ["GBP", "EUR", "USD"];

/**
 * Only values already present in the live table (see scripts/seed-opportunities.js)
 * plus the documented 'professional'. Deliberately avoids inventing a new value:
 * skill_level may carry a CHECK constraint, and nothing in the app does enum
 * logic on it — it's only interpolated into the matchmaking prompt.
 */
export const SKILL_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "professional", label: "Professional" },
];

/** Sentinel chip value — MIX_GENRES already includes this as its last entry. */
export const GENRE_OTHER = "Other";
export const MAX_OPPORTUNITY_GENRES = 3;

export const EMPTY_OPPORTUNITY_FORM = Object.freeze({
  title: "",
  description: "",
  venue: "",
  city: "",
  location: "",
  eventDate: "",
  startTime: "",
  endTime: "",
  payment: "",
  paymentCurrency: "GBP",
  genres: [],
  customGenre: "",
  skillLevel: "intermediate",
  organizerName: "",
  imageUrl: "",
});

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function trimmed(value) {
  return typeof value === "string" ? value.trim() : "";
}

/** Real calendar check — `2026-02-31` matches DATE_PATTERN but isn't a date. */
function isRealCalendarDate(value) {
  const [y, m, d] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return (
    parsed.getUTCFullYear() === y &&
    parsed.getUTCMonth() === m - 1 &&
    parsed.getUTCDate() === d
  );
}

function todayIso() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function addOneDayIso(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  const pad = (n) => String(n).padStart(2, "0");
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/**
 * opportunities.event_start_time/event_end_time are TIMESTAMPTZ columns, not
 * plain TIME — a bare "22:30" fails with "invalid input syntax for type
 * timestamp with time zone". Combines the picked time with the event date.
 * Also handles overnight sets (a very normal DJ-gig shape, e.g. 22:00–03:00):
 * if the end time is earlier than the start time, it's on the day *after*
 * the event date, not the same day (which would otherwise produce an end
 * timestamp before the start timestamp).
 */
function buildEventTimestamps(eventDate, startTime, endTime) {
  const startTs = startTime ? `${eventDate}T${startTime}:00` : null;
  let endTs = null;
  if (endTime) {
    const rollsOverToNextDay = !!startTime && endTime < startTime;
    const endDate = rollsOverToNextDay ? addOneDayIso(eventDate) : eventDate;
    endTs = `${endDate}T${endTime}:00`;
  }
  return { startTs, endTs };
}

function extensionFromAsset(uri, fileName) {
  const source = fileName || uri || "";
  const pathPart = source.split("?")[0].split("#")[0];
  const segment = pathPart.split("/").pop() || "";
  const dot = segment.lastIndexOf(".");
  const ext = dot >= 0 ? segment.slice(dot + 1).toLowerCase() : "";
  const cleaned = ext.replace(/[^a-z0-9]/g, "");
  return cleaned || "jpg";
}

function contentTypeForExtension(ext) {
  const n = String(ext || "").toLowerCase();
  if (n === "png") return "image/png";
  if (n === "webp") return "image/webp";
  if (n === "heic") return "image/heic";
  if (n === "heif") return "image/heif";
  return "image/jpeg";
}

/**
 * Uploads a picked opportunity image to Supabase Storage. Never loads the
 * file into RAM (streams from disk) and retries on transient network
 * errors — same reliability pattern as mixUploadService's artwork upload.
 * @param {{ uri: string, mimeType?: string, fileName?: string }} asset
 * @returns {Promise<{ path: string, publicUrl: string }>}
 */
export async function uploadOpportunityImage(asset) {
  const uri = asset?.uri;
  if (!uri) {
    throw new Error("Image not found. Please pick it again.");
  }

  await guardFileSizeBytes(uri, MAX_OPPORTUNITY_IMAGE_BYTES, "Image");

  const ext = extensionFromAsset(uri, asset?.fileName);
  const contentType =
    asset?.mimeType && asset.mimeType.includes("/")
      ? asset.mimeType
      : contentTypeForExtension(ext);
  const path = `opportunity_${Date.now()}.${ext}`;

  const publicUrl = await withRetry(() =>
    uploadFileStreaming({
      bucket: OPPORTUNITY_IMAGES_BUCKET,
      path,
      fileUri: uri,
      contentType,
      upsert: false,
    })
  );

  if (!publicUrl?.trim()) {
    throw new Error("Image was uploaded but the public URL is invalid.");
  }

  return { path, publicUrl };
}

/**
 * Best-effort cleanup for a superseded/removed opportunity image. Never
 * throws — a failed delete just leaves an orphaned object in storage,
 * which isn't worth surfacing to the user over.
 */
export async function deleteOpportunityImage(path) {
  if (!path) return;
  try {
    await supabase.storage.from(OPPORTUNITY_IMAGES_BUCKET).remove([path]);
  } catch (err) {
    console.warn("Failed to delete previous opportunity image:", err);
  }
}

/**
 * @returns {{ valid: boolean, errors: Record<string, string> }}
 */
export function validateOpportunityForm(form) {
  const errors = {};

  const title = trimmed(form.title);
  if (!title) errors.title = "Give the opportunity a title";
  else if (title.length < 4) errors.title = "Title is too short";
  else if (title.length > 120) errors.title = "Keep the title under 120 characters";

  const description = trimmed(form.description);
  if (!description) errors.description = "Describe the gig so DJs know what to expect";
  else if (description.length < 20)
    errors.description = "Add a bit more detail (20 characters minimum)";
  else if (description.length > 2000)
    errors.description = "Keep the description under 2000 characters";

  if (!trimmed(form.venue)) errors.venue = "Where is it happening?";
  if (!trimmed(form.city)) errors.city = "Add a city";

  const eventDate = trimmed(form.eventDate);
  if (!eventDate) {
    errors.eventDate = "Add the event date";
  } else if (!DATE_PATTERN.test(eventDate) || !isRealCalendarDate(eventDate)) {
    errors.eventDate = "Use the format YYYY-MM-DD";
  } else if (eventDate < todayIso()) {
    errors.eventDate = "The event date is in the past";
  }

  const startTime = trimmed(form.startTime);
  if (startTime && !TIME_PATTERN.test(startTime)) {
    errors.startTime = "Use 24h format, e.g. 22:00";
  }

  const endTime = trimmed(form.endTime);
  if (endTime && !TIME_PATTERN.test(endTime)) {
    errors.endTime = "Use 24h format, e.g. 03:00";
  }

  const payment = trimmed(form.payment);
  if (payment) {
    const amount = Number(payment);
    if (!Number.isFinite(amount) || amount < 0) {
      errors.payment = "Enter a number, or leave blank if unpaid";
    }
  }

  const genres = Array.isArray(form.genres) ? form.genres : [];
  if (genres.length === 0) {
    errors.genres = "Pick at least one genre";
  } else if (genres.length > MAX_OPPORTUNITY_GENRES) {
    errors.genres = `Pick up to ${MAX_OPPORTUNITY_GENRES} genres`;
  } else if (genres.includes(GENRE_OTHER) && !trimmed(form.customGenre)) {
    errors.customGenre = "Enter the genre";
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/** Swaps the "Other" sentinel for the typed-in value and joins for storage.
 * opportunities.genre is a single TEXT column (not an array) — matching
 * lib/ai-matchmaking.js's scoring, which already expects/splits a
 * comma-separated genre string, so this needs no schema migration. */
function buildGenreString(genres, customGenre) {
  const list = (Array.isArray(genres) ? genres : [])
    .map((g) => (g === GENRE_OTHER ? trimmed(customGenre) : g))
    .filter(Boolean);
  return list.join(", ");
}

/**
 * Shape the form into an `opportunities` row. Exported for tests / previews.
 * @param {string} [organizerFallback] Used when the organiser field is blank
 *   (the form tells the user it falls back to their DJ name).
 */
export function buildOpportunityRow(form, userId, organizerFallback) {
  const payment = trimmed(form.payment);
  const startTime = trimmed(form.startTime);
  const endTime = trimmed(form.endTime);
  const eventDate = trimmed(form.eventDate);
  const location = trimmed(form.location) || trimmed(form.city);
  const organizerName =
    trimmed(form.organizerName) || trimmed(organizerFallback) || null;
  const { startTs, endTs } = buildEventTimestamps(eventDate, startTime, endTime);

  return {
    title: trimmed(form.title),
    description: trimmed(form.description),
    venue: trimmed(form.venue),
    city: trimmed(form.city),
    location,
    event_date: eventDate,
    event_start_time: startTs,
    event_end_time: endTs,
    payment: payment ? Number(payment) : null,
    payment_currency: form.paymentCurrency || "GBP",
    genre: buildGenreString(form.genres, form.customGenre),
    skill_level: form.skillLevel || "intermediate",
    organizer_name: organizerName,
    image_url: trimmed(form.imageUrl) || null,
    created_by: userId,
    submitted_by: userId,
    // Held back from the swipe deck until a reviewer approves it.
    is_active: false,
    moderation_status: "pending",
  };
}

/**
 * Validates and inserts a user-submitted opportunity.
 * @throws {Error} with `alertTitle` set, matching the mixUploadService contract.
 */
export async function submitOpportunity(form, userId, organizerFallback) {
  if (!userId) {
    const err = new Error("You need to be signed in to submit an opportunity.");
    err.alertTitle = "Not signed in";
    throw err;
  }

  const { valid, errors } = validateOpportunityForm(form);
  if (!valid) {
    const err = new Error(Object.values(errors)[0]);
    err.alertTitle = "Check the form";
    err.fieldErrors = errors;
    throw err;
  }

  const { data, error } = await supabase
    .from("opportunities")
    .insert([buildOpportunityRow(form, userId, organizerFallback)])
    .select()
    .single();

  if (error) {
    // PostgREST reports only the FIRST missing column per request, so check
    // every column the migration adds — otherwise an un-migrated database
    // surfaces a raw "schema cache" error instead of an actionable one.
    const missingColumn = [
      "moderation_status",
      "submitted_by",
      "created_by",
      "reviewed_at",
      "rejection_reason",
    ].some((column) => error.message?.includes(column));

    const err = new Error(
      missingColumn
        ? "Opportunity submissions aren't enabled yet on the server. Run the add-user-submitted-opportunities migration."
        : error.message || "Could not submit the opportunity. Please try again."
    );
    err.alertTitle = "Submission failed";
    throw err;
  }

  return data;
}
