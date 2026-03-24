import { Mixpanel } from "mixpanel-react-native";
import Constants from "expo-constants";
import { debugAnalytics, warnAnalytics } from "./analytics.shared";

let mixpanel = null;
let mixpanelStatus = "idle"; // idle | initializing | ready | failed

function getMixpanelToken() {
  return (
    process.env.EXPO_PUBLIC_MIXPANEL_TOKEN ||
    Constants?.expoConfig?.extra?.mixpanelToken ||
    null
  );
}

const MIXPANEL_TOKEN = getMixpanelToken();

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
    if (typeof mixpanel?.setServerURL === "function") {
      mixpanel.setServerURL("https://api-eu.mixpanel.com");
    }
    if (typeof mixpanel?.track !== "function") {
      throw new Error("Mixpanel track method unavailable");
    }
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
