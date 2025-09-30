import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { sendApplicationStatusNotification } from '../lib/notificationService';

const NotificationTest = ({ userId }) => {
  const [isLoading, setIsLoading] = useState(false);

  const sendTestNotification = async (status) => {
    if (!userId) {
      Alert.alert('Error', 'No user ID available');
      return;
    }

    setIsLoading(true);
    try {
      const result = await sendApplicationStatusNotification(
        userId,
        'Test Opportunity',
        status,
        'test-application-id'
      );

      if (result.success) {
        Alert.alert(
          'Success',
          `Test ${status} notification sent successfully!`
        );
      } else {
        Alert.alert('Error', `Failed to send notification: ${result.error}`);
      }
    } catch (error) {
      Alert.alert('Error', `Error sending notification: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!userId) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Please log in to test notifications</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Test Push Notifications</Text>
      <Text style={styles.subtitle}>Send test notifications to your device</Text>
      
      <TouchableOpacity
        style={[styles.button, styles.approvedButton]}
        onPress={() => sendTestNotification('approved')}
        disabled={isLoading}
      >
        <Ionicons name="checkmark-circle" size={20} color="white" />
        <Text style={styles.buttonText}>
          {isLoading ? 'Sending...' : 'Send Approved Notification'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.rejectedButton]}
        onPress={() => sendTestNotification('rejected')}
        disabled={isLoading}
      >
        <Ionicons name="close-circle" size={20} color="white" />
        <Text style={styles.buttonText}>
          {isLoading ? 'Sending...' : 'Send Rejected Notification'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.note}>
        Note: Make sure you have granted notification permissions and are using a physical device.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  approvedButton: {
    backgroundColor: '#4CAF50',
  },
  rejectedButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  text: {
    color: 'white',
    textAlign: 'center',
  },
  note: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});

export default NotificationTest;
