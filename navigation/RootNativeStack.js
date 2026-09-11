import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import ScreenRouter from "./ScreenRouter";
import { OVERLAY_SCREEN_IDS, TAB_SCREEN_IDS, SCREENS } from "./routes";
import { getLeafRouteName, navigationRef } from "./navigationRef";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs({ routerProps, initialTab }) {
  return (
    <Tab.Navigator
      initialRouteName={initialTab || SCREENS.OPPORTUNITIES}
      tabBar={() => null}
      screenOptions={{
        headerShown: false,
        lazy: true,
      }}
    >
      {TAB_SCREEN_IDS.map((name) => (
        <Tab.Screen key={name} name={name}>
          {() => <ScreenRouter screen={name} {...routerProps} />}
        </Tab.Screen>
      ))}
    </Tab.Navigator>
  );
}

/**
 * Native tabs for the four roots; overlays (profile, settings, DMs, legal)
 * are real stack screens so iOS/Android own back/swipe.
 */
export default function RootNativeStack({
  screen,
  tabScreen,
  routerProps,
  onNativeRouteChange,
}) {
  const initialTab = TAB_SCREEN_IDS.includes(tabScreen)
    ? tabScreen
    : SCREENS.OPPORTUNITIES;

  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={(state) => {
        const leaf = getLeafRouteName(state);
        if (!leaf || leaf === "Main") return;
        onNativeRouteChange?.(leaf);
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          contentStyle: { backgroundColor: "#000000" },
        }}
      >
        <Stack.Screen name="Main" options={{ gestureEnabled: false }}>
          {() => (
            <MainTabs routerProps={routerProps} initialTab={initialTab} />
          )}
        </Stack.Screen>
        {OVERLAY_SCREEN_IDS.map((name) => (
          <Stack.Screen key={name} name={name}>
            {() => <ScreenRouter screen={name} {...routerProps} />}
          </Stack.Screen>
        ))}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
