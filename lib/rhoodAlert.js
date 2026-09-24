/**
 * Drop-in branded alerts. Call from screens, hooks, or libs.
 * RhoodAlertHost (mounted in App) renders RhoodModal — never native Alert.
 */

let listener = null;
let seq = 0;

export function subscribeRhoodAlert(fn) {
  listener = fn;
  return () => {
    if (listener === fn) listener = null;
  };
}

function emit(payload) {
  if (typeof listener === "function") {
    listener({ id: ++seq, ...payload });
    return;
  }
  if (__DEV__) {
    console.warn("[rhoodAlert] host not mounted", payload?.title);
  }
}

export function inferRhoodAlertType(title, buttons) {
  const t = String(title || "").toLowerCase();
  if (Array.isArray(buttons) && buttons.some((b) => b?.style === "destructive")) {
    return "warning";
  }
  if (/error|fail|couldn't|could not|unable|invalid/.test(t)) return "error";
  if (/success|copied|sent|saved|updated|done/.test(t)) return "success";
  if (/delete|remove|sign out|block|warning|required/.test(t)) return "warning";
  return "info";
}

/**
 * Alert.alert-compatible: rhoodAlert(title, message?, buttons?)
 */
export function rhoodAlert(title, message, buttons) {
  const list = Array.isArray(buttons) && buttons.length
    ? buttons
    : [{ text: "OK" }];
  emit({
    kind: "alert",
    type: inferRhoodAlertType(title, list),
    title: title || "",
    message: message || "",
    buttons: list,
  });
}

rhoodAlert.alert = rhoodAlert;

/** ActionSheetIOS.showActionSheetWithOptions-compatible */
export function rhoodActionSheet(config, callback) {
  const options = config?.options || [];
  emit({
    kind: "sheet",
    type: "info",
    title: config?.title || "",
    message: config?.message || "",
    options,
    cancelButtonIndex: config?.cancelButtonIndex,
    destructiveButtonIndex: config?.destructiveButtonIndex,
    onPress: typeof callback === "function" ? callback : config?.onPress,
  });
}

/** Alert.prompt-compatible (iOS). buttons: [{ text, style, onPress(value) }] */
export function rhoodPrompt(title, message, callbackOrButtons) {
  let buttons;
  if (typeof callbackOrButtons === "function") {
    buttons = [
      { text: "Cancel", style: "cancel" },
      { text: "OK", onPress: callbackOrButtons },
    ];
  } else if (Array.isArray(callbackOrButtons) && callbackOrButtons.length) {
    buttons = callbackOrButtons;
  } else {
    buttons = [
      { text: "Cancel", style: "cancel" },
      { text: "OK" },
    ];
  }
  emit({
    kind: "prompt",
    type: inferRhoodAlertType(title, buttons),
    title: title || "",
    message: message || "",
    buttons,
  });
}
