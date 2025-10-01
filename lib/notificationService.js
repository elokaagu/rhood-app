import { supabase } from './supabase';

/**
 * Notification service for handling push notifications via Expo
 */

export interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface InAppNotificationData {
  user_id: string;
  title: string;
  message: string;
  type: 'application_approved' | 'application_rejected' | 'application_received' | 'general';
  related_id?: string; // opportunity_id or application_id
  is_read?: boolean;
}

/**
 * Send push notification via Expo Push API
 */
export async function sendPushNotification(
  userId: string,
  pushData: PushNotificationData
): Promise<{ success: boolean; error?: string }> {
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
 */
export async function createInAppNotification(
  notificationData: InAppNotificationData
): Promise<{ success: boolean; error?: string }> {
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
 * Send both push and in-app notifications
 */
export async function sendApplicationStatusNotification(
  userId: string,
  opportunityTitle: string,
  status: 'approved' | 'rejected',
  applicationId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const isApproved = status === 'approved';
    const title = isApproved 
      ? '🎉 Application Approved!' 
      : 'Application Update';
    const body = isApproved
      ? `Great news! Your application for "${opportunityTitle}" has been approved.`
      : `Your application for "${opportunityTitle}" was not selected this time.`;

    // Create in-app notification
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

    // Return success if either notification method worked
    if (inAppResult.success || pushResult.success) {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: `In-app: ${inAppResult.error}, Push: ${pushResult.error}` 
      };
    }
  } catch (error) {
    console.error('Error sending application status notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Register Expo token for a user
 */
export async function registerExpoToken(
  userId: string,
  expoToken: string,
  deviceId?: string,
  platform?: 'ios' | 'android' | 'web'
): Promise<{ success: boolean; error?: string }> {
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
 */
export async function unregisterExpoToken(
  userId: string
): Promise<{ success: boolean; error?: string }> {
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
