import { createNavigationContainerRef, CommonActions } from "@react-navigation/native";
import { TAB_SCREEN_IDS } from "./routes";

export const navigationRef = createNavigationContainerRef();

export function navigateApp(screen, params) {
  if (!navigationRef.isReady()) return;
  if (TAB_SCREEN_IDS.includes(screen)) {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Main" }],
      })
    );
    return;
  }
  navigationRef.navigate(screen, params);
}

export function goBackApp() {
  if (!navigationRef.isReady()) return;
  if (navigationRef.canGoBack()) {
    navigationRef.goBack();
  }
}
