import { remoteLog, LogLevel } from "./remoteLogger";
import { track, AnalyticsEvents } from "./analytics";

function captureSentryException(error, extra) {
  try {
    const Sentry = require("@sentry/react-native");
    if (Sentry?.captureException) {
      Sentry.captureException(error, extra ? { extra } : undefined);
    }
  } catch (_error) {
    /* native module unavailable in Expo Go / tests */
  }
}

/**
 * Report a caught render/runtime crash without PII.
 * Sentry (when DSN is set) + Mixpanel event + optional remote log.
 */
export function reportCrash(error, errorInfo) {
  const message = error?.message ? String(error.message).slice(0, 280) : "Unknown error";
  const name = error?.name ? String(error.name).slice(0, 80) : "Error";
  const componentStack =
    typeof errorInfo?.componentStack === "string"
      ? errorInfo.componentStack.split("\n").slice(0, 4).join(" | ").slice(0, 400)
      : null;

  captureSentryException(error instanceof Error ? error : new Error(message), {
    name,
    componentStack,
  });

  remoteLog(LogLevel.ERROR, "ErrorBoundary", message, {
    name,
    componentStack,
  });

  track(AnalyticsEvents.APP_CRASH, {
    name,
    message,
  }).catch(() => {});
}

export function initCrashReporter() {
  try {
    const Constants = require("expo-constants").default;
    const Sentry = require("@sentry/react-native");
    const dsn =
      process.env.EXPO_PUBLIC_SENTRY_DSN ||
      Constants?.expoConfig?.extra?.sentryDsn ||
      "";
    if (!dsn || !Sentry?.init) return false;
    Sentry.init({
      dsn,
      sendDefaultPii: false,
      tracesSampleRate: 0.05,
      enabled: !__DEV__,
    });
    return true;
  } catch (_error) {
    return false;
  }
}
