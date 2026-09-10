import { createNavigationContainerRef, CommonActions } from "@react-navigation/native";
import { TAB_SCREEN_IDS } from "./routes";

export const navigationRef = createNavigationContainerRef();

export function getLeafRouteName(state) {
  if (!state?.routes?.length) return null;
  const route = state.routes[state.index ?? 0];
  if (route.state) return getLeafRouteName(route.state);
  return route.name || null;
}

export function navigateApp(screen, params) {
  if (!navigationRef.isReady()) return;
  if (TAB_SCREEN_IDS.includes(screen)) {
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: "Main",
            state: {
              index: 0,
              routes: [{ name: screen }],
            },
          },
        ],
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
