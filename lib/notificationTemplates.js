/**
 * Copy and HTML for application-status notifications (email + shared push/in-app fields).
 * Keeps notificationService focused on orchestration and delivery.
 */

const DEFAULT_KEY = "_default";

function escapeHtml(s) {
  if (s == null || typeof s !== "string") return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Maps application workflow status → push / in-app title, body, and notification type.
 * Add keys as new statuses appear (e.g. shortlisted, waitlisted).
 */
export const APPLICATION_NOTIFICATION_CONFIG = {
  approved: {
    title: "Application Approved",
    notificationType: "application_approved",
    body: (opportunityTitle) =>
      `Great news! Your application for "${opportunityTitle}" has been approved.`,
  },
  rejected: {
    title: "Application Update",
    notificationType: "application_rejected",
    body: (opportunityTitle) =>
      `Your application for "${opportunityTitle}" was not selected this time.`,
  },
  [DEFAULT_KEY]: {
    title: "Application Update",
    notificationType: "application_status",
    body: (opportunityTitle) =>
      `Your application for "${opportunityTitle}" has been updated. Open the app for details.`,
  },
};

/**
 * @param {string} status - Raw status from DB or admin UI
 * @param {string} opportunityTitle
 * @returns {{ title: string, body: string, notificationType: string }}
 */
export function getApplicationNotificationPayload(status, opportunityTitle) {
  const key = (status || "").toLowerCase().trim();
  const config =
    APPLICATION_NOTIFICATION_CONFIG[key] ||
    APPLICATION_NOTIFICATION_CONFIG[DEFAULT_KEY];
  const title = opportunityTitle || "Opportunity";
  return {
    title: config.title,
    body: config.body(title),
    notificationType: config.notificationType,
  };
}

function emailApprovedHtml(userName, opportunityTitle) {
  const name = escapeHtml(userName);
  const opp = escapeHtml(opportunityTitle);
  return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Application Approved!</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Great news! Your application for <strong>"${opp}"</strong> has been approved.</p>
              <p>We're excited to have you on board. You should receive additional details about next steps soon.</p>
              <p>Thank you for applying to R/HOOD.</p>
              <p>Best regards,<br>The R/HOOD Team</p>
            </div>
          </div>
        </body>
        </html>
      `;
}

function emailRejectedHtml(userName, opportunityTitle) {
  const name = escapeHtml(userName);
  const opp = escapeHtml(opportunityTitle);
  return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #666; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Application Update</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>Thank you for your interest in <strong>"${opp}"</strong>.</p>
              <p>Unfortunately, your application was not selected this time. We appreciate your interest and encourage you to apply for other opportunities in the future.</p>
              <p>Best regards,<br>The R/HOOD Team</p>
            </div>
          </div>
        </body>
        </html>
      `;
}

function emailGenericHtml(userName, opportunityTitle) {
  const name = escapeHtml(userName);
  const opp = escapeHtml(opportunityTitle);
  return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #333; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 5px 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Application Update</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              <p>There is an update regarding your application for <strong>"${opp}"</strong>.</p>
              <p>Open the R/HOOD app for the latest details.</p>
              <p>Best regards,<br>The R/HOOD Team</p>
            </div>
          </div>
        </body>
        </html>
      `;
}

/**
 * @param {{ userName: string, opportunityTitle: string, status: string }} params
 * @returns {{ subject: string, html: string, text: string }}
 */
export function getApplicationStatusEmailTemplate({
  userName,
  opportunityTitle,
  status,
}) {
  const key = (status || "").toLowerCase().trim();
  const title = opportunityTitle || "Opportunity";

  if (key === "approved") {
    return {
      subject: `Application Approved - ${title}`,
      html: emailApprovedHtml(userName, title),
      text: `Hi ${userName},\n\nGreat news! Your application for "${title}" has been approved.\n\nWe're excited to have you on board. You should receive additional details about next steps soon.\n\nThank you for applying to R/HOOD.\n\nBest regards,\nThe R/HOOD Team`,
    };
  }

  if (key === "rejected") {
    return {
      subject: `Application Update - ${title}`,
      html: emailRejectedHtml(userName, title),
      text: `Hi ${userName},\n\nThank you for your interest in "${title}".\n\nUnfortunately, your application was not selected this time. We appreciate your interest and encourage you to apply for other opportunities in the future.\n\nBest regards,\nThe R/HOOD Team`,
    };
  }

  return {
    subject: `Application Update - ${title}`,
    html: emailGenericHtml(userName, title),
    text: `Hi ${userName},\n\nThere is an update regarding your application for "${title}". Open the R/HOOD app for the latest details.\n\nBest regards,\nThe R/HOOD Team`,
  };
}
