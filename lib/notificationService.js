import {
  getApplicationNotificationPayload,
  getApplicationStatusEmailTemplate,
} from "./notificationTemplates";
import { supabase } from "./supabase";

/**
 * Notification orchestration: in-app rows, client-initiated Expo push, optional email via Edge Function.
 *
 * Note: Production systems usually send push from a trusted backend (retries, receipts, secrets).
 * This client path is convenient for early-stage flows; plan to migrate delivery server-side.
 */

function devLog(...args) {
  if (__DEV__) {
    console.log(...args);
  }
}

function isDeviceNotRegisteredTicket(ticket) {
  const code = ticket?.details?.error;
  if (code === "DeviceNotRegistered") return true;
  const msg = ticket?.message;
  return typeof msg === "string" && msg.includes("not a registered push");
}

/**
 * Send push notification via Expo Push API (all registered tokens for the user).
 * Parses push tickets and removes known-dead tokens (DeviceNotRegistered) from `user_expo_tokens`.
 *
 * @param {string} userId - User ID to send notification to
 * @param {Object} pushData - Push notification data
 * @param {string} pushData.title - Notification title
 * @param {string} pushData.body - Notification body
 * @param {Object} [pushData.data] - Additional data
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendPushNotification(userId, pushData) {
  try {
    const { data: rows, error: tokenError } = await supabase
      .from("user_expo_tokens")
      .select("expo_token")
      .eq("user_id", userId);

    if (tokenError || !rows?.length) {
      devLog("No Expo tokens found for user:", userId);
      return { success: false, error: "No Expo token found" };
    }

    const tokens = [
      ...new Set(
        rows.map((r) => r.expo_token).filter((t) => typeof t === "string" && t.trim())
      ),
    ];

    if (!tokens.length) {
      devLog("No valid Expo tokens for user:", userId);
      return { success: false, error: "No Expo token found" };
    }

    const messages = tokens.map((to) => ({
      to,
      sound: "default",
      title: pushData.title,
      body: pushData.body,
      data: pushData.data || {},
    }));

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    const tickets = Array.isArray(result.data)
      ? result.data
      : result.data
        ? [result.data]
        : [];

    let anyOk = false;
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      if (ticket?.status === "ok") {
        anyOk = true;
      } else if (isDeviceNotRegisteredTicket(ticket) && tokens[i]) {
        const { error: delErr } = await supabase
          .from("user_expo_tokens")
          .delete()
          .eq("user_id", userId)
          .eq("expo_token", tokens[i]);
        if (delErr && __DEV__) {
          console.warn("Failed to remove stale Expo token:", delErr);
        } else {
          devLog("Removed stale Expo token for user", userId);
        }
      }
    }

    if (anyOk) {
      devLog("Push notification ticket(s) ok:", result);
      return { success: true };
    }

    if (__DEV__) {
      console.error("Failed to send push notification:", result);
    }
    return {
      success: false,
      error: result.message || "Unknown push error",
    };
  } catch (error) {
    console.error("Error sending push notification:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Create in-app notification in database
 * @param {Object} notificationData - Notification data
 * @param {string} notificationData.user_id - User ID
 * @param {string} notificationData.title - Notification title
 * @param {string} notificationData.message - Notification message
 * @param {string} notificationData.type - Notification type
 * @param {string} [notificationData.related_id] - Related ID (opportunity_id or application_id)
 * @param {boolean} [notificationData.is_read] - Whether notification is read
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function createInAppNotification(notificationData) {
  try {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validRelatedId =
      notificationData.related_id &&
      uuidRegex.test(notificationData.related_id)
        ? notificationData.related_id
        : null;

    const { error } = await supabase.from("notifications").insert({
      user_id: notificationData.user_id,
      title: notificationData.title,
      message: notificationData.message,
      type: notificationData.type,
      related_id: validRelatedId,
      is_read: notificationData.is_read || false,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error creating in-app notification:", error);
      return { success: false, error: error.message };
    }

    devLog("In-app notification created successfully");
    return { success: true };
  } catch (error) {
    console.error("Error creating in-app notification:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send email notification via Supabase Edge Function
 */
async function sendEmailNotification(
  userEmail,
  userName,
  opportunityTitle,
  status
) {
  try {
    const { subject, html, text } = getApplicationStatusEmailTemplate({
      userName,
      opportunityTitle,
      status,
    });

    const { error } = await supabase.functions.invoke("send-email", {
      body: {
        to: userEmail,
        subject,
        html,
        text,
      },
    });

    if (error) {
      devLog(
        "Edge Function not available, email will be sent via alternative method"
      );
      return { success: false, error: "Edge Function not configured" };
    }

    return { success: true };
  } catch (error) {
    console.error("Error sending email notification:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Send push, optional in-app, and optional email for application status changes.
 *
 * @param {object} [options]
 * @param {boolean} [options.skipInApp=false] — Set true when `notify_application_status_change`
 *   (or another DB trigger) already inserts the in-app row, to avoid duplicates.
 */
export async function sendApplicationStatusNotification(
  userId,
  opportunityTitle,
  status,
  applicationId,
  userEmail,
  userName,
  options = {}
) {
  const { skipInApp = false } = options;

  try {
    const { title, body, notificationType } = getApplicationNotificationPayload(
      status,
      opportunityTitle
    );

    let inAppResult = { success: false };
    if (!skipInApp) {
      inAppResult = await createInAppNotification({
        user_id: userId,
        title,
        message: body,
        type: notificationType,
        related_id: applicationId,
        is_read: false,
      });
    }

    const pushResult = await sendPushNotification(userId, {
      title,
      body,
      data: {
        type: notificationType,
        opportunity_title: opportunityTitle,
        application_id: applicationId,
        status,
      },
    });

    let emailResult = { success: false };
    if (userEmail && userName) {
      emailResult = await sendEmailNotification(
        userEmail,
        userName,
        opportunityTitle,
        status
      );
    }

    if (
      skipInApp ||
      inAppResult.success ||
      pushResult.success ||
      emailResult.success
    ) {
      return { success: true };
    }
    return {
      success: false,
      error: `In-app: ${inAppResult.error || "N/A"}, Push: ${pushResult.error || "N/A"}, Email: ${emailResult.error || "N/A"}`,
    };
  } catch (error) {
    console.error("Error sending application status notification:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Register Expo token for a user
 * @param {string} userId - User ID
 * @param {string} expoToken - Expo push token
 * @param {string} [deviceId] - Per-app-install id (persisted client-side); stored in `device_id` column
 * @param {string} [platform] - Platform ('ios', 'android', 'web')
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function registerExpoToken(userId, expoToken, deviceId, platform) {
  try {
    const { error } = await supabase.from("user_expo_tokens").upsert({
      user_id: userId,
      expo_token: expoToken,
      device_id: deviceId,
      platform: platform,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error registering Expo token:", error);
      return { success: false, error: error.message };
    }

    devLog("Expo token registered successfully for user:", userId);
    return { success: true };
  } catch (error) {
    console.error("Error registering Expo token:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Remove one Expo push token for this user (current device). Does not delete other devices.
 * @param {string} userId - User ID
 * @param {string} expoToken - Expo push token for this device
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function unregisterExpoToken(userId, expoToken) {
  try {
    if (!expoToken || typeof expoToken !== "string") {
      return { success: false, error: "expoToken is required" };
    }

    const { error } = await supabase
      .from("user_expo_tokens")
      .delete()
      .eq("user_id", userId)
      .eq("expo_token", expoToken);

    if (error) {
      console.error("Error unregistering Expo token:", error);
      return { success: false, error: error.message };
    }

    devLog("Expo token unregistered for user:", userId);
    return { success: true };
  } catch (error) {
    console.error("Error unregistering Expo token:", error);
    return { success: false, error: error.message };
  }
}
