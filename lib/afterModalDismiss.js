import { Platform } from "react-native";

/**
 * Long enough for iOS to finish the RN Modal "fade" dismissal (~300ms
 * cross-dissolve) plus the frame or two before React's unmount reaches
 * native.
 */
export const IOS_MODAL_DISMISS_MS = 450;

/**
 * Run a button callback once the RN Modal it was pressed in has finished
 * dismissing — the same order UIAlertController uses for its handlers.
 *
 * Our alert modals (RhoodModal) unmount the instant they close, which on iOS
 * starts dismissing the modal's view controller. If the callback presents
 * native UI in that same tick (the photo picker, camera, share sheet), iOS
 * presents it on the modal that is being torn down, and the dismissal takes
 * it down too: nothing appears and the picker's promise never settles.
 * Android launches pickers as separate activities, so it runs immediately.
 */
export function runAfterModalDismiss(fn) {
  if (typeof fn !== "function") return;
  if (Platform.OS !== "ios") {
    fn();
    return;
  }
  setTimeout(fn, IOS_MODAL_DISMISS_MS);
}
