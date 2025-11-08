import { supabase } from './supabase';

/**
 * Notification service for handling push notifications via Expo
 * Also handles email notifications for application status changes
 */

/**
 * Send push notification via Expo Push API
 * @param {string} userId - User ID to send notification to
 * @param {Object} pushData - Push notification data
 * @param {string} pushData.title - Notification title
 * @param {string} pushData.body - Notification body
 * @param {Object} [pushData.data] - Additional data
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendPushNotification(userId, pushData) {
  try {
    // Get user's Expo token
    const { data: userToken, error: tokenError } = await supabase
      .from('user_expo_tokens')
      .select('expo_token')
      .eq('user_id', userId)
      .single();

    if (tokenError || !userToken?.expo_token) {
      console.log('No Expo token found for user:', userId);
      return { success: false, error: 'No Expo token found' };
    }

    // Prepare message for Expo Push API
    const message = {
      to: userToken.expo_token,
      sound: 'default',
      title: pushData.title,
      body: pushData.body,
      data: pushData.data || {},
    };

    // Send via Expo Push API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    
    if (result.data && result.data.status === 'ok') {
      console.log('Push notification sent successfully:', result);
      return { success: true };
    } else {
      console.error('Failed to send push notification:', result);
      return { success: false, error: result.message || 'Unknown error' };
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
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
    // Validate related_id is a proper UUID if provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validRelatedId = notificationData.related_id && uuidRegex.test(notificationData.related_id) 
      ? notificationData.related_id 
      : null;

    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: notificationData.user_id,
        title: notificationData.title,
        message: notificationData.message,
        type: notificationData.type,
        related_id: validRelatedId,
        is_read: notificationData.is_read || false,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error creating in-app notification:', error);
      return { success: false, error: error.message };
    }

    console.log('In-app notification created successfully');
    return { success: true };
  } catch (error) {
    console.error('Error creating in-app notification:', error);
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
    const isApproved = status === 'approved';
    const subject = isApproved 
      ? `Application Approved - ${opportunityTitle}`
      : `Application Update - ${opportunityTitle}`;
    
    const html = isApproved
      ? `
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
              <p>Hi ${userName},</p>
              <p>Great news! Your application for <strong>"${opportunityTitle}"</strong> has been approved.</p>
              <p>We're excited to have you on board. You should receive additional details about next steps soon.</p>
              <p>Thank you for applying to R/HOOD.</p>
              <p>Best regards,<br>The R/HOOD Team</p>
            </div>
          </div>
        </body>
        </html>
      `
      : `
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
              <p>Hi ${userName},</p>
              <p>Thank you for your interest in <strong>"${opportunityTitle}"</strong>.</p>
              <p>Unfortunately, your application was not selected this time. We appreciate your interest and encourage you to apply for other opportunities in the future.</p>
              <p>Best regards,<br>The R/HOOD Team</p>
            </div>
          </div>
        </body>
        </html>
      `;

    const text = isApproved
      ? `Hi ${userName},\n\nGreat news! Your application for "${opportunityTitle}" has been approved.\n\nWe're excited to have you on board. You should receive additional details about next steps soon.\n\nThank you for applying to R/HOOD.\n\nBest regards,\nThe R/HOOD Team`
      : `Hi ${userName},\n\nThank you for your interest in "${opportunityTitle}".\n\nUnfortunately, your application was not selected this time. We appreciate your interest and encourage you to apply for other opportunities in the future.\n\nBest regards,\nThe R/HOOD Team`;

    // Try to send via Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        to: userEmail,
        subject,
        html,
        text,
      },
    });

    if (error) {
      console.log('Edge Function not available, email will be sent via alternative method');
      // Email sending will be handled by database trigger or alternative method
      return { success: false, error: 'Edge Function not configured' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending email notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send both push, in-app, and email notifications
 */
export async function sendApplicationStatusNotification(
  userId,
  opportunityTitle,
  status,
  applicationId,
  userEmail,
  userName
) {
  try {
    const isApproved = status === 'approved';
    const title = isApproved 
      ? 'Application Approved' 
      : 'Application Update';
    const body = isApproved
      ? `Great news! Your application for "${opportunityTitle}" has been approved.`
      : `Your application for "${opportunityTitle}" was not selected this time.`;

    // Create in-app notification (database trigger also creates this, but we do it here for consistency)
    const inAppResult = await createInAppNotification({
      user_id: userId,
      title: title,
      message: body,
      type: isApproved ? 'application_approved' : 'application_rejected',
      related_id: applicationId,
      is_read: false,
    });

    // Send push notification
    const pushResult = await sendPushNotification(userId, {
      title: title,
      body: body,
      data: {
        type: isApproved ? 'application_approved' : 'application_rejected',
        opportunity_title: opportunityTitle,
        application_id: applicationId,
      },
    });

    // Send email notification if email and name are provided
    let emailResult = { success: false };
    if (userEmail && userName) {
      emailResult = await sendEmailNotification(
        userEmail,
        userName,
        opportunityTitle,
        status
      );
    }

    // Return success if any notification method worked
    if (inAppResult.success || pushResult.success || emailResult.success) {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: `In-app: ${inAppResult.error || 'N/A'}, Push: ${pushResult.error || 'N/A'}, Email: ${emailResult.error || 'N/A'}` 
      };
    }
  } catch (error) {
    console.error('Error sending application status notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Register Expo token for a user
 * @param {string} userId - User ID
 * @param {string} expoToken - Expo push token
 * @param {string} [deviceId] - Device ID
 * @param {string} [platform] - Platform ('ios', 'android', 'web')
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function registerExpoToken(userId, expoToken, deviceId, platform) {
  try {
    const { error } = await supabase
      .from('user_expo_tokens')
      .upsert({
        user_id: userId,
        expo_token: expoToken,
        device_id: deviceId,
        platform: platform,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error registering Expo token:', error);
      return { success: false, error: error.message };
    }

    console.log('Expo token registered successfully for user:', userId);
    return { success: true };
  } catch (error) {
    console.error('Error registering Expo token:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Unregister Expo token for a user
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function unregisterExpoToken(userId) {
  try {
    const { error } = await supabase
      .from('user_expo_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error unregistering Expo token:', error);
      return { success: false, error: error.message };
    }

    console.log('Expo token unregistered successfully for user:', userId);
    return { success: true };
  } catch (error) {
    console.error('Error unregistering Expo token:', error);
    return { success: false, error: error.message };
  }
}
