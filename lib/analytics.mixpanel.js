import { Mixpanel } from "mixpanel-react-native";
import Constants from "expo-constants";
import { debugAnalytics, warnAnalytics } from "./analytics.shared";

let mixpanel = null;
let mixpanelStatus = "idle"; // idle | initializing | ready | failed
let sessionReplaySdk = null;
let sessionReplayStatus = "idle"; // idle | initializing | ready | failed | disabled

function getMixpanelToken() {
  return (
    process.env.EXPO_PUBLIC_MIXPANEL_TOKEN ||
    Constants?.expoConfig?.extra?.mixpanelToken ||
    null
  );
}

const MIXPANEL_TOKEN = getMixpanelToken();
const SESSION_REPLAY_DEFAULTS = {
  enabled: false,
  wifiOnly: false,
  recordingSessionsPercent: 25,
  flushInterval: 10,
  enableLogging: false,
  autoStartRecording: true,
};

function parseBoolean(value, fallback) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
}

function parseNumber(value, fallback, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function getSessionReplaySettings() {
  const extra = Constants?.expoConfig?.extra || Constants?.manifest?.extra || {};
  return {
    enabled: parseBoolean(
      process.env.EXPO_PUBLIC_MIXPANEL_SESSION_REPLAY_ENABLED,
      parseBoolean(
        extra.mixpanelSessionReplayEnabled,
        SESSION_REPLAY_DEFAULTS.enabled
      )
    ),
    wifiOnly: parseBoolean(
      extra.mixpanelSessionReplayWifiOnly,
      SESSION_REPLAY_DEFAULTS.wifiOnly
    ),
    recordingSessionsPercent: parseNumber(
      extra.mixpanelSessionReplayRecordingPercent,
      SESSION_REPLAY_DEFAULTS.recordingSessionsPercent,
      0,
      100
    ),
    flushInterval: parseNumber(
      extra.mixpanelSessionReplayFlushIntervalSec,
      SESSION_REPLAY_DEFAULTS.flushInterval,
      2,
      60
    ),
    enableLogging: parseBoolean(
      extra.mixpanelSessionReplayEnableLogging,
      SESSION_REPLAY_DEFAULTS.enableLogging
    ),
    autoStartRecording: parseBoolean(
      extra.mixpanelSessionReplayAutoStart,
      SESSION_REPLAY_DEFAULTS.autoStartRecording
    ),
  };
}

async function initMixpanelSessionReplay(distinctId = "anonymous") {
  const settings = getSessionReplaySettings();
  if (!settings.enabled) {
    sessionReplayStatus = "disabled";
    return false;
  }
  if (!MIXPANEL_TOKEN) {
    sessionReplayStatus = "failed";
    return false;
  }
  if (sessionReplayStatus === "ready") return true;
  if (sessionReplayStatus === "initializing") return false;

  sessionReplayStatus = "initializing";
  try {
    const replayModule = require("@mixpanel/react-native-session-replay");
    const {
      MPSessionReplay,
      MPSessionReplayConfig,
      MPSessionReplayMask,
    } = replayModule || {};

    if (!MPSessionReplay || !MPSessionReplayConfig || !MPSessionReplayMask) {
      throw new Error("Session Replay exports unavailable");
    }

    const config = new MPSessionReplayConfig({
      wifiOnly: settings.wifiOnly,
      recordingSessionsPercent: settings.recordingSessionsPercent,
      autoStartRecording: settings.autoStartRecording,
      autoMaskedViews: [
        MPSessionReplayMask.Text,
        MPSessionReplayMask.Image,
        MPSessionReplayMask.Web,
        MPSessionReplayMask.Map,
      ],
      flushInterval: settings.flushInterval,
      enableLogging: __DEV__ && settings.enableLogging,
    });

    await MPSessionReplay.initialize(MIXPANEL_TOKEN, String(distinctId), config);
    sessionReplaySdk = MPSessionReplay;
    sessionReplayStatus = "ready";
    debugAnalytics("Mixpanel Session Replay initialized.");
    return true;
  } catch (error) {
    sessionReplaySdk = null;
    sessionReplayStatus = "failed";
    warnAnalytics(
      "Mixpanel Session Replay initialization failed:",
      error?.message || error
    );
    return false;
  }
}

export function isMixpanelReady() {
  return mixpanelStatus === "ready" && !!mixpanel;
}

export function getMixpanelStatus() {
  return mixpanelStatus;
}

export async function initMixpanel() {
  if (!MIXPANEL_TOKEN) {
    mixpanelStatus = "failed";
    warnAnalytics("Mixpanel token missing; Mixpanel disabled.");
    return false;
  }
  if (isMixpanelReady()) return true;
  if (mixpanelStatus === "initializing") return false;

  mixpanelStatus = "initializing";
  try {
    mixpanel = new Mixpanel(MIXPANEL_TOKEN, true);
    if (typeof mixpanel?.init === "function") {
      await mixpanel.init();
    }
    if (typeof mixpanel?.setServerURL === "function") {
      mixpanel.setServerURL("https://api-eu.mixpanel.com");
    }
    if (typeof mixpanel?.track !== "function") {
      throw new Error("Mixpanel track method unavailable");
    }
    let distinctId = "anonymous";
    if (typeof mixpanel?.getDistinctId === "function") {
      try {
        const did = await mixpanel.getDistinctId();
        if (did) distinctId = String(did);
      } catch (_error) {
        // Non-fatal fallback to anonymous distinct id.
      }
    }
    await initMixpanelSessionReplay(distinctId);
    mixpanelStatus = "ready";
    debugAnalytics("Mixpanel initialized.");
    return true;
  } catch (error) {
    mixpanel = null;
    mixpanelStatus = "failed";
    warnAnalytics("Mixpanel initialization failed:", error?.message || error);
    return false;
  }
}

export function identifyMixpanelUser(userId, traits = {}) {
  if (!isMixpanelReady()) return;
  try {
    mixpanel.identify(userId);
    if (
      sessionReplayStatus === "ready" &&
      sessionReplaySdk &&
      typeof sessionReplaySdk.identify === "function"
    ) {
      Promise.resolve(sessionReplaySdk.identify(String(userId))).catch((error) =>
        warnAnalytics(
          "Mixpanel Session Replay identify failed:",
          error?.message || error
        )
      );
    }
    mixpanel.getPeople().set({
      $email: traits.email,
      ...traits,
    });
  } catch (error) {
    warnAnalytics("Mixpanel identify failed:", error?.message || error);
  }
}

export function resetMixpanelUser() {
  if (!isMixpanelReady()) return;
  try {
    mixpanel.reset();
    if (
      sessionReplayStatus === "ready" &&
      sessionReplaySdk &&
      typeof sessionReplaySdk.stopRecording === "function"
    ) {
      Promise.resolve(sessionReplaySdk.stopRecording()).catch((_error) => {});
    }
  } catch (error) {
    warnAnalytics("Mixpanel reset failed:", error?.message || error);
  }
}

export function trackMixpanel(eventName, properties = {}) {
  if (!isMixpanelReady()) return;
  try {
    mixpanel.track(eventName, properties);
  } catch (error) {
    warnAnalytics("Mixpanel track failed:", error?.message || error);
  }
}
