// lib/notificationSetup.js
// Setup notification categories and handlers for lock screen audio controls

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import backgroundAudioService from './backgroundAudioService';

export async function setupAudioNotificationCategories() {
  if (Platform.OS !== 'ios') return;

  try {
    // Define audio playback notification category with actions
    await Notifications.setNotificationCategoryAsync('AUDIO_PLAYBACK', [
      {
        identifier: 'PLAY_PAUSE',
        buttonTitle: 'Play/Pause',
        options: {
          opensAppToForeground: false,
        },
      },
      {
        identifier: 'STOP',
        buttonTitle: 'Stop',
        options: {
          opensAppToForeground: false,
          isDestructive: true,
        },
      },
    ]);

    console.log('✅ Audio notification categories set up');
  } catch (error) {
    console.error('❌ Error setting up notification categories:', error);
  }
}

export function setupNotificationListeners() {
  // Listen for notification responses (when user taps notification actions)
  const notificationListener = Notifications.addNotificationResponseReceivedListener(response => {
    const { actionIdentifier, notification } = response;
    
    console.log('📱 Notification action received:', actionIdentifier);
    
    // Handle different notification actions
    switch (actionIdentifier) {
      case 'PLAY_PAUSE':
        const currentState = backgroundAudioService.getPlaybackState();
        if (currentState.isPlaying) {
          backgroundAudioService.pauseTrack();
        } else {
          backgroundAudioService.resumeTrack();
        }
        break;
        
      case 'STOP':
        backgroundAudioService.stopTrack();
        break;
        
      case Notifications.DEFAULT_ACTION_IDENTIFIER:
        // User tapped the notification itself (not an action button)
        // Could open the app to the current track
        console.log('📱 Notification tapped');
        break;
        
      default:
        console.log('📱 Unknown notification action:', actionIdentifier);
    }
  });

  // Listen for notifications received while app is in foreground
  const receivedListener = Notifications.addNotificationReceivedListener(notification => {
    console.log('📱 Notification received:', notification);
  });

  return () => {
    notificationListener.remove();
    receivedListener.remove();
  };
}

export async function requestNotificationPermissions() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('⚠️ Notification permissions not granted');
      return false;
    }

    console.log('✅ Notification permissions granted');
    return true;
  } catch (error) {
    console.error('❌ Error requesting notification permissions:', error);
    return false;
  }
}
