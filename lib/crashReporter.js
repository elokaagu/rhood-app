import { remoteLog, LogLevel } from "./remoteLogger";
import { track, AnalyticsEvents } from "./analytics";

/**
 * Report a caught render/runtime crash without PII.
 * Mixpanel event + optional remote log (when extra.remoteLogUrl is set).
 */
export function reportCrash(error, errorInfo) {
  const message = error?.message ? String(error.message).slice(0, 280) : "Unknown error";
  const name = error?.name ? String(error.name).slice(0, 80) : "Error";
  const componentStack =
    typeof errorInfo?.componentStack === "string"
      ? errorInfo.componentStack.split("\n").slice(0, 4).join(" | ").slice(0, 400)
      : null;

  remoteLog(LogLevel.ERROR, "ErrorBoundary", message, {
    name,
    componentStack,
  });

  track(AnalyticsEvents.APP_CRASH, {
    name,
    message,
  }).catch(() => {});
}
