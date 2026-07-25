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
  genre: "",
  skillLevel: "intermediate",
  organizerName: "",
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

  if (!trimmed(form.genre)) errors.genre = "Pick a genre";

  return { valid: Object.keys(errors).length === 0, errors };
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
  const location = trimmed(form.location) || trimmed(form.city);
  const organizerName =
    trimmed(form.organizerName) || trimmed(organizerFallback) || null;

  return {
    title: trimmed(form.title),
    description: trimmed(form.description),
    venue: trimmed(form.venue),
    city: trimmed(form.city),
    location,
    event_date: trimmed(form.eventDate),
    event_start_time: startTime || null,
    event_end_time: endTime || null,
    payment: payment ? Number(payment) : null,
    payment_currency: form.paymentCurrency || "GBP",
    genre: trimmed(form.genre),
    skill_level: form.skillLevel || "intermediate",
    organizer_name: organizerName,
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
    const err = new Error(
      error.message?.includes("moderation_status") ||
      error.message?.includes("submitted_by")
        ? "Opportunity submissions aren't enabled yet on the server. Run the add-user-submitted-opportunities migration."
        : error.message || "Could not submit the opportunity. Please try again."
    );
    err.alertTitle = "Submission failed";
    throw err;
  }

  return data;
}
