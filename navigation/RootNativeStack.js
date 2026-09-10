import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ScreenRouter from "./ScreenRouter";
import { OVERLAY_SCREEN_IDS } from "./routes";
import { navigationRef } from "./navigationRef";

const Stack = createNativeStackNavigator();

/**
 * Native iOS/Android stack for pushed screens (profile, settings, DMs, legal).
 * Tab roots stay on "Main" so the OS owns back/swipe instead of a JS string swap.
 */
export default function RootNativeStack({
  screen,
  tabScreen,
  routerProps,
  onNativeRouteChange,
}) {
  return (
    <NavigationContainer
      ref={navigationRef}
      onStateChange={(state) => {
        const route = state?.routes?.[state.index];
        if (!route) return;
        const next =
          route.name === "Main" ? tabScreen || screen : route.name;
        onNativeRouteChange?.(next);
      }}
    >
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      >
        <Stack.Screen name="Main" options={{ gestureEnabled: false }}>
          {() => <ScreenRouter screen={tabScreen || screen} {...routerProps} />}
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
