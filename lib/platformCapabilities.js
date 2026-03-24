import Constants from "expo-constants";

/**
 * True when the app runs inside Expo Go. Native modules may be missing or limited;
 * use this to skip loading optional native features (push, some pickers, etc.).
 */
export function isExpoGo() {
  return Constants.appOwnership === "expo";
}
