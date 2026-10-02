/**
 * Blocks objectionable text before it is posted (App Review Guideline 1.2).
 * Reports and blocks remain the main moderation path; this catches the
 * obvious cases client-side so they never reach other users.
 */

export const OBJECTIONABLE_CONTENT_CODE = "OBJECTIONABLE_CONTENT";
export const OBJECTIONABLE_CONTENT_MESSAGE =
  "This contains language that isn't allowed on R/HOOD. Please edit it and try again.";

const BLOCKED_TERMS = [
  "nigger",
  "nigga",
  "faggot",
  "fag",
  "retard",
  "tranny",
  "chink",
  "spic",
  "kike",
  "wetback",
  "paki",
  "coon",
  "gook",
  "dyke",
  "cunt",
  "whore",
  "slut",
  "rape",
  "rapist",
  "pedo",
  "paedo",
  "pedophile",
  "paedophile",
  "childporn",
  "kys",
  "killyourself",
];

const LEET_MAP = { 0: "o", 1: "i", 3: "e", 4: "a", 5: "s", 7: "t", "@": "a", $: "s", "!": "i" };

function normalise(text) {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[01345@$!7]/g, (ch) => LEET_MAP[ch] || ch);
}

const WORD_PATTERN = new RegExp(`\\b(?:${BLOCKED_TERMS.join("|")})(?:s|es|ed|ing)?\\b`, "i");
const PHRASE_PATTERN = /\bkill\s+your\s*self\b|\bchild\s+porn\b/i;

/** @returns {boolean} */
export function containsObjectionableContent(text) {
  if (typeof text !== "string" || !text.trim()) return false;
  const normalised = normalise(text);
  return WORD_PATTERN.test(normalised) || PHRASE_PATTERN.test(normalised);
}

export function objectionableContentError() {
  const error = new Error(OBJECTIONABLE_CONTENT_MESSAGE);
  error.code = OBJECTIONABLE_CONTENT_CODE;
  return error;
}

/** Throws if any of the given strings contains objectionable content. */
export function assertAllowedText(...values) {
  if (values.some(containsObjectionableContent)) {
    throw objectionableContentError();
  }
}
