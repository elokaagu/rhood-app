// Remote logging for TestFlight debugging (optional)
// This sends logs to a remote endpoint so you can view them without Xcode

const REMOTE_LOG_ENABLED = false; // Set to true to enable
const REMOTE_LOG_URL = 'https://your-logging-service.com/log'; // Replace with your endpoint

export const remoteLog = async (tag, message, data = {}) => {
  // Always log to console
  console.log(`[${tag}]`, message, data);
  
  // Optionally send to remote service
  if (REMOTE_LOG_ENABLED) {
    try {
      await fetch(REMOTE_LOG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tag,
          message,
          data,
          timestamp: new Date().toISOString(),
          platform: 'ios',
        }),
      });
    } catch (error) {
      // Silently fail - don't break the app if logging fails
      console.warn('Remote logging failed:', error);
    }
  }
};

// Example usage:
// import { remoteLog } from './lib/remoteLogger';
// remoteLog('APPLE', 'token.nonce === hashed?', { match: true });

