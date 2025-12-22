/**
 * Share Opportunity Utility
 * Handles sharing opportunities with referral code embedding
 */

import { db } from "./supabase";

/**
 * Generate share message for an opportunity with referral code
 */
export async function generateOpportunityShareMessage(
  opportunity,
  userId,
  includeReferralCode = true,
  includeDownloadLink = true
) {
  try {
    // Build opportunity details
    let shareMessage = `${opportunity.title || "DJ Opportunity"}\n\n`;

    if (opportunity.description) {
      shareMessage += `${opportunity.description}\n\n`;
    }

    const details = [];
    if (opportunity.date) details.push(`Date: ${opportunity.date}`);
    if (opportunity.time) details.push(`Time: ${opportunity.time}`);
    if (opportunity.location)
      details.push(`Location: ${opportunity.location}`);
    if (opportunity.compensation)
      details.push(`Compensation: ${opportunity.compensation}`);
    if (opportunity.distanceFormatted)
      details.push(`Distance: ${opportunity.distanceFormatted}`);

    if (details.length > 0) {
      shareMessage += details.join("\n") + "\n\n";
    }

    // Add referral code if requested and user is available
    if (includeReferralCode && userId) {
      try {
        const inviteCode = await db.getUserInviteCode(userId);
        if (inviteCode) {
          shareMessage += `Use my invite code when you sign up: ${inviteCode}\n\n`;
          shareMessage += `You'll help me earn credits and I'll help you get started.\n\n`;
        }
      } catch (error) {
        console.warn("Failed to get invite code for sharing:", error);
      }
    }

    // Add app download link only for external sharing (not for in-app DM)
    if (includeDownloadLink) {
      shareMessage += `Download R/HOOD app: https://rhood.io/download\n\n`;
    }
    
    shareMessage += `Check it out on R/HOOD.`;

    return shareMessage;
  } catch (error) {
    console.error("Error generating share message:", error);
    return `${opportunity.title || "DJ Opportunity"}\n\nCheck it out on R/HOOD.`;
  }
}

/**
 * Generate share message for external sharing (SMS, WhatsApp, etc.)
 */
export async function generateExternalShareMessage(opportunity, userId) {
  return generateOpportunityShareMessage(opportunity, userId, true, true);
}

/**
 * Generate share message for in-app DM sharing
 * Excludes download link since recipient is already in the app
 */
export async function generateDMShareMessage(opportunity, userId) {
  return generateOpportunityShareMessage(opportunity, userId, true, false);
}

