/**
 * Opportunity share copy: formatting + optional referral block.
 * - `buildOpportunityShareMessage` is pure (no I/O) — pass `inviteCode` when known.
 * - `generateOpportunityShareMessage` resolves invite via DB unless `inviteCode` is supplied.
 *
 * Date/time/location are passed through trimmed; callers should pre-format ISO dates if needed.
 */

import { db } from "./supabase";

export const SHARE_BRAND_NAME = "R/HOOD";
export const SHARE_APP_DOWNLOAD_URL = "https://rhood.io/download";

/** Keep external shares (SMS/WhatsApp) skimmable */
const SHARE_DESCRIPTION_MAX_LEN = 200;

function trimField(value) {
  if (value == null) return "";
  return String(value)
    .trim()
    .replace(/\s+/g, " ");
}

function truncateDescription(text) {
  const t = trimField(text);
  if (!t) return "";
  if (t.length <= SHARE_DESCRIPTION_MAX_LEN) return t;
  return `${t.slice(0, SHARE_DESCRIPTION_MAX_LEN).trimEnd()}…`;
}

/**
 * Build share text only (no network). For tests or when invite code is already loaded.
 *
 * @param {object} opportunity
 * @param {object} [opts]
 * @param {string|null} [opts.inviteCode]
 * @param {boolean} [opts.includeReferralBlock]
 * @param {boolean} [opts.includeDownloadLink]
 * @returns {string}
 */
export function buildOpportunityShareMessage(
  opportunity,
  {
    inviteCode = null,
    includeReferralBlock = true,
    includeDownloadLink = true,
  } = {}
) {
  const title = trimField(opportunity?.title) || "DJ Opportunity";
  const description = truncateDescription(opportunity?.description);

  const parts = [title];
  if (description) {
    parts.push(description);
  }

  const details = [];
  const add = (label, value) => {
    const t = trimField(value);
    if (t) details.push(`${label}: ${t}`);
  };
  add("Date", opportunity?.date);
  add("Time", opportunity?.time);
  add("Location", opportunity?.location);
  add("Compensation", opportunity?.compensation);
  add("Distance", opportunity?.distanceFormatted);

  if (details.length > 0) {
    parts.push(details.join("\n"));
  }

  const code = includeReferralBlock && inviteCode ? trimField(inviteCode) : "";
  if (code) {
    parts.push(
      `Use my invite code when you sign up: ${code}`,
      `It helps me earn credits and gets you started on ${SHARE_BRAND_NAME}.`
    );
  }

  if (includeDownloadLink) {
    parts.push(`Download ${SHARE_BRAND_NAME}: ${SHARE_APP_DOWNLOAD_URL}`);
  }

  parts.push(`Check it out on ${SHARE_BRAND_NAME}.`);
  return parts.join("\n\n");
}

/**
 * @param {object} opportunity
 * @param {object} [options]
 * @param {string} [options.userId] - Loads invite from DB when referral enabled and `inviteCode` omitted
 * @param {string|null|undefined} [options.inviteCode] - If key is present, DB is skipped (use null to skip block)
 * @param {boolean} [options.includeReferralCode=true]
 * @param {boolean} [options.includeDownloadLink=true]
 * @returns {Promise<string>}
 */
export async function generateOpportunityShareMessage(
  opportunity,
  options = {}
) {
  const {
    userId,
    includeReferralCode = true,
    includeDownloadLink = true,
  } = options;

  const inviteExplicit = Object.prototype.hasOwnProperty.call(
    options,
    "inviteCode"
  );

  try {
    let inviteCode = null;
    if (includeReferralCode && userId) {
      if (inviteExplicit) {
        inviteCode = options.inviteCode ?? null;
      } else {
        try {
          inviteCode = await db.getUserInviteCode(userId);
        } catch (error) {
          console.warn("Failed to get invite code for sharing:", error);
        }
      }
    }

    return buildOpportunityShareMessage(opportunity, {
      inviteCode,
      includeReferralBlock: includeReferralCode,
      includeDownloadLink,
    });
  } catch (error) {
    console.error("Error generating share message:", error);
    const title = trimField(opportunity?.title) || "DJ Opportunity";
    const bits = [title];
    if (includeDownloadLink) {
      bits.push(`Download ${SHARE_BRAND_NAME}: ${SHARE_APP_DOWNLOAD_URL}`);
    }
    bits.push(`Check it out on ${SHARE_BRAND_NAME}.`);
    return bits.join("\n\n");
  }
}

export async function generateExternalShareMessage(opportunity, userId) {
  return generateOpportunityShareMessage(opportunity, {
    userId,
    includeReferralCode: true,
    includeDownloadLink: true,
  });
}

export async function generateDMShareMessage(opportunity, userId) {
  return generateOpportunityShareMessage(opportunity, {
    userId,
    includeReferralCode: true,
    includeDownloadLink: false,
  });
}
